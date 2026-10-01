"use client";

// Per-photo ink-reveal mask.
// The photo lives in the DOM as a clean <picture>; this component
// renders an opaque paper-coloured mask <canvas> over it, then
// dissolves the mask via a small advect+splat fluid sim:
//   1. One strong centre splat when the slot enters viewport, then
//      tiny re-injection splats every ~120ms to keep the centre
//      saturated as the wave propagates outward.
//   2. The advect shader's radial-velocity term carries the centre
//      density toward the edges (curl alone wouldn't — it just swirls).
//   3. Ongoing pointer-velocity splats from the global cursor while
//      the slot is in viewport (ambient flow that ties Photography
//      semantically to the hero fluid sim).
//
// Once the reveal duration has elapsed the mask locks, opacity snaps
// to 0 and RAF unsubscribes. No GPU work after that.
//
// Full mode allocates only when visible, allowing a brief cursor wake before
// the centre-triggered reveal. Pre-reveal work sleeps after pointer inactivity.
// Completion unmounts the canvas and releases all resources permanently.
//
// Reduced motion: the mask canvas is not mounted at all — the photo
// is rendered directly.
//
// StrictMode safety: do NOT call loseContext() in cleanup (lesson from
// the Phase 9 PhotoDuotone iteration — a lost context returned by a
// second-mount getContext() silently fails every shader compile).

import { useEffect, useRef, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getSimPreset } from "@/lib/content/simPresets";
import { compileShader } from "@/lib/gl/compileShader";
import { DEFAULT_FLUID_VISUALS, type RGB } from "@/lib/gl/fluidOrchestrator";
import { PAPER_COLOR, SPOT_RGB, type SpotColor } from "@/lib/palette";
import { MAX_DT_S, subscribe } from "@/lib/raf";
import { useSimPresetStore } from "@/lib/simPresetStore";
import quadVertSrc from "@/shaders/common/quad.vert.glsl";
import advectFragSrc from "@/shaders/ink-mask/advect.frag.glsl";
import maskFragSrc from "@/shaders/ink-mask/mask.frag.glsl";
import splatFragSrc from "@/shaders/ink-mask/splat.frag.glsl";

// Re-export so `Photography.tsx`'s `import { type SpotColor } from
// "@/components/scene/PhotoInkMask"` keeps working — the canonical
// definition now lives in `@/lib/palette` but the prop-side import
// stays component-local for readability.
export type { SpotColor };

// Theme-following mask colors. The per-photo spot prop maps onto the
// active preset's 4-slot ladder (the slot order IS the legacy spot
// order — same convention as the fluid render uniforms), and the mask
// paper mirrors the preset's sim paper. Gate: only when the page
// actually wears a sim theme (`data-sim-theme` set by SimThemeSync);
// on the static tier the attribute never lands, so the mask stays
// canonical and coherent with the untinted page.
const SPOT_LADDER_SLOT: Record<SpotColor, 0 | 1 | 2 | 3> = {
  mint: 0,
  amber: 1,
  rose: 2,
  violet: 3,
};

function activeMaskColors(spot: SpotColor): { paper: RGB; ink: RGB } {
  if (document.documentElement.dataset.simTheme === undefined) {
    return { paper: PAPER_COLOR, ink: SPOT_RGB[spot] };
  }
  const preset = getSimPreset(useSimPresetStore.getState().presetId);
  const visuals = { ...DEFAULT_FLUID_VISUALS, ...preset.visuals };
  return { paper: visuals.paper, ink: visuals.ladder[SPOT_LADDER_SLOT[spot]] };
}

