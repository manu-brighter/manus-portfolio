// src/lib/gl/fluidOrchestrator.ts

import { compileShader } from "@/lib/gl/compileShader";
import { createProgram as linkProgram } from "@/lib/gl/createProgram";
import type { TierConfig } from "@/lib/gpu";
import { INK_COLOR, PAPER_COLOR, SPOT_RGB, type SpotColor } from "@/lib/palette";
import noiseSrc from "@/shaders/common/noise.glsl";
import quadVert from "@/shaders/common/quad.vert.glsl";
import sobelSrc from "@/shaders/common/sobel.glsl";
import advectFrag from "@/shaders/fluid/advect.frag.glsl";
import curlFrag from "@/shaders/fluid/curl.frag.glsl";
import divergenceFrag from "@/shaders/fluid/divergence.frag.glsl";
import gradientSubFrag from "@/shaders/fluid/gradient-subtract.frag.glsl";
import injectDensityFrag from "@/shaders/fluid/inject-density.frag.glsl";
import pressureFrag from "@/shaders/fluid/pressure.frag.glsl";
import renderAquarellFrag from "@/shaders/fluid/render-aquarell.frag.glsl";
import renderNachtdruckFrag from "@/shaders/fluid/render-nachtdruck.frag.glsl";
import renderRisoFrag from "@/shaders/fluid/render-riso.frag.glsl";
import renderTurbulenzFrag from "@/shaders/fluid/render-turbulenz.frag.glsl";
import renderWaveFrag from "@/shaders/fluid/render-wave.frag.glsl";
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
  // One genuinely distinct render shader per preset style — not one
  // parametrized shader. All four compile at init (cheap, one-time)
  // so a live preset switch is just a program swap in runRender().
  renderRiso: WebGLProgram;
  renderWave: WebGLProgram;
  renderTurbulenz: WebGLProgram;
  renderAquarell: WebGLProgram;
  renderNachtdruck: WebGLProgram;
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

// Ambient motion: wandering points that splat fluid when no pointer
// input. The first three are the original hand-tuned rig (A/B/C —
// point C only appears at full ambient strength via gateThreshold);
// the rest are generated procedurally so presets can raise the count
// (Turbulenz runs a swarm of 8). Time-scale governs the whole rig.
const AMBIENT_TIME_SCALE = 0.0003;

type AmbientPoint = {
  center: readonly [number, number];
  range: number;
  freqX: number;
  freqY: number;
  forceFreqX: number;
  forceFreqY: number;
  forceStrength: number;
  phaseX: number;
  phaseY: number;
  phaseFX: number;
  phaseFY: number;
  /** Only splat when ambientStrength > this (legacy point-C gate). */
  gateThreshold?: number;
  /** Spawn/despawn cycle speed in rad/s — consumed when a preset sets
   *  ambientChurn > 0 (see step()). */
  lifeFreq: number;
  lifePhase: number;
};

/** Deterministic pseudo-random extra point — golden-angle placement +
 *  golden-ratio fractional spreads land the extras evenly without an
 *  RNG, so the rig stays reproducible frame-to-frame and reload-to-
 *  reload. */
function makeExtraAmbientPoint(i: number): AmbientPoint {
  const g = (k: number) => (i * k) % 1;
  const angle = i * 2.39996;
  const r = 0.16 + g(0.37) * 0.14;
  return {
    center: [0.5 + Math.cos(angle) * r, 0.5 + Math.sin(angle) * r],
    range: 0.12 + g(0.61) * 0.1,
    freqX: 0.6 + g(0.83) * 1.5,
    freqY: 0.5 + g(0.29) * 1.5,
    forceFreqX: 0.5 + g(0.47) * 1.2,
    forceFreqY: 0.6 + g(0.71) * 1.2,
    forceStrength: 0.13 + g(0.53) * 0.09,
    phaseX: i * 1.7,
    phaseY: i * 2.3,
    phaseFX: i * 0.9,
    phaseFY: i * 1.3,
    lifeFreq: 0.28 + g(0.43) * 0.3,
    lifePhase: i * 2.1,
  };
}

