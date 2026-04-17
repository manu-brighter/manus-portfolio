// src/components/scene/FluidOrchestrator.ts

import type { TierConfig } from "@/lib/gpu";
import noiseSrc from "@/shaders/common/noise.glsl";
import posterizeSrc from "@/shaders/common/posterize.glsl";
import quadVert from "@/shaders/common/quad.vert.glsl";
import sobelSrc from "@/shaders/common/sobel.glsl";
import advectFrag from "@/shaders/fluid/advect.frag.glsl";
import curlFrag from "@/shaders/fluid/curl.frag.glsl";
import divergenceFrag from "@/shaders/fluid/divergence.frag.glsl";
import gradientSubFrag from "@/shaders/fluid/gradient-subtract.frag.glsl";
import pressureFrag from "@/shaders/fluid/pressure.frag.glsl";
import renderToonFrag from "@/shaders/fluid/render-toon.frag.glsl";
import splatFrag from "@/shaders/fluid/splat.frag.glsl";
import vorticityFrag from "@/shaders/fluid/vorticity.frag.glsl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PointerState = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  down: boolean;
  moved: boolean;
};

type FBO = {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
};

type DoubleFBO = {
  read: FBO;
  write: FBO;
  swap: () => void;
};

type Programs = {
  splat: WebGLProgram;
  curl: WebGLProgram;
  vorticity: WebGLProgram;
  advect: WebGLProgram;
  divergence: WebGLProgram;
  pressure: WebGLProgram;
  gradientSub: WebGLProgram;
  renderToon: WebGLProgram;
};

// ---------------------------------------------------------------------------
// Color constants (normalised RGB)
// ---------------------------------------------------------------------------

const SPOT_COLORS = {
  rose: [1.0, 0.42, 0.627],
  amber: [1.0, 0.769, 0.455],
  mint: [0.486, 0.91, 0.769],
  violet: [0.722, 0.604, 1.0],
} as const;

const PAPER_COLOR = [0.941, 0.91, 0.863] as const; // #f0e8dc
const INK_COLOR = [0.039, 0.024, 0.031] as const; // #0a0608

// ---------------------------------------------------------------------------
// GL utility functions
// ---------------------------------------------------------------------------

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

function injectIncludes(source: string, includes: Record<string, string>): string {
  let result = source;
  for (const [name, code] of Object.entries(includes)) {
    result = result.replace(`// #include <${name}>`, code);
  }
  return result;
}

function createFBO(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  internalFormat: number,
  format: number,
  type: number,
): FBO {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error("Failed to create framebuffer");
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { framebuffer, texture, width, height };
}

function createDoubleFBO(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  internalFormat: number,
  format: number,
  type: number,
): DoubleFBO {
  let read = createFBO(gl, width, height, internalFormat, format, type);
  let write = createFBO(gl, width, height, internalFormat, format, type);
  return {
    get read() {
      return read;
    },
    get write() {
      return write;
    },
    swap() {
      [read, write] = [write, read];
    },
  };
}

function destroyFBO(gl: WebGL2RenderingContext, fbo: FBO): void {
  gl.deleteFramebuffer(fbo.framebuffer);
  gl.deleteTexture(fbo.texture);
}

function destroyDoubleFBO(gl: WebGL2RenderingContext, dfbo: DoubleFBO): void {
  destroyFBO(gl, dfbo.read);
  destroyFBO(gl, dfbo.write);
}

// ---------------------------------------------------------------------------
// FluidOrchestrator
// ---------------------------------------------------------------------------

export class FluidOrchestrator {
  private gl!: WebGL2RenderingContext;
  private config!: TierConfig;
  private programs!: Programs;

  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private pressure!: DoubleFBO;
  private divergenceFBO!: FBO;
  private curlFBO!: FBO;
  private outputFBO!: FBO;

  private simWidth = 0;
  private simHeight = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  private frameCount = 0;
  private paused = false;
  private lastPointerTime = 0;
  private ambientStrength = 0;
  private splatColorIndex = 0;