const DENSITY_RES = 256;
// Total reveal duration. The wavefront covers ~0.5 texture units of
// distance in ~1.7s at the peak outward speed below; the full window
// gives the curl noise + dissipation time to settle the boundary.
const REVEAL_DURATION_MS = 3000;
// Centre re-injection cadence. Without this the centre slowly drains
// (dissipation 0.998/frame); cheap re-injections keep d ≈ 1.0 there.
const REINJECT_INTERVAL_MS = 120;
// Centre fade-in: spreads the initial density build-up across
// multiple frames so the ink swells in instead of popping in.
// 12 frames at the mask's 30Hz budget take approximately 400ms.
const FADE_IN_SPLATS = 12;
const FADE_IN_PEAK_STRENGTH = 0.07;
// Outward radial-velocity peak (texture units / sec). Tuned against
// REVEAL_DURATION_MS so the wavefront just reaches the corners with
// enough headroom for the boundary to settle (smoothstep cutoff 0.85).
const OUTWARD_SPEED_PEAK = 0.45;
// Cap ambient pointer splats drained per frame — a fast cursor sweep
// can emit 50+ pointermoves between RAF ticks, and draining all of
// them in one tick spikes the frame.
const AMBIENT_DRAIN_PER_FRAME = 2;
const MASK_FRAME_MS = 1000 / 30;
const AMBIENT_SETTLE_MS = 750;
const MASK_PIXEL_BUDGET = 450000;

type PhotoInkMaskProps = {
  spotColor: SpotColor;
  className?: string;
  /** Set true once the slot has entered the viewport — triggers the
   * scripted reveal-burst once. Subsequent toggles are ignored. */
  reveal: boolean;
};

// Soft-failure wrapper around the shared compileShader helper. The mount
// effect bails on the first null without crashing the page (covers
// initialisation in environments without WebGL2 or with broken drivers);
// the shared helper itself throws on failure.
function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  try {
    return compileShader(gl, type, src, "ink-mask");
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: shader compile failure is a dev signal
    console.error(err);
    return null;
  }
}

