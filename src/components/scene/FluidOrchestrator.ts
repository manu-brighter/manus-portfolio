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

// Ambient motion: 3 wandering points that splat fluid when no pointer input.
// Extracted for future Leva-dev tuning. Time-scale governs the whole rig;
// per-point freq/range/force multipliers are in AMBIENT_POINTS below.
const AMBIENT_PARAMS = {
  timeScale: 0.0003,
  pointA: {
    center: [0.55, 0.55] as [number, number],
    range: 0.25,
    freqX: 1.3,
    freqY: 0.9,
    forceFreqX: 0.7,
    forceFreqY: 1.1,
    forceStrength: 0.2,
    phaseX: 0,
    phaseY: 0,
    phaseFX: 0,
    phaseFY: 0,
  },
  pointB: {
    center: [0.4, 0.4] as [number, number],
    range: 0.2,
    freqX: 2.1,
    freqY: 1.7,
    forceFreqX: 1.5,
    forceFreqY: 1.9,
    forceStrength: 0.15,
    phaseX: 2.0,
    phaseY: 1.0,
    phaseFX: 3.0,
    phaseFY: 2.0,
  },
  pointC: {
    center: [0.5, 0.5] as [number, number],
    range: 0.15,
    freqX: 0.7,
    freqY: 0.5,
    forceFreqX: 0.4,
    forceFreqY: 0.6,
    forceStrength: 0.25,
    phaseX: 4.0,
    phaseY: 3.0,
    phaseFX: 1.5,
    phaseFY: 2.5,
    gateThreshold: 0.5, // only splat when ambientStrength > this
  },
} as const;

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

  private simWidth = 0;
  private simHeight = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  private emptyVAO: WebGLVertexArrayObject | null = null;

  private frameCount = 0;
  private paused = false;
  private lastPointerTime = 0;
  private ambientStrength = 0;
  private splatColorIndex = 0;
  private ambientActive = false;
  // Studio-mode toggles. Default behaviour matches the hero rig (ambient
  // wandering points on, rotating Riso colours per splat, auto pointer
  // splat from the PointerState). Playground's Ink Drop Studio disables
  // ambient + auto-pointer-splat and drives splats manually via
  // injectSplat() so it can split click-burst from drag-trail behavior.
  private ambientEnabled = true;
  private pointerSplatEnabled = true;
  private splatColorOverride: readonly [number, number, number] | null = null;

  // External splat queue — drained inside step(). Used by Work-cards to
  // inject colored bursts on click. Coordinates are normalised (0..1)
  // matching the pointer convention.
  private pendingSplats: Array<{
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: readonly [number, number, number];
  }> = [];

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

    // WebGL2: half-float filtering is core; rendering to float FBOs needs
    // EXT_color_buffer_float (covers both float and half-float targets).
    const cbFloat = gl.getExtension("EXT_color_buffer_float");
    if (!cbFloat) {
      throw new Error("EXT_color_buffer_float not available");
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

    this.emptyVAO = gl.createVertexArray();

    // Create FBOs at initial size
    this.canvasWidth = gl.drawingBufferWidth;
    this.canvasHeight = gl.drawingBufferHeight;
    this.createSimFBOs();
  }

  resize(width: number, height: number): void {
    if (width === this.canvasWidth && height === this.canvasHeight) return;

    this.canvasWidth = width;
    this.canvasHeight = height;

    // Destroy and recreate sim FBOs (aspect ratio may have changed)
    this.destroyFBOs();
    this.createSimFBOs();
  }

  dispose(): void {
    const gl = this.gl;
    this.destroyFBOs();
    for (const program of Object.values(this.programs)) {
      gl.deleteProgram(program);
    }
    if (this.emptyVAO) {
      gl.deleteVertexArray(this.emptyVAO);
      this.emptyVAO = null;
    }
    this.uniformCache.clear();
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

  /** Kick ambient motion immediately (called when loader finishes). */
  triggerAmbient(): void {
    this.ambientStrength = 1.0;
    this.ambientActive = true;
    // Set idle timer far into the future so ambient stays at full
    // strength for a 5s grace period even if the cursor moves.
    this.lastPointerTime = performance.now() + 5000;
  }

  /**
   * Live-tunable param overrides. Mutates `this.config` so step() picks
   * up the new values on the very next frame without re-init / FBO
   * teardown. Used by Ink Drop Studio's Leva sliders. Pressure-iters
   * changes are also live since the count is read inside the solve loop.
   */
  setParams(partial: Partial<TierConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Toggle the ambient wandering-points splat injection. Hero rig
   * stays at the default (true). Ink Drop Studio sets false for a
   * clean paper canvas the user fills via clicks alone.
   */
  setAmbientEnabled(enabled: boolean): void {
    this.ambientEnabled = enabled;
    if (!enabled) {
      this.ambientStrength = 0;
      this.ambientActive = false;
    }
  }

  /**
   * Override the colour used for pointer-driven splats. Pass null to
   * restore the rotating Riso-spot cycle (hero default). Externally
   * queued splats via injectSplat() still use their own colour — only
   * the pointer/ambient rotation is affected.
   */
  setSplatColor(color: keyof typeof SPOT_COLORS | null): void {
    this.splatColorOverride = color ? SPOT_COLORS[color] : null;
  }

  /**
   * Toggle the auto-pointer-splat block in step(). When false, the
   * orchestrator never reads from PointerState.x/y/dx/dy/down and the
   * caller is expected to drive splats manually via injectSplat(),
   * which lets the caller distinguish click-burst from drag-trail
   * behaviour. Hero stays at the default (true).
   */
  setPointerSplatEnabled(enabled: boolean): void {
    this.pointerSplatEnabled = enabled;
  }

  /**
   * Clear the simulation state — empties velocity, dye, pressure,
   * divergence, and curl FBOs back to zero, drops queued splats, and
   * resets the ambient timer/strength. After reset() the canvas reads
   * as fresh paper again. Does not destroy GL programs / FBOs (cheap
   * to call from a button).
   */
  reset(): void {
    const gl = this.gl;
    const clearFBO = (fbo: FBO) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
      gl.viewport(0, 0, fbo.width, fbo.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };
    clearFBO(this.velocity.read);
    clearFBO(this.velocity.write);
    clearFBO(this.dye.read);
    clearFBO(this.dye.write);
    clearFBO(this.pressure.read);
    clearFBO(this.pressure.write);
    clearFBO(this.divergenceFBO);
    clearFBO(this.curlFBO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.pendingSplats.length = 0;
    this.ambientStrength = 0;
    this.ambientActive = false;
    this.lastPointerTime = performance.now();
    this.frameCount = 0;
  }

  /**
   * Massive centre splat — the "Bomb" button in Ink Drop Studio.
   * Queues several stacked splats with a large radius so the dye
   * field saturates and the velocity field gets a real shockwave
   * outward, not just a single small dot. `color` is the active ink.
   */
  injectBomb(x: number, y: number, color: keyof typeof SPOT_COLORS): void {
    const resolved = SPOT_COLORS[color];
    // 8 outward-pointing impulses around the centre + a stationary
    // dump at the centre itself = an explosion that radiates while
    // dropping a fat ink core.
    const RING = 8;
    const STRENGTH = 1.5;
    for (let i = 0; i < RING; i++) {
      const a = (i / RING) * Math.PI * 2;
      this.pendingSplats.push({
        x,
        y,
        dx: Math.cos(a) * STRENGTH,
        dy: Math.sin(a) * STRENGTH,
        color: resolved,
      });
    }
    this.pendingSplats.push({ x, y, dx: 0, dy: 0, color: resolved });
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

  private destroyFBOs(): void {
    const gl = this.gl;
    if (this.velocity) destroyDoubleFBO(gl, this.velocity);
    if (this.dye) destroyDoubleFBO(gl, this.dye);
    if (this.pressure) destroyDoubleFBO(gl, this.pressure);
    if (this.divergenceFBO) destroyFBO(gl, this.divergenceFBO);
    if (this.curlFBO) destroyFBO(gl, this.curlFBO);
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

  private activateProgram(program: WebGLProgram): void {
    // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL API, not a React hook
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
    this.activateProgram(p);

    // Velocity splat
    this.bindTexture(p, "uTarget", this.velocity.read.texture, 0);
    this.setFloat(p, "uAspectRatio", this.canvasWidth / this.canvasHeight);
    this.setVec2(p, "uPoint", x, y);
    this.setFloat(p, "uRadius", this.config.splatRadius);
    this.setVec3(p, "uColor", dx * 10.0, dy * 10.0, 0.0);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();

    // Dye splat — scale intensity down so dye stays in [0,1] range
    // and doesn't overwhelm the toon shader's Sobel edge detection.
    const dyeScale = 0.15;
    this.bindTexture(p, "uTarget", this.dye.read.texture, 0);
    this.setVec3(p, "uColor", color[0] * dyeScale, color[1] * dyeScale, color[2] * dyeScale);
    this.renderToFBO(this.dye.write);
    this.drawQuad();
    this.dye.swap();
  }

  private runCurl(): void {
    const p = this.programs.curl;
    this.activateProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.curlFBO);
    this.drawQuad();
  }

  private runVorticity(dt: number): void {
    const p = this.programs.vorticity;
    this.activateProgram(p);
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
    this.activateProgram(p);
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
    this.activateProgram(p);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.divergenceFBO);
    this.drawQuad();
  }

  private runPressure(): void {
    const p = this.programs.pressure;
    this.activateProgram(p);
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
    this.activateProgram(p);
    this.bindTexture(p, "uPressure", this.pressure.read.texture, 0);
    this.bindTexture(p, "uVelocity", this.velocity.read.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(this.velocity.write);
    this.drawQuad();
    this.velocity.swap();
  }

  private runRenderToon(elapsed: number): void {
    const p = this.programs.renderToon;
    this.activateProgram(p);
    this.bindTexture(p, "uDye", this.dye.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.canvasWidth, 1.0 / this.canvasHeight);
    this.setFloat(p, "uLevels", 4.0);
    this.setFloat(p, "uOutlineThreshold", 0.15);
    this.setFloat(p, "uGrainStrength", 0.07);
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

    // Render directly to screen (default framebuffer)
    const gl = this.gl;
    gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

  // Public splat-injection API for external callers (e.g. Work-cards
  // dispatching a click-burst). Coordinates are normalised 0..1 with
  // y measured from the bottom (same convention as `pointer`). `color`
  // can be a Riso spot-name or a raw normalised RGB tuple. dx/dy give
  // the velocity injection — pass radial-outward values for a "burst",
  // (0,0) for a stationary dye dump.
  injectSplat(
    x: number,
    y: number,
    color: keyof typeof SPOT_COLORS | readonly [number, number, number],
    dx = 0,
    dy = 0,
  ): void {
    const resolved = typeof color === "string" ? SPOT_COLORS[color] : color;
    this.pendingSplats.push({ x, y, dx, dy, color: resolved });
  }

  step(dt: number, elapsed: number, pointer: PointerState): void {
    if (this.paused) {
      // Don't accumulate stale splats while paused — they'd all dump
      // at once when the sim resumes and look like a glitch.
      this.pendingSplats.length = 0;
      return;
    }

    const gl = this.gl;
    this.frameCount++;

    // Update ambient timer — starts after 3s idle, ramps up over 2s.
    // When pointer is active, reduce ambient but don't kill it entirely —
    // keep 2 wandering points alive so cursor sim interacts with them.
    if (pointer.moved) {
      this.lastPointerTime = performance.now();
      // Fade ambient down to a floor of 0.3 (keeps 2 points alive)
      if (this.ambientActive) {
        this.ambientStrength = Math.max(0.3, this.ambientStrength - dt / 0.8);
      } else {
        this.ambientStrength = Math.max(0, this.ambientStrength - dt / 0.5);
      }
    } else if (this.ambientEnabled && performance.now() - this.lastPointerTime > 3000) {
      this.ambientStrength = Math.min(1, this.ambientStrength + dt / 2.0);
      this.ambientActive = true;
    }

    // Bind empty VAO for attribute-less draws (avoids driver warnings)
    gl.bindVertexArray(this.emptyVAO);

    // Disable blending for all sim passes
    gl.disable(gl.BLEND);

    // Sim-step: skipped on odd frames at half-rate
    const runSim = !this.config.halfRate || this.frameCount % 2 === 0;

    if (runSim) {
      // Splat from pointer (hero default; studio mode disables this and
      // drives splats manually via injectSplat() so click-burst and
      // drag-trail can have distinct behaviour).
      if (this.pointerSplatEnabled && (pointer.moved || pointer.down)) {
        const color = this.splatColorOverride ?? this.nextSplatColor();
        this.runSplat(pointer.x, pointer.y, pointer.dx, pointer.dy, color);
      }

      // Drain external splats queued via injectSplat() — Work-card click
      // bursts land here on the next step after dispatch.
      if (this.pendingSplats.length > 0) {
        for (const s of this.pendingSplats) {
          this.runSplat(s.x, s.y, s.dx, s.dy, s.color);
        }
        this.pendingSplats.length = 0;
      }

      // Ambient motion when idle — multiple wandering points
      // for an organic, breathing feel like layered Riso ink settling.
      // Studio mode disables this entirely (flag is false).
      if (this.ambientEnabled && this.ambientStrength > 0.01) {
        const t = elapsed * AMBIENT_PARAMS.timeScale;
        const s = this.ambientStrength;

        const { pointA, pointB, pointC } = AMBIENT_PARAMS;

        // Point A: slow wide orbit (upper-right quadrant tendency)
        const ax = pointA.center[0] + pointA.range * Math.sin(t * pointA.freqX + pointA.phaseX);
        const ay = pointA.center[1] + pointA.range * Math.cos(t * pointA.freqY + pointA.phaseY);
        const adx = Math.cos(t * pointA.forceFreqX + pointA.phaseFX) * s * pointA.forceStrength;
        const ady = Math.sin(t * pointA.forceFreqY + pointA.phaseFY) * s * pointA.forceStrength;
        this.runSplat(ax, ay, adx, ady, this.nextSplatColor());

        // Point B: faster small orbit (lower-left tendency) — offset phase
        const bx = pointB.center[0] + pointB.range * Math.sin(t * pointB.freqX + pointB.phaseX);
        const by = pointB.center[1] + pointB.range * Math.cos(t * pointB.freqY + pointB.phaseY);
        const bdx = Math.cos(t * pointB.forceFreqX + pointB.phaseFX) * s * pointB.forceStrength;
        const bdy = Math.sin(t * pointB.forceFreqY + pointB.phaseFY) * s * pointB.forceStrength;
        this.runSplat(bx, by, bdx, bdy, this.nextSplatColor());

        // Point C: very slow drift (center) — appears only at full ambient
        if (s > pointC.gateThreshold) {
          const cs = s - pointC.gateThreshold;
          const cx = pointC.center[0] + pointC.range * Math.sin(t * pointC.freqX + pointC.phaseX);
          const cy = pointC.center[1] + pointC.range * Math.cos(t * pointC.freqY + pointC.phaseY);
          const cdx = Math.cos(t * pointC.forceFreqX + pointC.phaseFX) * cs * pointC.forceStrength;
          const cdy = Math.sin(t * pointC.forceFreqY + pointC.phaseFY) * cs * pointC.forceStrength;
          this.runSplat(cx, cy, cdx, cdy, this.nextSplatColor());
        }
      }

      // Clear pressure field before solve
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.read.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.write.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.clearColor(0, 0, 0, 1);

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

    // Restore GL state for R3F
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }
}