  // Uniform cache: WebGLProgram -> (uniform name -> location)
  // Using a nested Map because WebGLProgram.toString() is not unique.
  private uniformCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(gl: WebGL2RenderingContext, config: TierConfig): void {
    this.gl = gl;
    this.config = config;
    this.lastPointerTime = performance.now();

    // Check float texture support
    const halfFloat = gl.getExtension("EXT_color_buffer_half_float");
    const floatLinear = gl.getExtension("OES_texture_half_float_linear");
    if (!halfFloat || !floatLinear) {
      throw new Error("Required WebGL2 extensions not available");
    }

    // Compile all programs
    const toonFrag = injectIncludes(renderToonFrag, {
      noise: noiseSrc,
      posterize: posterizeSrc,
      sobel: sobelSrc,
    });

    this.programs = {
      splat: createProgram(gl, quadVert, splatFrag),
      curl: createProgram(gl, quadVert, curlFrag),
      vorticity: createProgram(gl, quadVert, vorticityFrag),
      advect: createProgram(gl, quadVert, advectFrag),
      divergence: createProgram(gl, quadVert, divergenceFrag),
      pressure: createProgram(gl, quadVert, pressureFrag),
      gradientSub: createProgram(gl, quadVert, gradientSubFrag),
      renderToon: createProgram(gl, quadVert, toonFrag),
    };

    // Create FBOs at initial size
    this.canvasWidth = gl.drawingBufferWidth;
    this.canvasHeight = gl.drawingBufferHeight;
    this.createSimFBOs();
    this.createOutputFBO();
  }

  resize(width: number, height: number): void {
    if (width === this.canvasWidth && height === this.canvasHeight) return;

    this.canvasWidth = width;
    this.canvasHeight = height;

    // Destroy and recreate sim FBOs (aspect ratio may have changed)
    this.destroyFBOs();
    this.createSimFBOs();
    this.createOutputFBO();
  }

  dispose(): void {
    const gl = this.gl;
    this.destroyFBOs();
    for (const program of Object.values(this.programs)) {
      gl.deleteProgram(program);
    }
    this.uniformCache.clear();
  }

  getOutputTexture(): WebGLTexture {
    return this.outputFBO.texture;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  // ---------------------------------------------------------------------------
  // FBO management
  // ---------------------------------------------------------------------------

  private createSimFBOs(): void {
    const gl = this.gl;
    const aspectRatio = this.canvasWidth / this.canvasHeight;
    this.simWidth = this.config.gridSize;
    this.simHeight = Math.round(this.config.gridSize / aspectRatio);

    const w = this.simWidth;
    const h = this.simHeight;

    this.velocity = createDoubleFBO(gl, w, h, gl.RG16F, gl.RG, gl.HALF_FLOAT);
    this.dye = createDoubleFBO(gl, w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    this.pressure = createDoubleFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    this.divergenceFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    this.curlFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
  }

  private createOutputFBO(): void {
    this.outputFBO = createFBO(
      this.gl,
      this.canvasWidth,
      this.canvasHeight,
      this.gl.RGBA8,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
    );
  }

  private destroyFBOs(): void {
    const gl = this.gl;
    if (this.velocity) destroyDoubleFBO(gl, this.velocity);
    if (this.dye) destroyDoubleFBO(gl, this.dye);
    if (this.pressure) destroyDoubleFBO(gl, this.pressure);
    if (this.divergenceFBO) destroyFBO(gl, this.divergenceFBO);
    if (this.curlFBO) destroyFBO(gl, this.curlFBO);
    if (this.outputFBO) destroyFBO(gl, this.outputFBO);
  }

  // ---------------------------------------------------------------------------
  // Draw helpers & uniform cache
  // ---------------------------------------------------------------------------

  private getUniform(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    let programMap = this.uniformCache.get(program);
    if (!programMap) {
      programMap = new Map<string, WebGLUniformLocation | null>();
      this.uniformCache.set(program, programMap);
    }
    if (!programMap.has(name)) {
      programMap.set(name, this.gl.getUniformLocation(program, name));
    }
    return programMap.get(name) ?? null;
  }

  private bindProgram(program: WebGLProgram): void {
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
    this.gl.useProgram(program);
  }

  private setFloat(program: WebGLProgram, name: string, value: number): void {
    this.gl.uniform1f(this.getUniform(program, name), value);
  }

  private setVec2(program: WebGLProgram, name: string, x: number, y: number): void {
    this.gl.uniform2f(this.getUniform(program, name), x, y);
  }

  private setVec3(program: WebGLProgram, name: string, r: number, g: number, b: number): void {
    this.gl.uniform3f(this.getUniform(program, name), r, g, b);
  }

  private bindTexture(
    program: WebGLProgram,
    name: string,
    texture: WebGLTexture,
    unit: number,
  ): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.getUniform(program, name), unit);
  }