function link(
  gl: WebGL2RenderingContext,
  vert: WebGLShader,
  frag: WebGLShader,
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    // biome-ignore lint/suspicious/noConsole: link failure is a dev signal
    console.error("ink-mask link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

type FBO = { tex: WebGLTexture; fb: WebGLFramebuffer };

function makeFBO(gl: WebGL2RenderingContext, w: number, h: number): FBO | null {
  const tex = gl.createTexture();
  const fb = gl.createFramebuffer();
  if (!tex || !fb) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb };
}

type Splat = {
  x: number; // 0..1 across mask
  y: number; // 0..1 (gl coords; 0 = bottom)
  radius: number; // texture-space sigma
  strength: number; // peak ink addition
};

// Outward-speed schedule: ramps up over the first 25% of the reveal,
// holds at peak through the middle, tapers back to 0 over the last
// 30%. Returns texture-units / second.
function outwardSpeedAt(progress: number): number {
  if (progress < 0.25) return (progress / 0.25) * OUTWARD_SPEED_PEAK;
  if (progress < 0.7) return OUTWARD_SPEED_PEAK;
  if (progress < 1.0) return (1.0 - (progress - 0.7) / 0.3) * OUTWARD_SPEED_PEAK;
  return 0;
}

export function PhotoInkMask({ spotColor, className, reveal }: PhotoInkMaskProps) {
  const reducedMotion = useReducedMotion();
  const { effectsReduced } = useScene();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settled, setSettled] = useState(false);
  const [activated, setActivated] = useState(false);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  // spotColor flows through a ref so changing it doesn't tear down the
  // WebGL context and re-init the sim. In practice the prop is fixed per
  // slide; the ref pattern future-proofs against ever wanting to swap
  // colour mid-reveal.
  const spotColorRef = useRef(spotColor);
  spotColorRef.current = spotColor;

  useEffect(() => {
    if (reducedMotion || effectsReduced) {
      if (activated) setActivated(false);
      return;
    }
    if (settled || activated) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setActivated(true);
      observer.disconnect();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [reducedMotion, effectsReduced, settled, activated]);

  useEffect(() => {
    if (reducedMotion || effectsReduced || !activated || settled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let context: WebGL2RenderingContext | null;
    try {
      context = canvas.getContext("webgl2", {
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        // Match the hero R3F Canvas's GPU preference on hybrid laptops.
        powerPreference: "high-performance",
      });
    } catch {
      setSettled(true);
      return;
    }
    const gl = context;
    if (!gl) {
      setSettled(true);
      return;
    }
    const onContextLost = (event: Event) => {
      event.preventDefault();
      canvas.style.backgroundColor = "transparent";
      canvas.style.opacity = "0";
      setSettled(true);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    // Resource tracking — every GL handle allocated below registers
    // here so the catch block can release them on partial-init failure.
    // Without this, an EXT_color_buffer_float-less browser (or a
    // shader-compile failure mid-setup) would leak everything up to the
    // failure point, which on Iris Xe × 5 photo slides adds up fast.
    const shaders: WebGLShader[] = [];
    const programs: WebGLProgram[] = [];
    const framebuffers: WebGLFramebuffer[] = [];
    const textures: WebGLTexture[] = [];
    const vaos: WebGLVertexArrayObject[] = [];

    let vert: WebGLShader;
    let advectFrag: WebGLShader;
    let splatFrag: WebGLShader;
    let maskFrag: WebGLShader;
    let advectProg: WebGLProgram;
    let splatProg: WebGLProgram;
    let maskProg: WebGLProgram;
    let vao: WebGLVertexArrayObject;
    let read: FBO;
    let write: FBO;

    try {
      // Compile programs
      const v = compile(gl, gl.VERTEX_SHADER, quadVertSrc);
      if (!v) throw new Error("ink-mask vert compile failed");
      vert = v;
      shaders.push(vert);
      const af = compile(gl, gl.FRAGMENT_SHADER, advectFragSrc);
      const sf = compile(gl, gl.FRAGMENT_SHADER, splatFragSrc);
      const mf = compile(gl, gl.FRAGMENT_SHADER, maskFragSrc);
      if (!af || !sf || !mf) throw new Error("ink-mask frag compile failed");
      advectFrag = af;
      splatFrag = sf;
      maskFrag = mf;
      shaders.push(advectFrag, splatFrag, maskFrag);

      const ap = link(gl, vert, advectFrag);
      const sp = link(gl, vert, splatFrag);
      const mp = link(gl, vert, maskFrag);
      if (!ap || !sp || !mp) throw new Error("ink-mask link failed");
      advectProg = ap;
      splatProg = sp;
      maskProg = mp;
      programs.push(advectProg, splatProg, maskProg);

      // Empty VAO — quad.vert builds the fullscreen triangle from gl_VertexID.
      const v2 = gl.createVertexArray();
      if (!v2) throw new Error("ink-mask VAO create failed");
      vao = v2;
      vaos.push(vao);
      gl.bindVertexArray(vao);

      // Density ping-pong FBOs
      const r = makeFBO(gl, DENSITY_RES, DENSITY_RES);
      const w = makeFBO(gl, DENSITY_RES, DENSITY_RES);
      if (!r || !w) throw new Error("ink-mask FBO create failed");
      read = r;
      write = w;
      framebuffers.push(read.fb, write.fb);
      textures.push(read.tex, write.tex);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: init failure is a dev signal
      console.error("[PhotoInkMask]", err);
      for (const s of shaders) gl.deleteShader(s);
      for (const p of programs) gl.deleteProgram(p);
      for (const fb of framebuffers) gl.deleteFramebuffer(fb);
      for (const tex of textures) gl.deleteTexture(tex);
      for (const v of vaos) gl.deleteVertexArray(v);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      setSettled(true);
      return;
    }
    // Initialise both to zero (the FBO factory leaves them undefined)
    gl.bindFramebuffer(gl.FRAMEBUFFER, read.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    let needsMaskPaint = false;
    // The mask is transient decoration. Bound output pixels independently of
    // DPR so a large photograph cannot allocate a full Retina-sized canvas.
    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const scale = Math.min(1, Math.sqrt(MASK_PIXEL_BUDGET / (width * height)));
      const w = Math.max(1, Math.floor(width * scale));
      const h = Math.max(1, Math.floor(height * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        needsMaskPaint = true;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Reveal-clock state
    let burstStart: number | null = null;
    let lastReinjectAt = 0;
    // Counter for the centre fade-in phase: replaces the original
    // single-frame strength:0.85 splat (which felt like an instant
    // pop) with FADE_IN_SPLATS small per-frame splats that ramp the
    // centre density gradually over ~400ms.
    let fadeInSplatsFired = 0;
    // `locked` declared here (above the pointermove listener that closes
    // over it) so the read order matches the write order — earlier this
    // sat below `addEventListener` and worked only by closure-capture.
    let locked = false;
    // Pre-reveal: cursor-driven ambient ink should still flow through
    // the mask whenever the photo is visible (lets the user "preview"
    // the photo through the cursor's wake before the centre-cross
    // burst). Tracked via an IntersectionObserver below; ambient sim
    // tick + pointer accept gate on this.
    let inViewport = false;

    // Ambient splat queue (driven by global pointer-velocity)
    const ambientQueue: Splat[] = [];
    let lastAmbientAt = Number.NEGATIVE_INFINITY;
    let accumulatedMs = 0;
    const unsubscribePreset = useSimPresetStore.subscribe(() => {
      needsMaskPaint = true;
    });

    // ---------- uniform locations ----------
    const advectU = {
      density: gl.getUniformLocation(advectProg, "uDensity"),
      texelSize: gl.getUniformLocation(advectProg, "uTexelSize"),
      dt: gl.getUniformLocation(advectProg, "uDt"),
      time: gl.getUniformLocation(advectProg, "uTime"),
      dissipation: gl.getUniformLocation(advectProg, "uDissipation"),
      outwardSpeed: gl.getUniformLocation(advectProg, "uOutwardSpeed"),
    };
    const splatU = {
      density: gl.getUniformLocation(splatProg, "uDensity"),
      point: gl.getUniformLocation(splatProg, "uPoint"),
      radius: gl.getUniformLocation(splatProg, "uRadius"),
      strength: gl.getUniformLocation(splatProg, "uStrength"),
    };
    const maskU = {
      density: gl.getUniformLocation(maskProg, "uDensity"),
      resolution: gl.getUniformLocation(maskProg, "uResolution"),
      paper: gl.getUniformLocation(maskProg, "uPaperColor"),
      spot: gl.getUniformLocation(maskProg, "uSpotColor"),
      time: gl.getUniformLocation(maskProg, "uTime"),
    };

    // Pointer-velocity → ambient splats. Listens to the document so
    // the global cursor that drives the hero fluid also bleeds ink
    // into the photo masks while the slot is in viewport.
    //
    // Active whenever the photo is visible — pre-reveal the splats
    // bleed transparency into the otherwise-opaque mask (cursor "peeks"
    // at the photo through the ink wake), post-reveal they're already
    // running into a near-transparent mask so they read as ambient
    // residue. Stops at `locked = true`.
    const onPointer = (e: PointerEvent) => {
      if (locked || !inViewport || document.hidden) return;
      if (e.target instanceof Element && e.target.closest("[data-no-splat]")) return;
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        return;
      const x = (e.clientX - rect.left) / rect.width;
      // Flip Y: canvas client coords go top→bottom, GL/UV is bottom→top.
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      if (ambientQueue.length >= AMBIENT_DRAIN_PER_FRAME) ambientQueue.shift();
      ambientQueue.push({ x, y, radius: 0.06, strength: 0.18 });
      lastAmbientAt = performance.now();
    };
    document.addEventListener("pointermove", onPointer, { passive: true });

    // Viewport-visibility tracker. Threshold 0 fires on any single-pixel
    // intersection — that's when ambient ink should start flowing. When
    // the photo leaves the viewport we drop the queue so a long-distance
    // cursor sweep doesn't dump a backlog the next time we scroll back.
    const visIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inViewport = entry.isIntersecting;
          if (!entry.isIntersecting) ambientQueue.length = 0;
        }
      },
      { threshold: 0 },
    );
    visIO.observe(canvas);

    const drawTo = (
      program: WebGLProgram,
      target: WebGLFramebuffer | null,
      w: number,
      h: number,
    ) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.viewport(0, 0, w, h);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL gl.useProgram (false-positive on use* names)
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const runAdvect = (dt: number, time: number, outwardSpeed: number) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read?.tex ?? null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(advectProg);
      gl.uniform1i(advectU.density, 0);
      gl.uniform2f(advectU.texelSize, 1 / DENSITY_RES, 1 / DENSITY_RES);
      gl.uniform1f(advectU.dt, dt);
      gl.uniform1f(advectU.time, time);
      gl.uniform1f(advectU.dissipation, 0.998);
      gl.uniform1f(advectU.outwardSpeed, outwardSpeed);
      drawTo(advectProg, write?.fb ?? null, DENSITY_RES, DENSITY_RES);
      const tmp = read;
      read = write;
      write = tmp;
    };

    const runSplat = (s: Splat) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read?.tex ?? null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(splatProg);
      gl.uniform1i(splatU.density, 0);
      gl.uniform2f(splatU.point, s.x, s.y);
      gl.uniform1f(splatU.radius, s.radius);
      gl.uniform1f(splatU.strength, s.strength);
      drawTo(splatProg, write?.fb ?? null, DENSITY_RES, DENSITY_RES);
      const tmp = read;
      read = write;
      write = tmp;
    };

    const runMask = (time: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read?.tex ?? null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(maskProg);
      gl.uniform1i(maskU.density, 0);
      gl.uniform2f(maskU.resolution, canvas.width, canvas.height);
      // Read per frame so a preset switch re-tints the mask live —
      // store read + object spread are trivial next to the GL work.
      const { paper, ink } = activeMaskColors(spotColorRef.current);
      gl.uniform3f(maskU.paper, ...(paper as [number, number, number]));
      gl.uniform3f(maskU.spot, ...(ink as [number, number, number]));
      gl.uniform1f(maskU.time, time);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    };

    // Initial paint: render the paper-color mask once before any
    // simulation runs so the photo is covered while we idle waiting
    // for the IO-driven `reveal` flip. Density is zero everywhere →
    // mask alpha is 1.0 → fully opaque paper.
    runMask(0);
    needsMaskPaint = false;
    // Replace the cheap pre-reveal paper cover only after GL has painted
    // the same paper. Transparent mask pixels can now reveal the photograph.
    canvas.style.backgroundColor = "transparent";

    const unsub = subscribe((deltaMs, elapsedMs) => {
      if (locked || document.hidden) return;
      const now = performance.now();
      // The reveal is a wall-clock deadline, independent of ticker lag
      // smoothing and the capped simulation dt. On a slow GPU or after a
      // background-tab pause, reveal the photo before submitting more work.
      if (burstStart !== null && now - burstStart >= REVEAL_DURATION_MS) {
        locked = true;
        canvas.style.opacity = "0";
        setSettled(true);
        document.removeEventListener("pointermove", onPointer);
        visIO.disconnect();
        ambientQueue.length = 0;
        unsub();
        return;
      }

      // Simulation pauses offscreen; an already-started reveal can still
      // reach its deadline above and release its resources.
      if (!inViewport) return;

      // Before the one-shot reveal, only actual pointer work wakes the mask.
      // Theme changes need one repaint; idle/offscreen photos submit no draws.
      if (!revealRef.current && now - lastAmbientAt > AMBIENT_SETTLE_MS) {
        accumulatedMs = 0;
        if (needsMaskPaint) {
          runMask(elapsedMs * 0.001);
          needsMaskPaint = false;
        }
        return;
      }
      accumulatedMs += Math.min(deltaMs, 50);
      if (accumulatedMs < MASK_FRAME_MS) return;
      const frameDelta = accumulatedMs;
      accumulatedMs %= MASK_FRAME_MS;

      // First reveal-true frame: anchor the clock. NO instant splat —
      // the FADE_IN_SPLATS phase below builds the centre density
      // gradually over the first ~400ms, replacing the previous
      // single-frame strength:0.85 splat that felt like an instant
      // pop.
      if (revealRef.current && burstStart === null) {
        burstStart = now;
        lastReinjectAt = elapsedMs;
        fadeInSplatsFired = 0;
      }

      // Reveal progress 0..1 (0 while we're in pre-reveal ambient).
      const t = burstStart === null ? 0 : now - burstStart;
      const progress = Math.min(t / REVEAL_DURATION_MS, 1.0);

      // Advect with current outward-velocity ramp. Outside the reveal
      // burst the speed is 0 — the curl-noise term in the shader still
      // swirls density gently, so cursor wakes drift instead of staying
      // pinned in place.
      const dt = Math.min(frameDelta * 0.001, MAX_DT_S);
      runAdvect(dt, elapsedMs * 0.001, outwardSpeedAt(progress));

      // Fade-in phase: tiny per-frame splats with linearly-growing
      // strength build the centre density smoothly from 0 → ~0.9 over
      // the first ~400ms. The advection's outward speed is also still
      // ramping (0..25%) so the ink visibly swells out as it fills in.
      if (burstStart !== null && fadeInSplatsFired < FADE_IN_SPLATS) {
        const f = fadeInSplatsFired / FADE_IN_SPLATS;
        // Ease-out curve: starts very subtle, accelerates toward the
        // tail of the fade-in so the transition into the steady-state
        // re-injection is seamless.
        const strength = FADE_IN_PEAK_STRENGTH * (0.4 + 0.6 * f * f);
        runSplat({ x: 0.5, y: 0.5, radius: 0.18, strength });
        fadeInSplatsFired++;
        lastReinjectAt = elapsedMs;
      }

      // Centre re-injection — only AFTER fade-in completes and during
      // the reveal burst window. Radial advection drains the centre
      // as density transports outward; we drip small splats back in
      // through the first ~85% of the reveal to keep d ≈ 1.0 there.
      if (
        burstStart !== null &&
        fadeInSplatsFired >= FADE_IN_SPLATS &&
        progress < 0.85 &&
        elapsedMs - lastReinjectAt >= REINJECT_INTERVAL_MS
      ) {
        runSplat({ x: 0.5, y: 0.5, radius: 0.12, strength: 0.18 });
        lastReinjectAt = elapsedMs;
      }

      // Drain ambient pointer-velocity splats — capped per frame to
      // prevent fast cursor sweeps (50+ pointermoves between ticks)
      // from spiking the frame budget. Older queued splats drop.
      let drained = 0;
      while (drained < AMBIENT_DRAIN_PER_FRAME) {
        const s = ambientQueue.shift();
        if (!s) break;
        runSplat(s);
        drained++;
      }
      if (ambientQueue.length > AMBIENT_DRAIN_PER_FRAME * 2) ambientQueue.length = 0;

      runMask(elapsedMs * 0.001);
      needsMaskPaint = false;
    }, 70);

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      unsub();
      unsubscribePreset();
      ro.disconnect();
      visIO.disconnect();
      document.removeEventListener("pointermove", onPointer);
      gl.deleteProgram(advectProg);
      gl.deleteProgram(splatProg);
      gl.deleteProgram(maskProg);
      gl.deleteShader(vert);
      gl.deleteShader(advectFrag);
      gl.deleteShader(splatFrag);
      gl.deleteShader(maskFrag);
      gl.deleteVertexArray(vao);
      if (read) {
        gl.deleteTexture(read.tex);
        gl.deleteFramebuffer(read.fb);
      }
      if (write) {
        gl.deleteTexture(write.tex);
        gl.deleteFramebuffer(write.fb);
      }
      // No loseContext() — see comment on equivalent path in the
      // legacy PhotoDuotone iteration (StrictMode trap).
    };
    // spotColor intentionally NOT a dep — it flows through spotColorRef
    // so changes don't tear down the WebGL context. See ref declaration
    // at the top of the component.
  }, [reducedMotion, effectsReduced, activated, settled]);

  if (reducedMotion || effectsReduced || settled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        backgroundColor: "var(--color-paper)",
      }}
    />
  );
}