export const MAX_AMBIENT_POINTS = 10;

const AMBIENT_POINTS: readonly AmbientPoint[] = [
  // Point A: slow wide orbit (upper-right quadrant tendency)
  {
    center: [0.55, 0.55],
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
    lifeFreq: 0.31,
    lifePhase: 0.5,
  },
  // Point B: faster small orbit (lower-left tendency) — offset phase
  {
    center: [0.4, 0.4],
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
    lifeFreq: 0.4,
    lifePhase: 2.8,
  },
  // Point C: very slow drift (center) — appears only at full ambient
  {
    center: [0.5, 0.5],
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
    gateThreshold: 0.5,
    lifeFreq: 0.35,
    lifePhase: 4.2,
  },
  ...Array.from({ length: MAX_AMBIENT_POINTS - 3 }, (_, k) => makeExtraAmbientPoint(k + 3)),
];

// ---------------------------------------------------------------------------
// Visual look parameters
// ---------------------------------------------------------------------------

export type RGB = readonly [number, number, number];

/**
 * The five style-specific render shaders. Each is a genuinely
 * different fragment shader, not a parameter set on one shader:
 * riso = the original soft-ladder + Sobel ink pooling (quiet default),
 * wave = overprint plates with misregistration + ink bleed,
 * turbulenz = screenprint comic (hard bands, halftone, ink contours),
 * aquarell = wet watercolor (wide blur, granulation, wet-edge rims),
 * nachtdruck = neon print (hard bands, additive glow, chroma fringes).
 * Ids mirror `SimPresetId` today but stay a separate type — a future
 * preset may reuse an existing style.
 */
export type FluidRenderStyle = "riso" | "wave" | "turbulenz" | "aquarell" | "nachtdruck";

/**
 * Look-side knobs of the sim — everything that shapes how the dye field
 * is *rendered* plus how strongly splats inject, as opposed to the
 * physics params in `TierConfig` (which stay tier-owned, see gpu.ts).
 * Pure JS state read every frame by runSplat()/runRender()/the
 * ambient rig — no GL resources involved, so overrides are live and
 * safe at any time via setVisuals().
 *
 * Some knobs are interpreted per style (documented on the field);
 * a shader that doesn't declare a uniform simply ignores it (null
 * location = no-op).
 */
export type FluidVisuals = {
  /** Which of the four render shaders draws the dye field. */
  style: FluidRenderStyle;
  outlineThreshold: number;
  grainStrength: number;
  /** Per-style intensity knob: riso ignores it, turbulenz = ink
   *  contour-line strength, aquarell = wet-edge rim darkening,
   *  nachtdruck = glow-halo gain. */
  edgeStrength: number;
  paper: RGB;
  ink: RGB;
  /** Density color ladder low -> high, fed to the uSpotMint/Amber/
   *  Rose/Violet uniform slots (legacy names; presets re-assign which
   *  RGB sits in each slot). */
  ladder: readonly [RGB, RGB, RGB, RGB];
  /** Multiplier on pointer/splat velocity injection. */
  velocityScale: number;
  /** How much dye a splat deposits (kept well below 1 so dye stays in
   *  range and the render shaders' edge passes aren't overwhelmed). */
  dyeScale: number;
  /** Splats emitted per pointer-move frame (>= 1). Above 1 the splats
   *  scatter around the pointer (see splatScatter) — Turbulenz throws
   *  a swarm of small droplets instead of one stroke. */
  splatCount: number;
  /** UV jitter radius for the multi-splat scatter (0 = all stack). */
  splatScatter: number;
  /** How many ambient wandering points the idle rig runs (clamped to
   *  MAX_AMBIENT_POINTS). 3 = the original A/B/C rig; swarm presets
   *  raise this so the multi-splat character persists while idle,
   *  not just under the pointer. */
  ambientPointCount: number;
  /** 0..1 spawn/despawn cycling of ambient points beyond A/B. At 0
   *  every point is permanently alive (default rig behavior); at 1
   *  each extra point fades in and out on its own slow cycle, so the
   *  number of live ink sources visibly fluctuates over time. */
  ambientChurn: number;
  /** Multiplier on AMBIENT_TIME_SCALE (rig wander speed). */
  ambientTimeScale: number;
  /** Multiplier on each ambient point's forceStrength. */
  ambientForceScale: number;
};

