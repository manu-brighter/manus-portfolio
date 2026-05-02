"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SpotColor } from "@/lib/content/playground";
import { GROW_MS, HOLD_MS, RETRACT_MS, useInkWipeStore } from "@/lib/inkWipeStore";
import { subscribe } from "@/lib/raf";
import quadVertSrc from "@/shaders/common/quad.vert.glsl";
import wipeFragSrc from "@/shaders/ink-wipe/wipe.frag.glsl";

/**
 * Fluid-Ink-Wipe page-transition overlay.
 *
 * Lives in the locale layout so it survives navigation between any
 * two routes within `[locale]`. Subscribes to inkWipeStore; when phase
 * leaves `idle`, renders the procedural ink shader (see
 * shaders/ink-wipe/wipe.frag.glsl). Phase progression is timer-driven
 * inside this component:
 *   growing  →  covered  →  retracting  →  idle
 *
 * The PlaygroundCard click handler triggers `startGrow` and then
 * router.push()es just before grow completes, so the actual route
 * swap happens during the `covered` window. The destination route's
 * loading-state (ExperimentRouter dynamic import) is hidden behind
 * the ink during that window.
 *
 * Pointer-events: none always — the overlay is decorative and must
 * never block keyboard or pointer interaction with the page under it.
 */

const SPOT_RGB: Record<SpotColor, [number, number, number]> = {
  rose: [1.0, 0.42, 0.627],
  amber: [1.0, 0.769, 0.455],
  mint: [0.486, 0.91, 0.769],
  violet: [0.722, 0.604, 1.0],
};

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error("createShader failed");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`ink-wipe shader compile: ${log}`);
  }
  return s;
}

function link(gl: WebGL2RenderingContext, vert: WebGLShader, frag: WebGLShader): WebGLProgram {
  const p = gl.createProgram();
  if (!p) throw new Error("createProgram failed");
  gl.attachShader(p, vert);
  gl.attachShader(p, frag);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`ink-wipe program link: ${log}`);
  }
  return p;
}

export function InkWipeOverlay() {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      // Must be alpha:true so the canvas composites over the page —
      // when no transition is active the canvas reads as transparent
      // and the document beneath shows through unchanged.
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    }) as WebGL2RenderingContext | null;
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, quadVertSrc);
    const frag = compile(gl, gl.FRAGMENT_SHADER, wipeFragSrc);
    const program = link(gl, vert, frag);
    const vao = gl.createVertexArray();

    const u = {
      phase: gl.getUniformLocation(program, "uPhase"),
      direction: gl.getUniformLocation(program, "uDirection"),
      clickPos: gl.getUniformLocation(program, "uClickPos"),
      aspect: gl.getUniformLocation(program, "uAspect"),
      color: gl.getUniformLocation(program, "uColor"),
      time: gl.getUniformLocation(program, "uTime"),
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // True after we've rendered at least one frame in the current
    // active cycle. When the cycle ends we render one transparent
    // frame and flip this back to false — without that, the last
    // rendered frame would otherwise stay cached on the GPU compositor
    // and re-show on the next swap.
    let dirty = false;

    const unsub = subscribe((_deltaMs, elapsedMs) => {
      const state = useInkWipeStore.getState();

      if (state.phase === "idle") {
        if (dirty) {
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          dirty = false;
        }
        return;
      }

      const now = performance.now();
      const elapsedInPhase = now - state.phaseStartedAt;

      // Auto-advance phase machine. Defensive: if a downstream caller
      // never invokes the next transition (e.g. router error), the
      // timers below still tick the overlay back to idle so the page
      // doesn't get stuck behind ink.
      if (state.phase === "growing" && elapsedInPhase >= GROW_MS) {
        useInkWipeStore.getState().markCovered();
      } else if (state.phase === "covered" && elapsedInPhase >= HOLD_MS) {
        useInkWipeStore.getState().startRetract();
      } else if (state.phase === "retracting" && elapsedInPhase >= RETRACT_MS) {
        useInkWipeStore.getState().reset();
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        dirty = false;
        return;
      }

      // Recompute current phase progress + direction after the
      // potential auto-advance above.
      const fresh = useInkWipeStore.getState();
      const freshElapsed = now - fresh.phaseStartedAt;
      let progress: number;
      let direction: number;
      switch (fresh.phase) {
        case "growing":
          progress = Math.min(freshElapsed / GROW_MS, 1);
          direction = 1;
          break;
        case "covered":
          progress = 1;
          direction = 1;
          break;
        case "retracting":
          progress = Math.min(freshElapsed / RETRACT_MS, 1);
          direction = -1;
          break;
        default:
          return;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(u.phase, progress);
      gl.uniform1f(u.direction, direction);
      // Y is stored in the store as 0..1 from the top of the viewport
      // (clientY/innerHeight). The shader treats vUv.y=0 as the
      // bottom, so flip Y here.
      gl.uniform2f(u.clickPos, fresh.clickX, 1.0 - fresh.clickY);
      gl.uniform1f(u.aspect, canvas.width / canvas.height);
      const rgb = SPOT_RGB[fresh.color];
      gl.uniform3f(u.color, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(u.time, elapsedMs * 0.001);

      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
      dirty = true;
      // Run early in the priority order — but late enough that the
      // hero canvas finishes its frame first. Priority 200 well after
      // R3F's 20 and the playground experiments' 15-25.
    }, 200);

    return () => {
      unsub();
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      if (vao) gl.deleteVertexArray(vao);
      // Defensive reset so a hot-reload mid-transition doesn't leave
      // the next mount stuck observing a stale phase.
      useInkWipeStore.getState().reset();
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      data-scene="ink-wipe"
      className="pointer-events-none fixed inset-0 z-[10000]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
