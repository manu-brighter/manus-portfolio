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
// Idle until reveal: the RAF callback early-returns (no GPU work)
// until the parent flips `reveal` to true. A single initial mask draw
// covers the photo in paper-color while we wait.
//
// Reduced motion: the mask canvas is not mounted at all — the photo
// is rendered directly.
//
// StrictMode safety: do NOT call loseContext() in cleanup (lesson from
// the Phase 9 PhotoDuotone iteration — a lost context returned by a
// second-mount getContext() silently fails every shader compile).

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { subscribe } from "@/lib/raf";
import quadVertSrc from "@/shaders/common/quad.vert.glsl";
import advectFragSrc from "@/shaders/ink-mask/advect.frag.glsl";
import maskFragSrc from "@/shaders/ink-mask/mask.frag.glsl";
import splatFragSrc from "@/shaders/ink-mask/splat.frag.glsl";

const PAPER_COLOR: [number, number, number] = [0.941, 0.91, 0.863];
const SPOT_COLORS = {
  rose: [1.0, 0.42, 0.627],
  amber: [1.0, 0.769, 0.455],
  mint: [0.486, 0.91, 0.769],
  violet: [0.722, 0.604, 1.0],
} as const;

export type SpotColor = keyof typeof SPOT_COLORS;

const DENSITY_RES = 256;
// Total reveal duration. The wavefront covers ~0.5 texture units of
// distance in ~1.7s at the peak outward speed below; the full window
// gives the curl noise + dissipation time to settle the boundary.
const REVEAL_DURATION_MS = 3000;
// Centre re-injection cadence. Without this the centre slowly drains
// (dissipation 0.998/frame); cheap re-injections keep d ≈ 1.0 there.
const REINJECT_INTERVAL_MS = 120;
// Outward radial-velocity peak (texture units / sec). Tuned against
// REVEAL_DURATION_MS so the wavefront just reaches the corners with
// enough headroom for the boundary to settle (smoothstep cutoff 0.85).
const OUTWARD_SPEED_PEAK = 0.45;
// Cap ambient pointer splats drained per frame — a fast cursor sweep
// can emit 50+ pointermoves between RAF ticks, and draining all of
// them in one tick spikes the frame.
const AMBIENT_DRAIN_PER_FRAME = 4;

type PhotoInkMaskProps = {
  spotColor: SpotColor;
  className?: string;
  /** Set true once the slot has entered the viewport — triggers the
   * scripted reveal-burst once. Subsequent toggles are ignored. */
  reveal: boolean;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  // Some loaders (Turbopack raw-loader) preserve a leading newline
  // before #version; normalise so the directive is always line 1.
  const stripped = src.replace(/^[\s﻿]*#version[^\n]*\r?\n?/m, "");
  gl.shaderSource(shader, `#version 300 es\n${stripped}`);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // biome-ignore lint/suspicious/noConsole: shader compile failure is a dev signal
    console.error("ink-mask shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      // Match the hero R3F Canvas's "high-performance" hint so we don't
      // ping-pong between integrated/discrete GPUs on hybrid laptops.
      powerPreference: "high-performance",
    }) as WebGL2RenderingContext | null;
    if (!gl) return;

    // Compile programs
    const vert = compile(gl, gl.VERTEX_SHADER, quadVertSrc);
    if (!vert) return;
    const advectFrag = compile(gl, gl.FRAGMENT_SHADER, advectFragSrc);
    const splatFrag = compile(gl, gl.FRAGMENT_SHADER, splatFragSrc);
    const maskFrag = compile(gl, gl.FRAGMENT_SHADER, maskFragSrc);
    if (!advectFrag || !splatFrag || !maskFrag) return;

    const advectProg = link(gl, vert, advectFrag);
    const splatProg = link(gl, vert, splatFrag);
    const maskProg = link(gl, vert, maskFrag);
    if (!advectProg || !splatProg || !maskProg) return;

    // Empty VAO — quad.vert builds the fullscreen triangle from gl_VertexID.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Density ping-pong FBOs
    let read = makeFBO(gl, DENSITY_RES, DENSITY_RES);
    let write = makeFBO(gl, DENSITY_RES, DENSITY_RES);
    if (!read || !write) return;
    // Initialise both to zero (the FBO factory leaves them undefined)
    gl.bindFramebuffer(gl.FRAMEBUFFER, read.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Resize canvas backing store to its CSS size × DPR (capped at 2)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Reveal-clock state
    let burstStart: number | null = null;
    let lastReinjectAt = 0;

    // Ambient splat queue (driven by global pointer-velocity)
    const ambientQueue: Splat[] = [];

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
    // into the photo masks while the slot is in viewport. Threshold
    // gates noise.
    const onPointer = (e: PointerEvent) => {
      if (!revealRef.current || locked) return;
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
      ambientQueue.push({ x, y, radius: 0.06, strength: 0.18 });
    };
    document.addEventListener("pointermove", onPointer, { passive: true });

    let locked = false;

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
      gl.uniform3f(maskU.paper, ...PAPER_COLOR);
      gl.uniform3f(maskU.spot, ...(SPOT_COLORS[spotColor] as [number, number, number]));
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

    const unsub = subscribe((deltaMs, elapsedMs) => {
      if (locked) return;

      // Idle: no GPU work until the parent flips `reveal` true.
      if (!revealRef.current && burstStart === null) return;

      // First reveal-true frame: anchor the clock and fire one strong
      // centre splat — the "clean free splat in the middle" that the
      // outward velocity field will then carry to the edges.
      if (revealRef.current && burstStart === null) {
        burstStart = elapsedMs;
        runSplat({ x: 0.5, y: 0.5, radius: 0.18, strength: 0.85 });
        lastReinjectAt = elapsedMs;
      }

      // Reveal progress 0..1
      const t = burstStart === null ? 0 : elapsedMs - burstStart;
      const progress = Math.min(t / REVEAL_DURATION_MS, 1.0);

      // Advect with current outward-velocity ramp
      const dt = Math.min(deltaMs * 0.001, 0.033);
      runAdvect(dt, elapsedMs * 0.001, outwardSpeedAt(progress));

      // Centre re-injection — radial advection drains the centre as
      // density transports outward, so we drip small splats back in
      // through the first ~85% of the reveal to keep d ≈ 1.0 there.
      // After that the wavefront has reached the edges; further
      // injection would just delay the final fade.
      if (progress < 0.85 && elapsedMs - lastReinjectAt >= REINJECT_INTERVAL_MS) {
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

      // Reveal complete: snap to opacity 0 (the mask shader output is
      // already ~98% transparent everywhere by this point — the snap
      // is imperceptible and guards against compositor edge-cases).
      if (progress >= 1.0) {
        locked = true;
        canvas.style.opacity = "0";
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        unsub();
      }
    }, 70);

    return () => {
      unsub();
      ro.disconnect();
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
  }, [reducedMotion, spotColor]);

  if (reducedMotion) return null;

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
      }}
    />
  );
}
