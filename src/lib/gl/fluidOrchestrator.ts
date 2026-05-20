// src/lib/gl/fluidOrchestrator.ts

import { compileShader } from "@/lib/gl/compileShader";
import { createProgram as linkProgram } from "@/lib/gl/createProgram";
import type { TierConfig } from "@/lib/gpu";
import { INK_COLOR, PAPER_COLOR, SPOT_RGB, type SpotColor } from "@/lib/palette";
import noiseSrc from "@/shaders/common/noise.glsl";
import posterizeSrc from "@/shaders/common/posterize.glsl";
import quadVert from "@/shaders/common/quad.vert.glsl";
import sobelSrc from "@/shaders/common/sobel.glsl";
import advectFrag from "@/shaders/fluid/advect.frag.glsl";
import curlFrag from "@/shaders/fluid/curl.frag.glsl";
import divergenceFrag from "@/shaders/fluid/divergence.frag.glsl";
import gradientSubFrag from "@/shaders/fluid/gradient-subtract.frag.glsl";
import injectDensityFrag from "@/shaders/fluid/inject-density.frag.glsl";
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
  injectDensity: WebGLProgram;
};

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------

// Spot/paper/ink colours live in `@/lib/palette` as the canonical source
// (mirrors the `--color-*` design tokens in globals.css). Local alias
// keeps the call sites below readable while making the dependency
// explicit at import time.
const SPOT_COLORS = SPOT_RGB;

// Ambient motion: 3 wandering points that splat fluid when no pointer input.
// Extracted for future dev-panel tuning. Time-scale governs the whole rig;
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

// Program builder for the fluid pipeline — wraps the shared shader +
// program helpers (`@/lib/gl/compileShader`, `@/lib/gl/createProgram`)
// so source strings flow through the BOM/`#version` cleanup path that
// protects against Windows ANGLE / Turbopack HMR cache poisoning.
function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
  label = "fluid",
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc, `${label}.vert`);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc, `${label}.frag`);
  return linkProgram(gl, vert, frag, label);
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

// All GL-dependent state lives behind a single optional handle so init()
// is the only place that constructs it. Eliminates the 8
// definite-assignment assertions that the old `gl!: WebGL2RenderingContext`
// shape required, and gives every method a single null-guard
// (`requireState()`) instead of trusting `init()` was called.
//
// SF-3 (Mobile Rework pre-work) needs multi-instance orchestrators with
// no cross-talk; bundling per-instance state in one object also makes
// that boundary explicit.
type GLState = {
  gl: WebGL2RenderingContext;
  config: TierConfig;
  programs: Programs;
  velocity: DoubleFBO;
  dye: DoubleFBO;
  pressure: DoubleFBO;
  divergenceFBO: FBO;
  curlFBO: FBO;
  emptyVAO: WebGLVertexArrayObject | null;
};

/**
 * FluidOrchestrator — Navier-Stokes ink simulation pipeline.
 *
 * Two equivalent ways to instantiate (post-SF-3):
 * - **New call sites: prefer `createFluidOrchestrator()`** below. Factory-style
 *   instantiation is the documented entry point for the Mobile Rework's
 *   multi-instance sim spots and any future per-section sims.
 * - **Existing call sites: `new FluidOrchestrator()` still works.** All 5
 *   pre-SF-3 consumers (FluidSim, mini-sims, playground experiments) use
 *   this form unchanged.
 *
 * Lifecycle: construct → `init(gl, config)` → `start()` or `triggerAmbient()`
 * → `step()` per RAF → `dispose()`. `dispose()` is terminal — the instance
 * is not designed to be reused (queue/counter state is not reset on dispose).
 */
export class FluidOrchestrator {
  private state: GLState | null = null;

