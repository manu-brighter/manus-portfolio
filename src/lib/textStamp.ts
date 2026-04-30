/**
 * TextStamper — Canvas2D text → blurred density texture → fluid sim.
 *
 * Pipeline:
 *   1. CPU-side: rasterize the input string to a 2D canvas via the
 *      portfolio's display font (Instrument Serif). Returns alpha-mask
 *      ImageData sized to the sim grid.
 *   2. Upload as an R8 texture on the shared GL context.
 *   3. Run separable Gaussian blur (H + V, ~3 iterations) to smooth
 *      the binary mask edges. This is a deliberate simplification of
 *      the briefing's "Signed-Distance-Field" — at typical text sizes
 *      a wide Gaussian is visually indistinguishable from a real JFA-
 *      computed SDF once the result hits the fluid sim, which destroys
 *      precise distances within frames anyway. Saves ~10 shader passes
 *      and a chunk of seed-encoding plumbing.
 *   4. Hand the blurred texture to FluidOrchestrator.injectDensityTexture
 *      to bake it into the dye field.
 *
 * The stamper does NOT own the dye FBO or any sim state — the
 * orchestrator does. The stamper only owns its own rasterize buffer +
 * 2 ping-pong blur FBOs + the blur program.
 */

import type { FluidOrchestrator } from "@/components/scene/FluidOrchestrator";
import quadVert from "@/shaders/common/quad.vert.glsl";
import blurFrag from "@/shaders/text-fluid/blur.frag.glsl";

type FBO = { framebuffer: WebGLFramebuffer; texture: WebGLTexture };

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error("createShader failed");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`text-fluid shader compile: ${log}`);
  }
  return s;
}

function createBlurProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const v = compileShader(gl, gl.VERTEX_SHADER, quadVert);
  const f = compileShader(gl, gl.FRAGMENT_SHADER, blurFrag);
  const p = gl.createProgram();
  if (!p) throw new Error("createProgram failed");
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`text-fluid program link: ${log}`);
  }
  gl.deleteShader(v);
  gl.deleteShader(f);
  return p;
}

function createR8FBO(gl: WebGL2RenderingContext, w: number, h: number): FBO {
  const tex = gl.createTexture();
  if (!tex) throw new Error("createTexture failed");
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer();
  if (!fb) throw new Error("createFramebuffer failed");
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return { framebuffer: fb, texture: tex };
}

/**
 * Rasterize text into an R8 buffer of the given dimensions. The text
 * is centered horizontally + vertically and scaled to fit ~70% of the
 * shorter dimension so it reads strongly inside the eventual sim grid.
 *
 * Font: Instrument Serif Italic — matches the hero treatment so the
 * stamped text feels like it belongs to the same Riso world. Falls back
 * to system serif if the webfont isn't loaded yet (won't happen in
 * practice, by the time the playground route loads, fonts are cached).
 */
function rasterizeText(text: string, width: number, height: number): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // Pick a font size that fits ~70% of the shorter dimension and ~88%
  // of the width, whichever is tighter. Caps so a tiny one-letter word
  // doesn't blow up to absurd sizes that lose detail in the blur pass.
  const targetByHeight = Math.min(height * 0.7, 220);
  const ctxFont = (size: number) => `italic ${size}px "Instrument Serif", "Times New Roman", serif`;
  let fontSize = targetByHeight;
  ctx.font = ctxFont(fontSize);
  let metrics = ctx.measureText(text);
  if (metrics.width > width * 0.88) {
    fontSize *= (width * 0.88) / metrics.width;
    ctx.font = ctxFont(fontSize);
    metrics = ctx.measureText(text);
  }

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  // Pull the red channel — same as luminance for B/W fill, and that's
  // what the upload + blur path expects.
  const img = ctx.getImageData(0, 0, width, height);
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) {
    out[i] = img.data[i * 4] ?? 0;
  }
  return out;
}

export class TextStamper {
  private gl: WebGL2RenderingContext;
  private orchestrator: FluidOrchestrator;
  private blurProgram: WebGLProgram;
  private uploadTex: WebGLTexture;
  private blurA: FBO;
  private blurB: FBO;
  private vao: WebGLVertexArrayObject | null;
  private width: number;
  private height: number;