  private drawQuad(): void {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  private renderToFBO(fbo: FBO): void {
    const gl = this.gl;
    gl.viewport(0, 0, fbo.width, fbo.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
  }

  // renderToScreen() intentionally omitted — not needed in this implementation.
  // The toon pass renders to outputFBO; R3F reads that texture via a fullscreen quad.

  // ---------------------------------------------------------------------------
  // Individual simulation passes
  // ---------------------------------------------------------------------------

  private runSplat(
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: readonly [number, number, number],
  ): void {
    const p = this.programs.splat;
    this.bindProgram(p);

    // Velocity splat
    this.bindTexture(p, "uTarget", this.velocity.read.texture, 0);
    this.setFloat(p, "uAspectRatio", this.canvasWidth / this.canvasHeight);
    this.setVec2(p, "uPoint", x, y);
    this.setFloat(p, "uRadius", this.config.splatRadius);
    this.setVec3(p, "uColor", dx * 10.0, dy * 10.0, 0.0);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();

    // Dye splat
    this.bindTexture(p, "uTarget", this.dye.read.texture, 0);
    this.setVec3(p, "uColor", color[0], color[1], color[2]);
    this.renderToFBO(this.dye.write);
    this.drawQuad();
    this.dye.swap();
  }

  private runCurl(): void {
    const p = this.programs.curl;
    this.bindProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.curlFBO);
    this.drawQuad();
  }

  private runVorticity(dt: number): void {
    const p = this.programs.vorticity;
    this.bindProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.bindTexture(p, "uCurl", this.curlFBO.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.setFloat(p, "uConfinement", this.config.confinement);
    this.setFloat(p, "uDt", dt);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();
  }

  private runAdvect(target: DoubleFBO, dissipation: number, dt: number): void {
    const p = this.programs.advect;
    this.bindProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.bindTexture(p, "uSource", target.read.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.setFloat(p, "uDt", dt);
    this.setFloat(p, "uDissipation", dissipation);
    this.renderToFBO(target.write);
    this.drawQuad();
    target.swap();
  }

  private runDivergence(): void {
    const p = this.programs.divergence;
    this.bindProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.divergenceFBO);
    this.drawQuad();
  }

  private runPressure(): void {
    const p = this.programs.pressure;
    this.bindProgram(p);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.bindTexture(p, "uDivergence", this.divergenceFBO.texture, 1);

    for (let i = 0; i < this.config.pressureIterations; i++) {
      this.bindTexture(p, "uPressure", this.pressure.read.texture, 0);
      this.renderToFBO(this.pressure.write);
      this.drawQuad();
      this.pressure.swap();
    }
  }

  private runGradientSubtract(): void {
    const p = this.programs.gradientSub;
    this.bindProgram(p);
    this.bindTexture(p, "uPressure", this.pressure.read.texture, 0);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();
  }

  private runRenderToon(elapsed: number): void {
    const p = this.programs.renderToon;
    this.bindProgram(p);
    this.bindTexture(p, "uDye", this.dye.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.canvasWidth, 1.0 / this.canvasHeight);
    this.setFloat(p, "uLevels", 4.0);
    this.setFloat(p, "uOutlineThreshold", 0.15);
    this.setFloat(p, "uGrainStrength", 0.04);
    this.setFloat(p, "uTime", elapsed * 0.001);

    this.setVec3(p, "uPaperColor", PAPER_COLOR[0], PAPER_COLOR[1], PAPER_COLOR[2]);
    this.setVec3(p, "uInkColor", INK_COLOR[0], INK_COLOR[1], INK_COLOR[2]);
    this.setVec3(p, "uSpotRose", SPOT_COLORS.rose[0], SPOT_COLORS.rose[1], SPOT_COLORS.rose[2]);
    this.setVec3(p, "uSpotAmber", SPOT_COLORS.amber[0], SPOT_COLORS.amber[1], SPOT_COLORS.amber[2]);
    this.setVec3(p, "uSpotMint", SPOT_COLORS.mint[0], SPOT_COLORS.mint[1], SPOT_COLORS.mint[2]);
    this.setVec3(
      p,
      "uSpotViolet",
      SPOT_COLORS.violet[0],
      SPOT_COLORS.violet[1],
      SPOT_COLORS.violet[2],
    );

    this.renderToFBO(this.outputFBO);
    this.drawQuad();
  }

  // ---------------------------------------------------------------------------
  // Main step — called every RAF tick
  // ---------------------------------------------------------------------------

  private nextSplatColor(): readonly [number, number, number] {
    const colors: readonly (readonly [number, number, number])[] = [
      SPOT_COLORS.rose,
      SPOT_COLORS.amber,
      SPOT_COLORS.mint,
      SPOT_COLORS.violet,
    ];
    const index = this.splatColorIndex % colors.length;
    this.splatColorIndex++;
    // Safe: index is always 0..3 because colors has exactly 4 entries
    return colors[index] as readonly [number, number, number];
  }

  step(dt: number, elapsed: number, pointer: PointerState): void {
    if (this.paused) return;

    const gl = this.gl;
    this.frameCount++;

    // Update ambient timer
    if (pointer.moved) {
      this.lastPointerTime = performance.now();
      this.ambientStrength = Math.max(0, this.ambientStrength - dt / 0.5);
    } else if (performance.now() - this.lastPointerTime > 10000) {
      this.ambientStrength = Math.min(1, this.ambientStrength + dt / 2.0);
    }

    // Disable blending for all sim passes
    gl.disable(gl.BLEND);

    // Sim-step: skipped on odd frames at half-rate
    const runSim = !this.config.halfRate || this.frameCount % 2 === 0;

    if (runSim) {
      // Splat from pointer
      if (pointer.moved || pointer.down) {
        this.runSplat(pointer.x, pointer.y, pointer.dx, pointer.dy, this.nextSplatColor());
      }

      // Ambient curl noise when idle
      if (this.ambientStrength > 0.01) {
        const t = elapsed * 0.0003;
        const ax = 0.5 + 0.3 * Math.sin(t * 1.7);
        const ay = 0.5 + 0.3 * Math.cos(t * 2.3);
        const adx = Math.cos(t) * this.ambientStrength * 0.3;
        const ady = Math.sin(t * 1.3) * this.ambientStrength * 0.3;
        this.runSplat(ax, ay, adx, ady, this.nextSplatColor());
      }

      // Clear pressure field before solve
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.read.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.write.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.runCurl();
      this.runVorticity(dt);
      this.runAdvect(this.velocity, this.config.velocityDissipation, dt);
      this.runDivergence();
      this.runPressure();
      this.runGradientSubtract();
      this.runAdvect(this.dye, this.config.dyeDissipation, dt);
    }

    // Render-toon always runs (even at half-rate)
    this.runRenderToon(elapsed);

    // Unbind framebuffer so R3F can render to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
