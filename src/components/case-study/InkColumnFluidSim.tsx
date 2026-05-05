"use client";

// Section-scoped dedicated WebGL2 fluid sim for the case-study diorama.
//
// Renders dark-ink "columns" at the left + right viewport edges via
// continuous edge-splat injection. Uses a dedicated column-mask shader
// (case-study-ink/column-mask.frag) that draws dark ink (INK_RGB) with
// alpha proportional to density — the inverse of ink-mask/mask.frag's
// paper-reveal contract. Result: dark ink visible only where the
// columns are, transparent elsewhere; the rest of the page shows through.
//
// Architectural sibling of `src/components/scene/PhotoInkMask.tsx`:
// same FBO ping-pong, splat/advect/composite pipeline, shared shader
// helpers. The two divergences are:
//   1. Continuous edge-splat injection (left + right, jittered y) every
//      SPLAT_INTERVAL_MS — vs. PhotoInkMask's centre burst + reinject.
//   2. ScrollTrigger lifecycle — WebGL resources are LAZY-allocated on
//      first onEnter and torn down on every onLeave (matches plan §5.1).
//      Eliminates GPU context pressure when the section is offscreen
//      and avoids test-suite contention with parallel browser contexts.
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
// pinned at GL-init; if the user resizes mid-session the column rendering
// will look stretched but the sim won't crash. Resize handling can be
// added later if visual review demands it.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { compileShader } from "@/lib/gl/compileShader";
import { subscribe } from "@/lib/raf";
import maskFragSrc from "@/shaders/case-study-ink/column-mask.frag.glsl";
import quadVertSrc from "@/shaders/common/quad.vert.glsl";
import advectFragSrc from "@/shaders/ink-mask/advect.frag.glsl";
import splatFragSrc from "@/shaders/ink-mask/splat.frag.glsl";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// FBO short-edge fixed; the long edge scales to match canvas aspect
// ratio so splats produced as circles in FBO uv-space render as
// circles (not stretched ovals) when composited back to the canvas.
const FBO_SHORT_EDGE = 256;
// Aggressive per-frame dissipation keeps the columns visually pinned
// to the edges — without fast decay the curl-noise advection drifts
// dye toward the centre and the columns read as a thick black blob
// bleeding into the diorama. Compensated by tighter splat radius +
// higher strength + denser SPLAT_INTERVAL_MS so the columns still
// look continuous despite the rapid decay.
const DYE_DISSIPATION = 0.94;
const SPLAT_INTERVAL_MS = 45;
// Dark ink against the page background. The column-mask shader draws
// this colour with alpha proportional to density.
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

type GLState = {
  gl: WebGL2RenderingContext;
  vert: WebGLShader;
  advectFrag: WebGLShader;
  splatFrag: WebGLShader;
  maskFrag: WebGLShader;
  advectProg: WebGLProgram;
  splatProg: WebGLProgram;
  maskProg: WebGLProgram;
  vao: WebGLVertexArrayObject;
  read: FBO;
  write: FBO;
  advectU: {
    density: WebGLUniformLocation | null;
    texelSize: WebGLUniformLocation | null;
    dt: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    dissipation: WebGLUniformLocation | null;
    outwardSpeed: WebGLUniformLocation | null;
  };
  splatU: {
    density: WebGLUniformLocation | null;
    point: WebGLUniformLocation | null;
    radius: WebGLUniformLocation | null;
    strength: WebGLUniformLocation | null;
  };
  maskU: {
    density: WebGLUniformLocation | null;
    ink: WebGLUniformLocation | null;
  };
  canvasWidth: number;
  canvasHeight: number;
  fboW: number;
  fboH: number;
};

function initGL(canvas: HTMLCanvasElement): GLState | null {
  // Pin canvas to viewport size at init (V1: no resize listener).
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
  if (!gl) return null;

  const vert = compile(gl, gl.VERTEX_SHADER, quadVertSrc);
  if (!vert) return null;
  const advectFrag = compile(gl, gl.FRAGMENT_SHADER, advectFragSrc);
  const splatFrag = compile(gl, gl.FRAGMENT_SHADER, splatFragSrc);
  const maskFrag = compile(gl, gl.FRAGMENT_SHADER, maskFragSrc);
  if (!advectFrag || !splatFrag || !maskFrag) return null;

  const advectProg = link(gl, vert, advectFrag);
  const splatProg = link(gl, vert, splatFrag);
  const maskProg = link(gl, vert, maskFrag);
  if (!advectProg || !splatProg || !maskProg) return null;

  // Empty VAO — quad.vert builds the fullscreen triangle from gl_VertexID.
  const vao = gl.createVertexArray();
  if (!vao) return null;
  gl.bindVertexArray(vao);

  const aspect = canvas.width / canvas.height;
  const fboW = aspect >= 1 ? Math.round(FBO_SHORT_EDGE * aspect) : FBO_SHORT_EDGE;
  const fboH = aspect >= 1 ? FBO_SHORT_EDGE : Math.round(FBO_SHORT_EDGE / aspect);

  const read = makeFBO(gl, fboW, fboH);
  const write = makeFBO(gl, fboW, fboH);
  if (!read || !write) return null;
  // Initialise both to zero (the FBO factory leaves them undefined).
  gl.bindFramebuffer(gl.FRAMEBUFFER, read.fb);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {
    gl,
    vert,
    advectFrag,
    splatFrag,
    maskFrag,
    advectProg,
    splatProg,
    maskProg,
    vao,
    read,
    write,
    advectU: {
      density: gl.getUniformLocation(advectProg, "uDensity"),
      texelSize: gl.getUniformLocation(advectProg, "uTexelSize"),
      dt: gl.getUniformLocation(advectProg, "uDt"),
      time: gl.getUniformLocation(advectProg, "uTime"),
      dissipation: gl.getUniformLocation(advectProg, "uDissipation"),
      outwardSpeed: gl.getUniformLocation(advectProg, "uOutwardSpeed"),
    },
    splatU: {
      density: gl.getUniformLocation(splatProg, "uDensity"),
      point: gl.getUniformLocation(splatProg, "uPoint"),
      radius: gl.getUniformLocation(splatProg, "uRadius"),
      strength: gl.getUniformLocation(splatProg, "uStrength"),
    },
    maskU: {
      density: gl.getUniformLocation(maskProg, "uDensity"),
      ink: gl.getUniformLocation(maskProg, "uInkColor"),
    },
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    fboW,
    fboH,
  };
}