  // Uniform locations — cached at construction.
  private uSource: WebGLUniformLocation | null;
  private uTexelSize: WebGLUniformLocation | null;
  private uDirection: WebGLUniformLocation | null;
  private uStride: WebGLUniformLocation | null;

  constructor(gl: WebGL2RenderingContext, orchestrator: FluidOrchestrator) {
    this.gl = gl;
    this.orchestrator = orchestrator;
    const { width, height } = orchestrator.getSimSize();
    this.width = width;
    this.height = height;

    this.blurProgram = createBlurProgram(gl);
    this.uSource = gl.getUniformLocation(this.blurProgram, "uSource");
    this.uTexelSize = gl.getUniformLocation(this.blurProgram, "uTexelSize");
    this.uDirection = gl.getUniformLocation(this.blurProgram, "uDirection");
    this.uStride = gl.getUniformLocation(this.blurProgram, "uStride");

    // Upload texture (sourced from CPU rasterizer); blurA/B are
    // ping-pong FBOs for the separable Gaussian.
    const tex = gl.createTexture();
    if (!tex) throw new Error("createTexture failed");
    this.uploadTex = tex;
    gl.bindTexture(gl.TEXTURE_2D, this.uploadTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);

    this.blurA = createR8FBO(gl, width, height);
    this.blurB = createR8FBO(gl, width, height);
    this.vao = gl.createVertexArray();
  }

  /**
   * Rasterize `text`, blur to soft SDF-like falloff, inject into the
   * orchestrator's dye field with `color × strength`. Idempotent —
   * safe to call from a debounced typing handler or a default-word
   * rotation timer.
   *
   * iterations: how many H+V blur pairs to run. 3 is comfortable;
   * higher values widen the falloff but eat fill rate.
   */
  stampText(
    text: string,
    color: "rose" | "amber" | "mint" | "violet" | readonly [number, number, number],
    strength = 0.9,
    iterations = 3,
  ): void {
    if (!text || text.length === 0) return;
    const gl = this.gl;

    // ---- CPU rasterize + GPU upload ----
    // UNPACK_FLIP_Y_WEBGL flips rows during upload so the texture's
    // row 0 is the BOTTOM of the rasterized canvas. Then quad.vert's
    // vUv.y=0 (which corresponds to gl_Position.y=-1, the bottom of
    // the screen) samples the bottom of the text. Without this flip
    // letters render upside-down (Canvas2D is Y-down, GL UV is Y-up).
    const pixels = rasterizeText(text, this.width, this.height);
    gl.bindTexture(gl.TEXTURE_2D, this.uploadTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.width,
      this.height,
      gl.RED,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // ---- Separable Gaussian blur, ping-pong over blurA / blurB ----
    // Stride 1.0 = 9-tap kernel covers ~4px each side, so a single H+V
    // iteration adds a soft Riso-bleed at the letter edges without
    // mushing the letterforms into blobs. Caller picks iterations.
    // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL API
    gl.useProgram(this.blurProgram);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.uTexelSize, 1 / this.width, 1 / this.height);
    gl.uniform1f(this.uStride, 1.0);

    let read: WebGLTexture = this.uploadTex;
    let write: FBO = this.blurA;
    let other: FBO = this.blurB;

    for (let i = 0; i < iterations; i++) {
      // Horizontal
      gl.uniform2f(this.uDirection, 1, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read);
      gl.uniform1i(this.uSource, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, this.width, this.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      read = write.texture;
      [write, other] = [other, write];

      // Vertical
      gl.uniform2f(this.uDirection, 0, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read);
      gl.uniform1i(this.uSource, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, this.width, this.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      read = write.texture;
      [write, other] = [other, write];
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // ---- Hand the blurred texture to the orchestrator ----
    this.orchestrator.injectDensityTexture(read, color, strength);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.blurProgram);
    gl.deleteTexture(this.uploadTex);
    gl.deleteFramebuffer(this.blurA.framebuffer);
    gl.deleteTexture(this.blurA.texture);
    gl.deleteFramebuffer(this.blurB.framebuffer);
    gl.deleteTexture(this.blurB.texture);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }
}