// Frozen: instances hold this object by reference until the first
// setVisuals() — an accidental in-place mutation would poison every
// orchestrator plus the default itself.
export const DEFAULT_FLUID_VISUALS: FluidVisuals = Object.freeze<FluidVisuals>({
  style: "riso",
  outlineThreshold: 0.15,
  grainStrength: 0.07,
  edgeStrength: 0.35,
  paper: PAPER_COLOR,
  ink: INK_COLOR,
  ladder: [SPOT_RGB.mint, SPOT_RGB.amber, SPOT_RGB.rose, SPOT_RGB.violet],
  velocityScale: 10.0,
  dyeScale: 0.15,
  splatCount: 1,
  splatScatter: 0,
  ambientPointCount: 3,
  ambientChurn: 0,
  ambientTimeScale: 1,
  ambientForceScale: 1,
});

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
  private visuals: FluidVisuals = DEFAULT_FLUID_VISUALS;
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
    const programs: Programs = {
      splat: createProgram(gl, quadVert, splatFrag, "fluid.splat"),
      curl: createProgram(gl, quadVert, curlFrag, "fluid.curl"),
      vorticity: createProgram(gl, quadVert, vorticityFrag, "fluid.vorticity"),
      advect: createProgram(gl, quadVert, advectFrag, "fluid.advect"),
      divergence: createProgram(gl, quadVert, divergenceFrag, "fluid.divergence"),
      pressure: createProgram(gl, quadVert, pressureFrag, "fluid.pressure"),
      gradientSub: createProgram(gl, quadVert, gradientSubFrag, "fluid.gradient-sub"),
      renderRiso: createProgram(
        gl,
        quadVert,
        injectIncludes(renderRisoFrag, { noise: noiseSrc, sobel: sobelSrc }),
        "fluid.render-riso",
      ),
      renderWave: createProgram(
        gl,
        quadVert,
        injectIncludes(renderWaveFrag, { noise: noiseSrc }),
        "fluid.render-wave",
      ),
      renderTurbulenz: createProgram(
        gl,
        quadVert,
        injectIncludes(renderTurbulenzFrag, { noise: noiseSrc, sobel: sobelSrc }),
        "fluid.render-turbulenz",
      ),
      renderAquarell: createProgram(
        gl,
        quadVert,
        injectIncludes(renderAquarellFrag, { noise: noiseSrc }),
        "fluid.render-aquarell",
      ),
      renderNachtdruck: createProgram(
        gl,
        quadVert,
        injectIncludes(renderNachtdruckFrag, { noise: noiseSrc }),
        "fluid.render-nachtdruck",
      ),
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
   * Live-tunable look overrides — the preset-facing sibling of
   * setParams(). Pure JS state read by runSplat()/runRender()/the
   * ambient rig on the next frame; no GL resources touched, so unlike
   * setParams() this is safe to call before init().
   */
  setVisuals(partial: Partial<FluidVisuals>): void {
    this.visuals = { ...this.visuals, ...partial };
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
    dyeMul = 1,
  ): void {
    const state = this.requireState();
    const p = state.programs.splat;
    this.activateProgram(p);

    // Velocity splat
    const { velocityScale, dyeScale } = this.visuals;
    this.bindTexture(p, "uTarget", state.velocity.read.texture, 0);
    this.setFloat(p, "uAspectRatio", this.canvasWidth / this.canvasHeight);
    this.setVec2(p, "uPoint", x, y);
    this.setFloat(p, "uRadius", radiusOverride ?? state.config.splatRadius);
    this.setVec3(p, "uColor", dx * velocityScale, dy * velocityScale, 0.0);
    this.renderToFBO(state.velocity.write);
    this.drawQuad();
    state.velocity.swap();

    // Dye splat — dyeScale keeps dye in [0,1] range so it doesn't
    // overwhelm the render shaders' edge passes. dyeMul lets the
    // ambient churn fade a point's ink deposit in/out with its life
    // cycle instead of popping.
    const d = dyeScale * dyeMul;
    this.bindTexture(p, "uTarget", state.dye.read.texture, 0);
    this.setVec3(p, "uColor", color[0] * d, color[1] * d, color[2] * d);
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

  /** The render program for the active visual style. Exhaustive switch
   *  keeps TS honest when a fifth style is added. */
  private renderProgram(state: GLState): WebGLProgram {
    switch (this.visuals.style) {
      case "wave":
        return state.programs.renderWave;
      case "turbulenz":
        return state.programs.renderTurbulenz;
      case "aquarell":
        return state.programs.renderAquarell;
      case "nachtdruck":
        return state.programs.renderNachtdruck;
      case "riso":
        return state.programs.renderRiso;
    }
  }

  private runRender(elapsed: number): void {
    const state = this.requireState();
    const p = this.renderProgram(state);
    this.activateProgram(p);
    this.bindTexture(p, "uDye", state.dye.read.texture, 0);
    this.setVec2(p, "uTexelSize", 1.0 / this.canvasWidth, 1.0 / this.canvasHeight);
    // Sim-grid texel for passes that step the dye texture (Sobel in
    // render-turbulenz) — canvas-texel steps starve at high viewport
    // resolutions because the dye FBO is sim-resolution.
    this.setVec2(p, "uSimTexel", 1.0 / this.simWidth, 1.0 / this.simHeight);
    // Uniforms a style's shader doesn't declare resolve to a null
    // location — setting them is a spec-defined no-op, so one uniform
    // pass serves all four programs.
    const v = this.visuals;
    this.setFloat(p, "uOutlineThreshold", v.outlineThreshold);
    this.setFloat(p, "uGrainStrength", v.grainStrength);
    this.setFloat(p, "uEdgeStrength", v.edgeStrength);
    this.setFloat(p, "uTime", elapsed * 0.001);

    this.setVec3(p, "uPaperColor", v.paper[0], v.paper[1], v.paper[2]);
    this.setVec3(p, "uInkColor", v.ink[0], v.ink[1], v.ink[2]);
    // Ladder slots low -> high density. Uniform names keep their legacy
    // spot names (mint = lowest band, violet = highest); presets decide
    // which RGB sits in each slot via visuals.ladder.
    this.setVec3(p, "uSpotMint", v.ladder[0][0], v.ladder[0][1], v.ladder[0][2]);
    this.setVec3(p, "uSpotAmber", v.ladder[1][0], v.ladder[1][1], v.ladder[1][2]);
    this.setVec3(p, "uSpotRose", v.ladder[2][0], v.ladder[2][1], v.ladder[2][2]);
    this.setVec3(p, "uSpotViolet", v.ladder[3][0], v.ladder[3][1], v.ladder[3][2]);

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
    // gradient-subtract) and only paint the render pass so the canvas
    // shows paper + grain instead of WebGL's opaque-black default-clear
    // (the R3F Canvas is `alpha: false`). Splat queue drains on the
    // first started step so any buffered Work-card clicks during the
    // loader don't dump as a glitch when ambient kicks in.
    if (!this.started) {
      this.pendingSplats.length = 0;
      gl.bindVertexArray(state.emptyVAO);
      gl.disable(gl.BLEND);
      this.runRender(elapsed);
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
      // drag-trail can have distinct behaviour). splatCount > 1 throws
      // a scattered swarm per frame: position AND direction jitter,
      // otherwise N splats read as N parallel copies of one stroke.
      if (this.pointerSplatEnabled && (pointer.moved || pointer.down)) {
        const { splatCount, splatScatter } = this.visuals;
        for (let i = 0; i < splatCount; i++) {
          const color = this.splatColorOverride ?? this.nextSplatColor();
          const jx = (Math.random() - 0.5) * 2 * splatScatter;
          const jy = (Math.random() - 0.5) * 2 * splatScatter;
          const jdx = pointer.dx + (Math.random() - 0.5) * splatScatter * 0.8;
          const jdy = pointer.dy + (Math.random() - 0.5) * splatScatter * 0.8;
          this.runSplat(pointer.x + jx, pointer.y + jy, jdx, jdy, color);
        }
      }

      // Drain external splats queued via injectSplat() — Work-card click
      // bursts land here on the next step after dispatch.
      if (this.pendingSplats.length > 0) {
        for (const s of this.pendingSplats) {
          this.runSplat(s.x, s.y, s.dx, s.dy, s.color, s.radius);
        }
        this.pendingSplats.length = 0;
      }

      // Ambient motion when idle — wandering points for an organic,
      // breathing feel like layered Riso ink settling. Presets control
      // how many points run (ambientPointCount) and whether the extras
      // cycle in and out of existence (ambientChurn) — the swarm
      // presets keep their many-sources character while idle, not just
      // under the pointer. Studio mode disables this entirely.
      if (this.ambientEnabled && this.ambientStrength > 0.01) {
        // Preset multipliers: time scales the whole rig's wander speed,
        // force scales injection strength — but NOT `s` itself, so the
        // point-C gate below keeps its ambient-strength semantics.
        const t = elapsed * AMBIENT_TIME_SCALE * this.visuals.ambientTimeScale;
        const s = this.ambientStrength;
        const fs = this.visuals.ambientForceScale;
        const churn = this.visuals.ambientChurn;
        const count = Math.min(this.visuals.ambientPointCount, AMBIENT_POINTS.length);

        for (let i = 0; i < count; i++) {
          // Safe: i < count <= AMBIENT_POINTS.length
          const pt = AMBIENT_POINTS[i] as AmbientPoint;

          // Legacy point-C gate: appears only at full ambient strength
          // (i.e. vanishes while the pointer is active).
          let pointS = s;
          if (pt.gateThreshold !== undefined) {
            if (s <= pt.gateThreshold) continue;
            pointS = s - pt.gateThreshold;
          }

          // Churn life cycle: points beyond A/B fade in and out on a
          // slow personal sine (period ~10-20s, staggered phases), so
          // sources visibly despawn and respawn instead of running a
          // constant roster. A/B stay alive as the rig's base pulse.
          let life = 1;
          if (churn > 0 && i >= 2) {
            const cyc = Math.sin(elapsed * 0.001 * pt.lifeFreq + pt.lifePhase);
            // Duty cycle ~2/3 on: fades span ~0.5 of a sine unit.
            const edge0 = -0.4;
            const edge1 = 0.1;
            const gate = Math.min(1, Math.max(0, (cyc - edge0) / (edge1 - edge0)));
            life = 1 - churn + churn * gate * gate * (3 - 2 * gate);
            if (life < 0.04) continue;
          }

          const x = pt.center[0] + pt.range * Math.sin(t * pt.freqX + pt.phaseX);
          const y = pt.center[1] + pt.range * Math.cos(t * pt.freqY + pt.phaseY);
          const dx =
            Math.cos(t * pt.forceFreqX + pt.phaseFX) * pointS * fs * pt.forceStrength * life;
          const dy =
            Math.sin(t * pt.forceFreqY + pt.phaseFY) * pointS * fs * pt.forceStrength * life;
          this.runSplat(x, y, dx, dy, this.nextSplatColor(), undefined, life);
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

    // The render pass always runs (even at half-rate)
    this.runRender(elapsed);

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
