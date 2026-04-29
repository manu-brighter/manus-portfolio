"use client";

// Per-photo ink-reveal mask.
// The photo lives in the DOM as a clean <picture>; this component
// renders an opaque paper-coloured mask <canvas> over it, then
// dissolves the mask via a small advect-only fluid sim driven by:
//   1. A scripted splat-burst when the slot enters viewport
//      (the reveal animation)
//   2. Ongoing pointer-velocity splats from the global cursor while
//      the slot is in viewport (ambient flow that ties Photography
//      semantically to the hero fluid sim)
//
// Once enough density has accumulated to fully reveal the photo, the
// mask locks transparent + RAF unsubscribes. No GPU work after that.
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
// Time after the last burst splat fires at which we start the fade-out.
// We used to gl.readPixels() the centre to confirm coverage, but every
// readback stalls the WebGL pipeline (Chrome surfaces this as
// "GPU stall due to ReadPixels"). The burst is fully scripted and the
// advection is deterministic-enough that timing is sufficient — by
// ~600ms after the last splat the outer ring has spread across the frame.
const POST_BURST_GRACE_MS = 600;

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
  fireAt: number; // ms from start of reveal
};

// Scripted burst: a fast cluster around the centre, then 3-4 satellite
// splats nudged off-axis. Total ~1.6s. The randomisation lives in the
// component, not here, so each photo's burst is unique-but-deterministic
// across renders (seeded per photo via a hash of the className).
function buildBurst(seed: number): Splat[] {
  const rng = (n: number) => {
    const x = Math.sin(seed + n * 13.13) * 43758.5453;
    return x - Math.floor(x);
  };
  const splats: Splat[] = [];
  // Initial centre splat
  splats.push({ x: 0.5, y: 0.5, radius: 0.18, strength: 0.55, fireAt: 0 });
  // Inner ring — three quick follow-ups, slightly off-centre
  for (let i = 0; i < 3; i++) {
    splats.push({
      x: 0.5 + (rng(i) - 0.5) * 0.4,
      y: 0.5 + (rng(i + 7) - 0.5) * 0.35,
      radius: 0.14 + rng(i + 11) * 0.05,
      strength: 0.4 + rng(i + 17) * 0.15,
      fireAt: 120 + i * 80,
    });
  }
  // Outer ring — slower, larger, cover the corners
  for (let i = 0; i < 5; i++) {
    splats.push({
      x: rng(i + 23),
      y: rng(i + 31),
      radius: 0.22 + rng(i + 41) * 0.08,
      strength: 0.35 + rng(i + 47) * 0.2,
      fireAt: 500 + i * 140,
    });
  }
  return splats;
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
      powerPreference: "low-power",
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

    // Burst seeded from current spotColor + a per-mount entropy seed
    const seed = SPOT_COLORS[spotColor][0] * 47.0 + Math.random() * 13.0;
    const burst = buildBurst(seed);
    let burstStart: number | null = null;
    let nextBurstIdx = 0;

    // Ambient splat queue (driven by global pointer-velocity)
    const ambientQueue: Splat[] = [];

    // ---------- uniform locations ----------
    const advectU = {
      density: gl.getUniformLocation(advectProg, "uDensity"),
      texelSize: gl.getUniformLocation(advectProg, "uTexelSize"),
      dt: gl.getUniformLocation(advectProg, "uDt"),
      time: gl.getUniformLocation(advectProg, "uTime"),
      dissipation: gl.getUniformLocation(advectProg, "uDissipation"),
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
      ambientQueue.push({ x, y, radius: 0.06, strength: 0.18, fireAt: 0 });
    };
    document.addEventListener("pointermove", onPointer, { passive: true });

    let locked = false;
    // Fade-out lifecycle: once the burst has fired and a grace period
    // has elapsed, we don't yank the canvas — we start a CSS opacity
    // fade and let the sim keep advecting underneath. Once the fade
    // completes we clear and unsub.
    const FADE_OUT_MS = 900;
    let fadeStartAt: number | null = null;

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

    const runAdvect = (dt: number, time: number) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read?.tex ?? null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(advectProg);
      gl.uniform1i(advectU.density, 0);
      gl.uniform2f(advectU.texelSize, 1 / DENSITY_RES, 1 / DENSITY_RES);
      gl.uniform1f(advectU.dt, dt);
      gl.uniform1f(advectU.time, time);
      gl.uniform1f(advectU.dissipation, 0.998);
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

    // Time the last scripted burst splat fires (relative to burstStart).
    // Used to schedule the fade-out — see Phase-9 deviation note about
    // dropping gl.readPixels-based coverage detection.
    const lastBurstFireAt = burst.length > 0 ? (burst[burst.length - 1]?.fireAt ?? 0) : 0;

    const unsub = subscribe((deltaMs, elapsedMs) => {
      if (locked) return;

      // Kick off the burst the first frame `reveal` is true.
      if (revealRef.current && burstStart === null) burstStart = elapsedMs;

      // Advect every frame so ambient splats have something to flow on
      const dt = Math.min(deltaMs * 0.001, 0.033);
      runAdvect(dt, elapsedMs * 0.001);

      // Fire scheduled burst splats whose fireAt has passed
      if (burstStart !== null) {
        const t = elapsedMs - burstStart;
        let next = burst[nextBurstIdx];
        while (next !== undefined && next.fireAt <= t) {
          runSplat(next);
          nextBurstIdx++;
          next = burst[nextBurstIdx];
        }
      }

      // Drain ambient pointer-velocity splats
      for (;;) {
        const s = ambientQueue.shift();
        if (!s) break;
        runSplat(s);
      }

      runMask(elapsedMs * 0.001);

      // Fade-trigger: once the burst is drained AND a grace period has
      // elapsed (so the outer ring has had time to advect outward),
      // kick off the CSS opacity fade. The sim keeps running
      // underneath, so the visual reads as "ink continues to flow
      // while the paper recedes" — never a hard cut.
      if (
        fadeStartAt === null &&
        burstStart !== null &&
        nextBurstIdx >= burst.length &&
        elapsedMs - burstStart >= lastBurstFireAt + POST_BURST_GRACE_MS
      ) {
        fadeStartAt = elapsedMs;
        canvas.style.transition = `opacity ${FADE_OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        canvas.style.opacity = "0";
      }

      // Fade complete → final transparent clear + unsub. RAF keeps
      // ticking the sim during the fade so eddies remain visible.
      if (fadeStartAt !== null && elapsedMs - fadeStartAt >= FADE_OUT_MS) {
        locked = true;
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