function disposeGL(state: GLState) {
  const { gl } = state;
  gl.deleteProgram(state.advectProg);
  gl.deleteProgram(state.splatProg);
  gl.deleteProgram(state.maskProg);
  gl.deleteShader(state.vert);
  gl.deleteShader(state.advectFrag);
  gl.deleteShader(state.splatFrag);
  gl.deleteShader(state.maskFrag);
  gl.deleteVertexArray(state.vao);
  gl.deleteTexture(state.read.tex);
  gl.deleteFramebuffer(state.read.fb);
  gl.deleteTexture(state.write.tex);
  gl.deleteFramebuffer(state.write.fb);
  // No loseContext() — see PhotoInkMask cleanup comment (StrictMode trap).
}

export function InkColumnFluidSim() {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    if (typeof window === "undefined") return;
    // Defensive: belt-and-suspenders against a render where the matchMedia
    // listener hasn't flipped isMobile yet. Same breakpoint as the state
    // initializer above.
    if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // GL resources are lazy-allocated on first ScrollTrigger onEnter and
    // torn down on every onLeave. Plan §5.1 contract; eliminates GPU
    // context pressure while the user is on hero/about/work.
    let glState: GLState | null = null;
    let active = false;
    let lastSplatTs = 0;

    const ensureGL = () => {
      if (glState) return;
      glState = initGL(canvas);
    };

    const teardownGL = () => {
      if (!glState) return;
      disposeGL(glState);
      glState = null;
    };

    const drawTo = (
      state: GLState,
      program: WebGLProgram,
      target: WebGLFramebuffer | null,
      w: number,
      h: number,
    ) => {
      const { gl } = state;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.viewport(0, 0, w, h);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL gl.useProgram (false-positive on use* names)
      gl.useProgram(program);
      gl.bindVertexArray(state.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const injectSplat = (
      state: GLState,
      x: number,
      y: number,
      radius: number,
      strength: number,
    ) => {
      const { gl } = state;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.read.tex);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(state.splatProg);
      gl.uniform1i(state.splatU.density, 0);
      gl.uniform2f(state.splatU.point, x, y);
      gl.uniform1f(state.splatU.radius, radius);
      gl.uniform1f(state.splatU.strength, strength);
      drawTo(state, state.splatProg, state.write.fb, state.fboW, state.fboH);
      const tmp = state.read;
      state.read = state.write;
      state.write = tmp;
    };

    const advect = (state: GLState, dt: number, time: number) => {
      const { gl } = state;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.read.tex);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(state.advectProg);
      gl.uniform1i(state.advectU.density, 0);
      gl.uniform2f(state.advectU.texelSize, 1 / state.fboW, 1 / state.fboH);
      gl.uniform1f(state.advectU.dt, dt);
      gl.uniform1f(state.advectU.time, time);
      gl.uniform1f(state.advectU.dissipation, DYE_DISSIPATION);
      // No radial outward velocity — the columns should stay pinned to the
      // edges, only the curl-noise term in the shader gently swirls them
      // for organic edge character.
      gl.uniform1f(state.advectU.outwardSpeed, 0);
      drawTo(state, state.advectProg, state.write.fb, state.fboW, state.fboH);
      const tmp = state.read;
      state.read = state.write;
      state.write = tmp;
    };

    const composite = (state: GLState) => {
      const { gl } = state;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, state.canvasWidth, state.canvasHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.read.tex);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(state.maskProg);
      gl.uniform1i(state.maskU.density, 0);
      gl.uniform3f(state.maskU.ink, ...INK_RGB);
      gl.bindVertexArray(state.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    };

    const unsub = subscribe((deltaMs, elapsedMs) => {
      if (!active || !glState) return;
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
        injectSplat(glState, 0.02, yL, 0.05, 0.85);
        injectSplat(glState, 0.98, yR, 0.05, 0.85);
      }

      advect(glState, dt, elapsedMs * 0.001);
      composite(glState);
    }, 30);

    // Range invalidation when DioramaTrack's pin lands is handled by its
    // ScrollTrigger.refresh() call after pin-init — global refresh
    // recomputes start/end on every trigger in the registry.
    const st = ScrollTrigger.create({
      trigger: "#case-study",
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        ensureGL();
        active = true;
      },
      onEnterBack: () => {
        ensureGL();
        active = true;
      },
      onLeave: () => {
        active = false;
        teardownGL();
      },
      onLeaveBack: () => {
        active = false;
        teardownGL();
      },
    });

    return () => {
      unsub();
      st.kill();
      teardownGL();
    };
  }, [reducedMotion, isMobile]);

  if (reducedMotion || isMobile) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed inset-0 z-30"
    />
  );
}
