"use client";

// Section-level ink-transition canvas.
// A single fullscreen WebGL2 canvas overlays the viewport and plays an
// ink-flow choreography on CaseStudy section enter / exit:
//   - On enter (scroll down into section): ink floods right-to-left,
//     covering the outgoing content briefly before dissipating.
//   - On leave (scroll down out of section): ink floods left-to-right,
//     drains over DRAIN_DURATION_MS, then the canvas goes passive.
//   - EnterBack / LeaveBack: same directions, reversed scroll direction.
//
// FBO ping-pong + shader pattern adapted from PhotoInkMask (Phase 9).
// Key differences vs PhotoInkMask:
//   - Canvas is fixed/fullscreen (not per-photo absolute overlay).
//   - Lifecycle driven by ScrollTrigger, not IntersectionObserver.
//   - Single splat at right edge (uTarget ~0.95, 0.5) on enter, not
//     centre-burst + re-injection.
//   - Direction-driven advection shader (uDirection uniform), not curl.
//   - Drain: opacity fades over DRAIN_DURATION_MS, then RAF unsubscribes.
//
// StrictMode safety: do NOT call loseContext() in cleanup (Phase 9 lesson).

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { compileShader } from "@/lib/gl/compileShader";
import { subscribe } from "@/lib/raf";
import flowSrc from "@/shaders/case-study-ink/ink-flow.frag.glsl";
import maskSrc from "@/shaders/case-study-ink/mask-composite.frag.glsl";
import quadSrc from "@/shaders/common/quad.vert.glsl";
import splatSrc from "@/shaders/ink-mask/splat.frag.glsl";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const PAPER_COLOR: [number, number, number] = [240 / 255, 232 / 255, 220 / 255]; // #f0e8dc
const FBO_SIZE = 256;
const DRAIN_DURATION_MS = 1200;

type Props = {
  /** Element to use as ScrollTrigger trigger. The canvas overlays the
   *  full viewport while the section is active. */
  triggerRef: React.RefObject<HTMLElement | null>;
};

