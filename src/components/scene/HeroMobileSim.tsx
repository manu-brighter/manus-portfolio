"use client";

import { useEffect, useRef } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  createFluidOrchestrator,
  type FluidOrchestrator,
  type PointerState,
} from "@/lib/gl/fluidOrchestrator";
import { subscribeToLoaderComplete } from "@/lib/loaderSession";
import { MAX_DT_S, subscribe } from "@/lib/raf";

/**
 * Mobile-only Hero FluidSim — scroll-attached canvas living inside the
 * Hero section's DOM (not a fixed-position global canvas like the Desktop
 * variant via SceneProvider).
 *
 * Mobile-Rework spec §4.1: replaces the global background sim on coarse-
 * pointer phones with a per-section sim that scrolls away with the page.
 * Pairs with two more sim spots later (Photography swiper, Case-Study
 * scrolly).
 *
 * Lifecycle:
 * - mount: create own WebGL2 context, instantiate orchestrator via
 *   createFluidOrchestrator() factory, fire a warmup splat off-screen
 *   to compile shaders silently
 * - loader-complete + ~100ms settle: triggerAmbient() opens the warmup
 *   gate and kicks the wandering-points ambient motion
 * - touch: tap → 1 splat at touch position; drag → splat trail with
 *   velocity from drag dx/dy
 * - IO-pause: when Hero scrolls 80% out of viewport, sim pauses; resumes
 *   when scrolled back (cheap RAF cost when paused)
 * - reduced-motion: render a static paper-tone div instead of the sim
 */
export function HeroMobileSim() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
  });
  const { capability } = useGPUCapability();
  const config = capability.config;
  const reduced = useReducedMotion();

  // Mount orchestrator + tear down on unmount or config change.
  useEffect(() => {
    if (reduced) return;
    if (!config) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size the canvas to its CSS dimensions × DPR for crisp rendering.
    // The orchestrator's resize() handles internal FBO sizing; we just
    // own the backing-store-pixels-vs-CSS-size ratio.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    sizeCanvas();

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const orchestrator = createFluidOrchestrator();
    orchestrator.init(gl, config);
    orchestratorRef.current = orchestrator;

    // Warmup splat off-screen — forces shader compile silently so the
    // first user touch doesn't trigger a 50-100ms iOS Safari freeze.
    orchestrator.injectSplat(-1, -1, [0, 0, 0], 0, 0);

    // Ambient kicks in after loader animation + hero reveal settle.
    // Mirrors the Desktop FluidSim cadence; HERO_REVEAL_MS keeps the
    // sim quiet during the OverprintReveal choreography.
    const HERO_REVEAL_MS = 100;
    let ambientTimer: number | null = null;
    const unsubLoader = subscribeToLoaderComplete(() => {
      ambientTimer = window.setTimeout(() => {
        orchestratorRef.current?.triggerAmbient();
      }, HERO_REVEAL_MS);
    });

    // Window resize: re-fit the canvas backing store; orchestrator's
    // resize() reallocates FBOs to the new aspect.
    const onResize = () => {
      sizeCanvas();
      orchestratorRef.current?.resize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (ambientTimer !== null) window.clearTimeout(ambientTimer);
      unsubLoader();
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [config, reduced]);

  // Touch handlers — convert tap to a splat, drag to a velocity trail.
  // Listeners attach to the canvas only (not document) so touch outside
  // the hero section doesn't add forces.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const splatFromTouch = (clientX: number, clientY: number, dx = 0, dy = 0) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const rect = canvas.getBoundingClientRect();
      const u = (clientX - rect.left) / rect.width;
      const v = 1.0 - (clientY - rect.top) / rect.height;
      pointerRef.current.x = u;
      pointerRef.current.y = v;
      pointerRef.current.dx = dx;
      pointerRef.current.dy = dy;
      pointerRef.current.moved = true;
      orchestrator.injectSplat(u, v, [1, 1, 1], dx, dy);
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      lastX = t.clientX;
      lastY = t.clientY;
      dragging = true;
      pointerRef.current.down = true;
      splatFromTouch(t.clientX, t.clientY);
    };
    const onMove = (e: TouchEvent) => {
      if (!dragging) return;
      const t = e.touches[0];
      if (!t) return;
      // Drag dx/dy in normalised space; the orchestrator multiplies this
      // by its own force-strength constants so we don't need to tune here.
      const dx = (t.clientX - lastX) * 0.002;
      const dy = -(t.clientY - lastY) * 0.002;
      splatFromTouch(t.clientX, t.clientY, dx, dy);
      lastX = t.clientX;
      lastY = t.clientY;
    };
    const onEnd = () => {
      dragging = false;
      pointerRef.current.down = false;
    };

    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("touchend", onEnd);
    canvas.addEventListener("touchcancel", onEnd);

    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
      canvas.removeEventListener("touchcancel", onEnd);
    };
  }, [reduced]);

  // RAF loop — NO IO-pause-gate. Earlier attempt to pause when Hero
  // scrolled out + virtualElapsed-bridging the resume-blink kept hitting
  // a deeper wall-clock-dependency inside FluidOrchestrator
  // (`lastPointerTime`, `ambientGraceUntil` both use `performance.now()`
  // directly, so any pause/resume desyncs the orchestrator's internal
  // idle state from the visible sim state → ambient points reset →
  // visible blink). Workaround until orchestrator supports virtual-time
  // for its internal state: run the sim continuously. ~3-5% mobile CPU
  // cost when scrolled away; the blink-free experience is worth it.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let virtualElapsedMs = 0;
    const unsubRaf = subscribe((deltaMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const dt = Math.min(deltaMs * 0.001, MAX_DT_S);
      virtualElapsedMs += Math.min(deltaMs, MAX_DT_S * 1000);
      orchestrator.step(dt, virtualElapsedMs, pointerRef.current);
      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, 15);

    return () => {
      unsubRaf();
    };
  }, [reduced]);

  if (reduced) {
    // Static fallback honours prefers-reduced-motion. Paper-tone fill so
    // the section doesn't paint a void where the sim would have been.
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--color-paper)" }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="hero-mobile-sim"
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-auto absolute inset-0 -z-10 h-full w-full"
    />
  );
}
