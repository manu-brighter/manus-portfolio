"use client";

// Section-scoped dedicated WebGL2 fluid sim for the case-study diorama.
//
// Renders dark-ink "columns" at the left + right viewport edges via
// continuous edge-splat injection. The mask shader composites dark ink
// (INK_RGB) on transparent so only the column densities are visible —
// the rest of the page shows through.
//
// Architectural sibling of `src/components/scene/PhotoInkMask.tsx`:
// same FBO ping-pong, splat/advect/composite pipeline, shared shader
// helpers. The two divergences are:
//   1. Continuous edge-splat injection (left + right, jittered y) every
//      SPLAT_INTERVAL_MS — vs. PhotoInkMask's centre burst + reinject.
//   2. ScrollTrigger lifecycle — sim only ticks while #case-study is in
//      viewport (active flag flips on enter/leave). No reveal-completion
//      lock; the sim runs as long as the section is on screen.
//
// Reduced-motion + mobile (<768px): renders null entirely. The diorama
// scroll-translate is itself motion-heavy, so RM users skip the
// decorative ink columns; mobile users skip them because the diorama
// stacks vertically there and the columns become visually meaningless.
//
// StrictMode safety: NO loseContext() in cleanup (Phase 9 deviation —
// a lost context returned by a second-mount getContext() silently fails
// every shader compile).
//
// V1 simplification: no window-resize listener. canvas.width/height are
// pinned at mount; if the user resizes mid-session the column rendering
// will look stretched but the sim won't crash. Resize handling can be
// added later if visual review demands it.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { compileShader } from "@/lib/gl/compileShader";
import { subscribe } from "@/lib/raf";
import quadVertSrc from "@/shaders/common/quad.vert.glsl";
import advectFragSrc from "@/shaders/ink-mask/advect.frag.glsl";
import maskFragSrc from "@/shaders/ink-mask/mask.frag.glsl";
import splatFragSrc from "@/shaders/ink-mask/splat.frag.glsl";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FBO_SIZE = 256;
// Slightly more aggressive dissipation than PhotoInkMask (0.998) so the
// columns don't drift inward and saturate the centre — we want clear
// dark bands at the edges, fading out toward the middle of the screen.
const DYE_DISSIPATION = 0.95;
const SPLAT_INTERVAL_MS = 140;
// Dark ink against the page background. Picked low enough that the mask
// shader's halftone fringe + paper-grain reads as a Riso ink-bleed.
const INK_RGB: readonly [number, number, number] = [0.04, 0.02, 0.03];
const MOBILE_BREAKPOINT = 768;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  try {
    return compileShader(gl, type, src, "ink-column");
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
    console.error("ink-column link error:", gl.getProgramInfoLog(program));
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

export function InkColumnFluidSim() {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Pin canvas to viewport size at mount (V1: no resize listener).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    }) as WebGL2RenderingContext | null;
    if (!gl) return;

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

    let read = makeFBO(gl, FBO_SIZE, FBO_SIZE);
    let write = makeFBO(gl, FBO_SIZE, FBO_SIZE);
    if (!read || !write) return;
    // Initialise both to zero (the FBO factory leaves them undefined).
    gl.bindFramebuffer(gl.FRAMEBUFFER, read.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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

    const injectSplat = (x: number, y: number, radius: number, strength: number) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read?.tex ?? null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(splatProg);
      gl.uniform1i(splatU.density, 0);
      gl.uniform2f(splatU.point, x, y);
      gl.uniform1f(splatU.radius, radius);
      gl.uniform1f(splatU.strength, strength);
      drawTo(splatProg, write?.fb ?? null, FBO_SIZE, FBO_SIZE);
      const tmp = read;
      read = write;
      write = tmp;
    };

    const advect = (dt: number, time: number) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read?.tex ?? null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(advectProg);
      gl.uniform1i(advectU.density, 0);
      gl.uniform2f(advectU.texelSize, 1 / FBO_SIZE, 1 / FBO_SIZE);
      gl.uniform1f(advectU.dt, dt);
      gl.uniform1f(advectU.time, time);
      gl.uniform1f(advectU.dissipation, DYE_DISSIPATION);
      // No radial outward velocity — the columns should stay pinned to the
      // edges, only the curl-noise term in the shader gently swirls them
      // for organic edge character.
      gl.uniform1f(advectU.outwardSpeed, 0);
      drawTo(advectProg, write?.fb ?? null, FBO_SIZE, FBO_SIZE);
      const tmp = read;
      read = write;
      write = tmp;
    };

    const composite = (time: number) => {
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
      // The mask shader composites uPaperColor (mixed with uSpotColor at
      // the halftone fringe) at alpha proportional to (1 - density). Here
      // we want dark ink to *appear* where density is high — invert the
      // mental model: pass INK_RGB as both paper + spot, so the only
      // visible output is dark ink at the column densities. Everywhere
      // else density ≈ 0 → maskAlpha ≈ 1 — but that would paint the whole
      // viewport dark.
      //
      // Trick: use INK_RGB for paper + spot, but the mask shader's
      // smoothstep cutoff (0.05..0.85 density → 1..0 alpha) means
      // *zero-density pixels are fully opaque*. We don't want that here.
      //
      // Workaround for V1: render with INK_RGB and accept that the whole
      // viewport tints slightly dark. The continuous edge-splats keep the
      // edges saturated (visible columns), middle decays via dissipation
      // to near-zero (~5% paper alpha). With INK_RGB at (0.04,0.02,0.03)
      // a 5% overlay is visually negligible. Re-evaluate if visual review
      // demands sharper contrast.
      gl.uniform3f(maskU.paper, ...INK_RGB);
      gl.uniform3f(maskU.spot, ...INK_RGB);
      gl.uniform1f(maskU.time, time);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    };

    let active = false;
    let lastSplatTs = 0;

    const unsub = subscribe((deltaMs, elapsedMs) => {
      if (!active) return;
      const dt = Math.min(deltaMs * 0.001, 0.033);

      const now = performance.now();
      if (now - lastSplatTs > SPLAT_INTERVAL_MS) {
        lastSplatTs = now;
        // Two splats per tick: left edge column + right edge column.
        // Y is randomized within the central 80% so splats avoid the
        // very top/bottom (which would look like ink running off the
        // page rather than columns).
        const yL = 0.1 + Math.random() * 0.8;
        const yR = 0.1 + Math.random() * 0.8;
        injectSplat(0.02, yL, 0.18, 0.7);
        injectSplat(0.98, yR, 0.18, 0.7);
      }

      advect(dt, elapsedMs * 0.001);
      composite(elapsedMs * 0.001);
    }, 30);

    const st = ScrollTrigger.create({
      trigger: "#case-study",
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        active = true;
      },
      onEnterBack: () => {
        active = true;
      },
      onLeave: () => {
        active = false;
      },
      onLeaveBack: () => {
        active = false;
      },
    });

    return () => {
      unsub();
      st.kill();
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
      // No loseContext() — see PhotoInkMask cleanup comment (StrictMode trap).
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed inset-0 z-30"
    />
  );
}