// ---------- local compile + link helpers (soft-failure path) ----------

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  try {
    return compileShader(gl, type, src, "ink-transition");
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
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    // biome-ignore lint/suspicious/noConsole: link failure is a dev signal
    console.error("ink-transition link error:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
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

export function InkTransition({ triggerRef }: Props) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const trigger = triggerRef.current;
    const canvas = canvasRef.current;
    if (!trigger || !canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    }) as WebGL2RenderingContext | null;
    if (!gl) return;

    gl.viewport(0, 0, canvas.width, canvas.height);

    // Compile shaders
    const vert = compile(gl, gl.VERTEX_SHADER, quadSrc);
    if (!vert) return;
    const flowFrag = compile(gl, gl.FRAGMENT_SHADER, flowSrc);
    const maskFrag = compile(gl, gl.FRAGMENT_SHADER, maskSrc);
    const splatFrag = compile(gl, gl.FRAGMENT_SHADER, splatSrc);
    if (!flowFrag || !maskFrag || !splatFrag) return;

    const flowProg = link(gl, vert, flowFrag);
    const maskProg = link(gl, vert, maskFrag);
    const splatProg = link(gl, vert, splatFrag);
    if (!flowProg || !maskProg || !splatProg) return;

    // Empty VAO — quad.vert builds the fullscreen triangle from gl_VertexID
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Density ping-pong FBOs
    let read = makeFBO(gl, FBO_SIZE, FBO_SIZE);
    let write = makeFBO(gl, FBO_SIZE, FBO_SIZE);
    if (!read || !write) return;

    // Initialise both FBOs to zero
    gl.bindFramebuffer(gl.FRAMEBUFFER, read.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Uniform locations
    const flowU = {
      density: gl.getUniformLocation(flowProg, "uDensity"),
      resolution: gl.getUniformLocation(flowProg, "uResolution"),
      dt: gl.getUniformLocation(flowProg, "uDt"),
      direction: gl.getUniformLocation(flowProg, "uDirection"),
      dissipation: gl.getUniformLocation(flowProg, "uDissipation"),
    };
    const splatU = {
      density: gl.getUniformLocation(splatProg, "uDensity"),
      point: gl.getUniformLocation(splatProg, "uPoint"),
      radius: gl.getUniformLocation(splatProg, "uRadius"),
      strength: gl.getUniformLocation(splatProg, "uStrength"),
    };
    const maskU = {
      density: gl.getUniformLocation(maskProg, "uDensity"),
      paper: gl.getUniformLocation(maskProg, "uPaperColor"),
    };

    // ---------- render helpers ----------

    const drawTo = (prog: WebGLProgram, target: WebGLFramebuffer | null, w: number, h: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.viewport(0, 0, w, h);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL gl.useProgram (false-positive on use* names)
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const runAdvect = (dt: number, dir: number) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read?.tex ?? null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(flowProg);
      gl.uniform1i(flowU.density, 0);
      gl.uniform2f(flowU.resolution, FBO_SIZE, FBO_SIZE);
      gl.uniform1f(flowU.dt, dt);
      gl.uniform1f(flowU.direction, dir);
      gl.uniform1f(flowU.dissipation, 0.997);
      drawTo(flowProg, write?.fb ?? null, FBO_SIZE, FBO_SIZE);
      const tmp = read;
      read = write;
      write = tmp;
    };

    const runSplat = (x: number, y: number, radius: number, strength: number) => {
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

    const runMask = () => {
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
      gl.uniform3f(maskU.paper, ...PAPER_COLOR);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    };

    // Inject one strong splat at the right edge to seed the enter burst
    const injectSplat = () => {
      runSplat(0.95, 0.5, 0.6, 0.9);
    };

    // ---------- mutable sim state ----------
    let direction = -1; // -1 = enter (right-to-left), +1 = exit (left-to-right)
    let active = false;
    let drainStartTs = 0;

    // ---------- RAF tick ----------
    // Priority 30: between ScrollTrigger (10) and R3F (20) — wait, actually
    // priority lower-number = earlier tick. Use 30 so we run after scroll
    // effects but don't compete with the hero sim at 20.
    const unsubscribe = subscribe((deltaMs) => {
      if (!active) return;
      const dt = Math.min(deltaMs * 0.001, 0.033);

      runAdvect(dt, direction);
      runMask();

      // Drain logic: fade out over DRAIN_DURATION_MS when exiting
      if (direction === 1) {
        const elapsed = performance.now() - drainStartTs;
        const opacity = Math.max(0, 1 - elapsed / DRAIN_DURATION_MS);
        canvas.style.opacity = String(opacity);
        if (opacity === 0) {
          active = false;
          // Clear density FBOs so next enter starts fresh
          gl.bindFramebuffer(gl.FRAMEBUFFER, read?.fb ?? null);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.bindFramebuffer(gl.FRAMEBUFFER, write?.fb ?? null);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
      } else {
        canvas.style.opacity = "1";
      }
    }, 30);

    // ---------- ScrollTrigger lifecycle ----------
    const st = ScrollTrigger.create({
      trigger,
      start: "top center",
      end: "bottom center",
      onEnter: () => {
        direction = -1;
        active = true;
        canvas.style.opacity = "1";
        injectSplat();
      },
      onEnterBack: () => {
        direction = -1;
        active = true;
        canvas.style.opacity = "1";
        injectSplat();
      },
      onLeave: () => {
        direction = 1;
        drainStartTs = performance.now();
      },
      onLeaveBack: () => {
        direction = 1;
        drainStartTs = performance.now();
      },
    });

    return () => {
      unsubscribe();
      st.kill();
      // Delete GPU resources — no loseContext() (StrictMode double-invoke trap)
      gl.deleteProgram(flowProg);
      gl.deleteProgram(maskProg);
      gl.deleteProgram(splatProg);
      gl.deleteShader(vert);
      gl.deleteShader(flowFrag);
      gl.deleteShader(maskFrag);
      gl.deleteShader(splatFrag);
      gl.deleteVertexArray(vao);
      if (read) {
        gl.deleteTexture(read.tex);
        gl.deleteFramebuffer(read.fb);
      }
      if (write) {
        gl.deleteTexture(write.tex);
        gl.deleteFramebuffer(write.fb);
      }
    };
  }, [reducedMotion, triggerRef]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed inset-0 z-30"
      style={{ opacity: 0 }}
    />
  );
}