  private simWidth = 0;
  private simHeight = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  private frameCount = 0;
  private paused = false;
  private lastPointerTime = 0;
  // Grace deadline (performance.now() ms): while `performance.now()` is
  // below this, pointer movement does NOT reset `lastPointerTime`, so
  // ambient strength holds at full while the cursor passes by during
  // the warm-in window. Set by `triggerAmbient()` to ~5s ahead.
  private ambientGraceUntil = 0;
  private ambientStrength = 0;
  private splatColorIndex = 0;
  private ambientActive = false;
  // Auto-ambient gate: the 3s-idle timer in step() only fires once
  // `triggerAmbient()` has been called. Without this, the orchestrator
  // would auto-kick ambient ~3s after init, racing the loader/hero
  // start-up dramaturgy. Hero rig sets this true via triggerAmbient
  // after the loader+hero-reveal cadence; studio mode can flip it
  // through setAmbientEnabled.
  private ambientReady = false;
  // Warmup gate: step() short-circuits while false so the full sim
  // pipeline (8 passes incl. pressure-N-iter) doesn't burn GPU during
  // the loader+hero-reveal window — that warmup work was eating the
  // OverprintReveal animation. Flipped true by `triggerAmbient()`;
  // FluidSim's RAF subscriber also reads `isStarted()` to skip the
  // measuring path so tier auto-tune samples capture real workload,
  // not the empty warmup window.
  private started = false;
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
    radius?: number;
  }> = [];

  // Uniform cache: WebGLProgram -> (uniform name -> location)
  // Using a nested Map because WebGLProgram.toString() is not unique.
  private uniformCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Returns the GL state or throws if `init()` was never called.
   *  Replaces the old `!` definite-assignment-assertion contract with
   *  an explicit precondition. */
  private requireState(): GLState {
    if (!this.state) {
      throw new Error("FluidOrchestrator: init() must be called before use");
    }
    return this.state;
  }

  init(gl: WebGL2RenderingContext, config: TierConfig): void {
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

    const programs: Programs = {
      splat: createProgram(gl, quadVert, splatFrag, "fluid.splat"),
      curl: createProgram(gl, quadVert, curlFrag, "fluid.curl"),
      vorticity: createProgram(gl, quadVert, vorticityFrag, "fluid.vorticity"),
      advect: createProgram(gl, quadVert, advectFrag, "fluid.advect"),
      divergence: createProgram(gl, quadVert, divergenceFrag, "fluid.divergence"),
      pressure: createProgram(gl, quadVert, pressureFrag, "fluid.pressure"),
      gradientSub: createProgram(gl, quadVert, gradientSubFrag, "fluid.gradient-sub"),
      renderToon: createProgram(gl, quadVert, toonFrag, "fluid.render-toon"),
      injectDensity: createProgram(gl, quadVert, injectDensityFrag, "fluid.inject-density"),
    };

    // FBO geometry derives from the current drawing buffer; createSimFBOs()
    // reads simWidth/simHeight off `this` so set those first.
    this.canvasWidth = gl.drawingBufferWidth;
    this.canvasHeight = gl.drawingBufferHeight;
    const aspectRatio = this.canvasWidth / this.canvasHeight;
    this.simWidth = config.gridSize;
    this.simHeight = Math.round(config.gridSize / aspectRatio);

    const w = this.simWidth;
    const h = this.simHeight;
    const velocity = createDoubleFBO(gl, w, h, gl.RG16F, gl.RG, gl.HALF_FLOAT);
    const dye = createDoubleFBO(gl, w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    const pressure = createDoubleFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    const divergenceFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    const curlFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);

    this.state = {
      gl,
      config,
      programs,
      velocity,
      dye,
      pressure,
      divergenceFBO,
      curlFBO,
      emptyVAO: gl.createVertexArray(),
    };
  }

  resize(width: number, height: number): void {
    if (width === this.canvasWidth && height === this.canvasHeight) return;

    this.canvasWidth = width;
    this.canvasHeight = height;

    // Destroy and recreate sim FBOs (aspect ratio may have changed).
    // No-op if init() hasn't run yet — the next init() picks up
    // canvasWidth/Height directly.
    if (!this.state) return;
    this.destroyFBOs(this.state);
    this.createSimFBOs(this.state);
  }

  /**
   * Release all GL resources (programs, FBOs, VAOs) and null the state
   * handle. Idempotent — calling dispose() twice is safe (second call
   * early-returns on `!state`). StrictMode-safe — does NOT call
   * `loseContext()` (see `.claude/CLAUDE.md`).
   *
   * **Terminal:** instance is not designed to be reused after dispose.
   * Queue/counter state (`pendingSplats`, `frameCount`, `ambientStrength`,
   * `started`, etc.) is not reset. If a caller does `dispose()` → `init()`
   * the orchestrator wakes up in the prior session's state. No current
   * consumer needs the reuse path; if a future one does, extend dispose()
   * to also reset the non-GL state.
   */
  dispose(): void {
    const state = this.state;
    if (!state) return;
    const gl = state.gl;
    this.destroyFBOs(state);
    for (const program of Object.values(state.programs)) {
      gl.deleteProgram(program);
    }
    if (state.emptyVAO) {
      gl.deleteVertexArray(state.emptyVAO);
      state.emptyVAO = null;
    }
    this.uniformCache.clear();
    this.state = null;
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

  isStarted(): boolean {
    return this.started;
  }

  /** Open the warmup gate so step() runs the full pipeline. Hero rig
   *  goes through `triggerAmbient()` which calls this; studio /
   *  TypeAsFluid call this directly because they manage ambient
   *  themselves and just need the sim to begin. Idempotent. */
  start(): void {
    this.started = true;
  }

  /** Kick ambient motion immediately (called when loader finishes
   *  + hero-reveal settle window — see FluidSim.tsx). Opens the warmup
   *  gate so step() runs the full pipeline, opens the auto-ambient
   *  gate so the in-step idle timer can re-kick ambient if the user
   *  goes idle later. */
  triggerAmbient(): void {
    this.start();
    this.ambientReady = true;
    this.ambientStrength = 1.0;
    this.ambientActive = true;
    // 5s grace window: pointer movement during this window does NOT
    // reset `lastPointerTime` (see step()), so ambient stays at full
    // strength while the user's cursor flies past the freshly-revealed
    // hero. Previously this was done by setting `lastPointerTime =
    // performance.now() + 5000` directly, which broke as soon as the
    // first `pointer.moved` tick wrote `performance.now()` back over it.
    this.ambientGraceUntil = performance.now() + 5000;
    this.lastPointerTime = performance.now();
  }

  /**
   * Live-tunable param overrides. Mutates `this.config` so step() picks
   * up the new values on the very next frame without re-init / FBO
   * teardown. Used by Ink Drop Studio's Tweakpane sliders. Pressure-iters
   * changes are also live since the count is read inside the solve loop.
   *
   * **Contract:** `init()` must be called first. Calling setParams() on
   * an uninitialised orchestrator throws via `requireState()`. (Pre-SF-3
   * this silently spread into an undefined config — also broken, just
   * quietly.)
   */
  setParams(partial: Partial<TierConfig>): void {
    const state = this.requireState();
    state.config = { ...state.config, ...partial };
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
  setSplatColor(color: SpotColor | null): void {
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
    const state = this.requireState();
    const gl = state.gl;
    const clearFBO = (fbo: FBO) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
      gl.viewport(0, 0, fbo.width, fbo.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };
    clearFBO(state.velocity.read);
    clearFBO(state.velocity.write);
    clearFBO(state.dye.read);
    clearFBO(state.dye.write);
    clearFBO(state.pressure.read);
    clearFBO(state.pressure.write);
    clearFBO(state.divergenceFBO);
    clearFBO(state.curlFBO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.pendingSplats.length = 0;
    this.ambientStrength = 0;
    this.ambientActive = false;
    this.lastPointerTime = performance.now();
    this.frameCount = 0;
  }

  /**
   * Stamp an external alpha texture into the dye field, multiplied by
   * `color × strength`. Used by Type-as-Fluid's TextStamper to bake
   * a soft text mask into the running fluid sim — the dye field then
   * advects + dissipates the stamp as if it were any other ink. The
   * texture is read in normalised UV (0..1) and only the .r channel
   * is sampled (consistent with R8 stamp uploads).
   *
   * dyeColor accepts either a Riso spot key or a raw RGB triplet so
   * callers can either match the palette or inject something custom.
   * Strength typically lives in 0.3..1.5 — feel by feel.
   */
  injectDensityTexture(
    stamp: WebGLTexture,
    color: SpotColor | readonly [number, number, number],
    strength = 1.0,
  ): void {
    const state = this.requireState();
    const gl = state.gl;
    const resolved = typeof color === "string" ? SPOT_COLORS[color] : color;
    const p = state.programs.injectDensity;
    this.activateProgram(p);
    this.bindTexture(p, "uDye", state.dye.read.texture, 0);
    this.bindTexture(p, "uStamp", stamp, 1);
    this.setVec3(p, "uColor", resolved[0], resolved[1], resolved[2]);
    this.setFloat(p, "uStrength", strength);
    gl.bindVertexArray(state.emptyVAO);
    this.renderToFBO(state.dye.write);
    this.drawQuad();
    state.dye.swap();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Read-only access to the simulation grid dimensions. TextStamper
   * needs to size its blur FBOs to match (otherwise the stamp would
   * be sampled at a different resolution and either pixelate or
   * over-blur). Returns the same w/h that the dye/velocity FBOs use.
   */
  getSimSize(): { width: number; height: number } {
    return { width: this.simWidth, height: this.simHeight };
  }

  /**
   * Massive centre splat — the "Bomb" button in Ink Drop Studio.
   * Queues several stacked splats with a large radius so the dye
   * field saturates and the velocity field gets a real shockwave
   * outward, not just a single small dot. `color` is the active ink.
   */
  // No requireState() here: this is a pure queue push (this.pendingSplats)
  // with no GL access. step() drains the queue and gates draws on
  // requireState() at the consumer side. Same pattern as injectSplat().
  injectBomb(x: number, y: number, color: SpotColor): void {
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

  /** Reallocate the sim FBOs against the current canvas size. Used by
   *  resize() after the aspect ratio changes; init() inlines this work
   *  so the state object can be constructed atomically. */
  private createSimFBOs(state: GLState): void {
    const gl = state.gl;
    const aspectRatio = this.canvasWidth / this.canvasHeight;
    this.simWidth = state.config.gridSize;
    this.simHeight = Math.round(state.config.gridSize / aspectRatio);

    const w = this.simWidth;
    const h = this.simHeight;

    state.velocity = createDoubleFBO(gl, w, h, gl.RG16F, gl.RG, gl.HALF_FLOAT);
    state.dye = createDoubleFBO(gl, w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    state.pressure = createDoubleFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    state.divergenceFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
    state.curlFBO = createFBO(gl, w, h, gl.R16F, gl.RED, gl.HALF_FLOAT);
  }

  private destroyFBOs(state: GLState): void {
    const gl = state.gl;
    destroyDoubleFBO(gl, state.velocity);
    destroyDoubleFBO(gl, state.dye);
    destroyDoubleFBO(gl, state.pressure);
    destroyFBO(gl, state.divergenceFBO);
    destroyFBO(gl, state.curlFBO);
  }

  // ---------------------------------------------------------------------------
  // Draw helpers & uniform cache
  // ---------------------------------------------------------------------------

  // Hot-path helpers read `gl` through requireState() rather than a
  // non-null assertion. requireState() is cheap (one truthy check); the
  // alternative was a single `this.state!.gl` non-null assertion or
  // re-plumbing `gl` through every helper signature. SF-3 explicitly
  // tightened on this: no `!` assertions remain in this file.
  private getUniform(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    let programMap = this.uniformCache.get(program);
    if (!programMap) {
      programMap = new Map<string, WebGLUniformLocation | null>();
      this.uniformCache.set(program, programMap);
    }
    if (!programMap.has(name)) {
      programMap.set(name, this.requireState().gl.getUniformLocation(program, name));
    }
    return programMap.get(name) ?? null;
  }

  private activateProgram(program: WebGLProgram): void {
    // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL API, not a React hook
    this.requireState().gl.useProgram(program);
  }

  private setFloat(program: WebGLProgram, name: string, value: number): void {
    this.requireState().gl.uniform1f(this.getUniform(program, name), value);
  }

  private setVec2(program: WebGLProgram, name: string, x: number, y: number): void {
    this.requireState().gl.uniform2f(this.getUniform(program, name), x, y);
  }

  private setVec3(program: WebGLProgram, name: string, r: number, g: number, b: number): void {
    this.requireState().gl.uniform3f(this.getUniform(program, name), r, g, b);
  }

  private bindTexture(
    program: WebGLProgram,
    name: string,
    texture: WebGLTexture,
    unit: number,
  ): void {
    const gl = this.requireState().gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.getUniform(program, name), unit);
  }

  private drawQuad(): void {
    const gl = this.requireState().gl;
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private renderToFBO(fbo: FBO): void {
    const gl = this.requireState().gl;
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
    radiusOverride?: number,
  ): void {
    const state = this.requireState();
    const p = state.programs.splat;
    this.activateProgram(p);

    // Velocity splat
    this.bindTexture(p, "uTarget", state.velocity.read.texture, 0);
    this.setFloat(p, "uAspectRatio", this.canvasWidth / this.canvasHeight);
    this.setVec2(p, "uPoint", x, y);
    this.setFloat(p, "uRadius", radiusOverride ?? state.config.splatRadius);
    this.setVec3(p, "uColor", dx * 10.0, dy * 10.0, 0.0);
    this.renderToFBO(state.velocity.write);
    this.drawQuad();
    state.velocity.swap();

    // Dye splat — scale intensity down so dye stays in [0,1] range
    // and doesn't overwhelm the toon shader's Sobel edge detection.
    const dyeScale = 0.15;
    this.bindTexture(p, "uTarget", state.dye.read.texture, 0);
    this.setVec3(p, "uColor", color[0] * dyeScale, color[1] * dyeScale, color[2] * dyeScale);
    this.renderToFBO(state.dye.write);
    this.drawQuad();
    state.dye.swap();
  }

  private runCurl(): void {
    const state = this.requireState();
    const p = state.programs.curl;
    this.activateProgram(p);
    this.bindTexture(p, "uVelocity", state.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(state.curlFBO);
    this.drawQuad();
  }

  private runVorticity(dt: number): void {
    const state = this.requireState();
    const p = state.programs.vorticity;
    this.activateProgram(p);
    this.bindTexture(p, "uVelocity", state.velocity.read.texture, 0);
    this.bindTexture(p, "uCurl", state.curlFBO.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.setFloat(p, "uConfinement", state.config.confinement);
    this.setFloat(p, "uDt", dt);
    this.renderToFBO(state.velocity.write);
    this.drawQuad();
    state.velocity.swap();
  }

  private runAdvect(target: DoubleFBO, dissipation: number, dt: number): void {
    const state = this.requireState();
    const p = state.programs.advect;
    this.activateProgram(p);
    this.bindTexture(p, "uVelocity", state.velocity.read.texture, 0);
    this.bindTexture(p, "uSource", target.read.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.setFloat(p, "uDt", dt);
    this.setFloat(p, "uDissipation", dissipation);
    this.renderToFBO(target.write);
    this.drawQuad();
    target.swap();
  }

  private runDivergence(): void {
    const state = this.requireState();
    const p = state.programs.divergence;
    this.activateProgram(p);
    this.bindTexture(p, "uVelocity", state.velocity.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(state.divergenceFBO);
    this.drawQuad();
  }

  private runPressure(): void {
    const state = this.requireState();
    const p = state.programs.pressure;
    this.activateProgram(p);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.bindTexture(p, "uDivergence", state.divergenceFBO.texture, 1);

    for (let i = 0; i < state.config.pressureIterations; i++) {
      this.bindTexture(p, "uPressure", state.pressure.read.texture, 0);
      this.renderToFBO(state.pressure.write);
      this.drawQuad();
      state.pressure.swap();
    }
  }

  private runGradientSubtract(): void {
    const state = this.requireState();
    const p = state.programs.gradientSub;
    this.activateProgram(p);
    this.bindTexture(p, "uPressure", state.pressure.read.texture, 0);
    this.bindTexture(p, "uVelocity", state.velocity.read.texture, 1);
    this.setVec2(p, "uTexelSize", 1.0 / this.simWidth, 1.0 / this.simHeight);
    this.renderToFBO(state.velocity.write);
    this.drawQuad();
    state.velocity.swap();
  }

  private runRenderToon(elapsed: number): void {
    const state = this.requireState();
    const p = state.programs.renderToon;
    this.activateProgram(p);
    this.bindTexture(p, "uDye", state.dye.read.texture, 0);
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
    const gl = state.gl;
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
    color: SpotColor | readonly [number, number, number],
    dx = 0,
    dy = 0,
    radius?: number,
  ): void {
    const resolved = typeof color === "string" ? SPOT_COLORS[color] : color;
    this.pendingSplats.push({ x, y, dx, dy, color: resolved, radius });
  }

  step(dt: number, elapsed: number, pointer: PointerState): void {
    if (this.paused) {
      // Don't accumulate stale splats while paused — they'd all dump
      // at once when the sim resumes and look like a glitch.
      this.pendingSplats.length = 0;
      return;
    }

    // step() may fire before init() (e.g. from a stale closure during
    // teardown). Bail silently rather than throwing into the RAF loop.
    if (!this.state) return;
    const state = this.state;
    const gl = state.gl;
    this.frameCount++;

    // Pre-warmup gate: while !started, skip all expensive sim passes
    // (curl + vorticity + 2 advects + divergence + N-iter pressure +
    // gradient-subtract) and only paint render-toon so the canvas shows
    // paper + grain instead of WebGL's opaque-black default-clear (the
    // R3F Canvas is `alpha: false`). Splat queue drains on the first
    // started step so any buffered Work-card clicks during the loader
    // don't dump as a glitch when ambient kicks in.
    if (!this.started) {
      this.pendingSplats.length = 0;
      gl.bindVertexArray(state.emptyVAO);
      gl.disable(gl.BLEND);
      this.runRenderToon(elapsed);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindVertexArray(null);
      return;
    }

    // Update ambient timer — starts after 3s idle, ramps up over 2s.
    // When pointer is active, reduce ambient but don't kill it entirely —
    // keep 2 wandering points alive so cursor sim interacts with them.
    if (pointer.moved) {
      // Skip the lastPointerTime reset while inside the post-
      // `triggerAmbient()` grace window — otherwise pointer movement
      // right after the loader finishes would re-arm the 3s idle
      // gate, suppressing ambient before the hero-reveal even settles.
      if (performance.now() > this.ambientGraceUntil) {
        this.lastPointerTime = performance.now();
      }
      // Fade ambient down to a floor of 0.3 (keeps 2 points alive)
      if (this.ambientActive) {
        this.ambientStrength = Math.max(0.3, this.ambientStrength - dt / 0.8);
      } else {
        this.ambientStrength = Math.max(0, this.ambientStrength - dt / 0.5);
      }
    } else if (
      this.ambientEnabled &&
      this.ambientReady &&
      performance.now() - this.lastPointerTime > 3000
    ) {
      this.ambientStrength = Math.min(1, this.ambientStrength + dt / 2.0);
      this.ambientActive = true;
    }

    // Bind empty VAO for attribute-less draws (avoids driver warnings)
    gl.bindVertexArray(state.emptyVAO);

    // Disable blending for all sim passes
    gl.disable(gl.BLEND);

    // Sim-step: skipped on odd frames at half-rate
    const runSim = !state.config.halfRate || this.frameCount % 2 === 0;

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
          this.runSplat(s.x, s.y, s.dx, s.dy, s.color, s.radius);
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
      gl.bindFramebuffer(gl.FRAMEBUFFER, state.pressure.read.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, state.pressure.write.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.clearColor(0, 0, 0, 1);

      this.runCurl();
      this.runVorticity(dt);
      this.runAdvect(state.velocity, state.config.velocityDissipation, dt);
      this.runDivergence();
      this.runPressure();
      this.runGradientSubtract();
      this.runAdvect(state.dye, state.config.dyeDissipation, dt);
    }

    // Render-toon always runs (even at half-rate)
    this.runRenderToon(elapsed);

    // Restore GL state for R3F
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Public factory for FluidOrchestrator instances.
 *
 * SF-3 introduced this alongside the existing `new FluidOrchestrator()`
 * constructor so callers that prefer factory-style instantiation (Mobile
 * Rework's multi-instance sim spots — see
 * `docs/superpowers/specs/2026-05-20-mobile-rework-design.md` Section
 * 3.3) get a stable entry point. The constructor remains available for
 * existing call sites; both produce identical instances.
 *
 * Each call returns an independent orchestrator with its own GL state.
 * Per-instance state lives behind `state: GLState | null`, so two
 * orchestrators on different canvases can't trip over each other's
 * uniforms / FBOs.
 */
export function createFluidOrchestrator(): FluidOrchestrator {
  return new FluidOrchestrator();
}
