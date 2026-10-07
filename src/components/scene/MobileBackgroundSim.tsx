"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { applySimPreset, firePresetBurst, getSimPreset } from "@/lib/content/simPresets";
import {
  createFluidOrchestrator,
  type FluidOrchestrator,
  type PointerState,
} from "@/lib/gl/fluidOrchestrator";
import { capDPR, getTierDPR, type TierConfig } from "@/lib/gpu";
import { createInkWarmup } from "@/lib/inkPreview";
import { subscribeToLoaderComplete } from "@/lib/loaderSession";
import { SPOT_COLORS, type SpotColor } from "@/lib/palette";
import { MAX_DT_S, subscribe } from "@/lib/raf";
import { useSimPresetStore } from "@/lib/simPresetStore";

/** A single fixed background simulation, visible throughout native scrolling.
 * Passive touch strokes and scroll velocity gently move the ink. */

const TAP_MAX_MS = 400; // longer than this is a long-press, not a tap
const TOUCH_MIN_MOVE_PX = 2;
const TOUCH_MAX_FORCE = 0.12;

type TouchSplat = { x: number; y: number; dx: number; dy: number; color: SpotColor };

// Scroll → ink coupling. Mirrors the Desktop
// ScrollInkCoupling constants, adjusted for native-scroll velocity
// (px per event batch) instead of Lenis's smoothed px/frame.
const COUPLE_VELOCITY_THRESHOLD = 10; // |px/16ms| below this never fires
const COUPLE_MIN_INTERVAL_MS = 120; // min gap between force injections
const COUPLE_VELOCITY_TO_FORCE = 0.008;
const COUPLE_MAX_FORCE = 0.5;
const COUPLE_FORCE_RADIUS = 1.2; // whole-canvas soft force field
const NO_DYE: readonly [number, number, number] = [0, 0, 0]; // pure velocity, zero dye

type MobileBackgroundSimProps = {
  config: TierConfig;
  measuring: boolean;
  onGLReady: (gl: WebGL2RenderingContext) => void;
  onFrametime: (ms: number) => void;
  onUnavailable?: () => void;
};

export function MobileBackgroundSim({
  config,
  measuring,
  onGLReady,
  onFrametime,
  onUnavailable,
}: MobileBackgroundSimProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const touchSplatRef = useRef<TouchSplat | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
  });
  const measuringRef = useRef(measuring);
  measuringRef.current = measuring;
  const onFrametimeRef = useRef(onFrametime);
  onFrametimeRef.current = onFrametime;
  const warmupRef = useRef<ReturnType<typeof createInkWarmup> | null>(null);
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;
  const reduced = useReducedMotion();

  // Mount orchestrator (own WebGL2 context) + ambient start + resize.
  useEffect(() => {
    if (reduced || !config) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = capDPR(getTierDPR(config.tier));
    const sizeCanvas = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    };
    sizeCanvas();

    let context: WebGL2RenderingContext | null;
    try {
      context = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        // Keep the last frame visible through iOS Safari's momentum-scroll
        // repaint pauses (same reasoning as SceneCanvas).
        preserveDrawingBuffer: true,
        premultipliedAlpha: true,
      });
    } catch {
      onUnavailableRef.current?.();
      return;
    }
    const gl = context;
    if (!gl) {
      onUnavailableRef.current?.();
      return;
    }

    const orchestrator = createFluidOrchestrator();
    try {
      orchestrator.init(gl, config);
      applySimPreset(orchestrator, getSimPreset(useSimPresetStore.getState().presetId), config);
      // Compile the first splat before declaring the renderer available.
      orchestrator.injectSplat(-1, -1, [0, 0, 0], 0, 0);
    } catch {
      orchestrator.dispose();
      onUnavailableRef.current?.();
      return;
    }
    orchestratorRef.current = orchestrator;
    warmupRef.current = null;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      orchestratorRef.current = null;
      onUnavailableRef.current?.();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    onGLReady(gl);

    // Preset: mirror the Desktop FluidSim wiring — apply the persisted
    // selection on every fresh init and re-apply live on store change
    // (the switcher is available on Mobile-phone layouts too). Only
    // live changes fire the celebration burst.
    const unsubPreset = useSimPresetStore.subscribe((current, previous) => {
      if (current.presetId === previous.presetId) return;
      const preset = getSimPreset(current.presetId);
      applySimPreset(orchestrator, preset, config);
      firePresetBurst(orchestrator, preset, config.splatRadius);
    });

    // Ambient opens the warmup gate after the loader + hero reveal settle.
    const AMBIENT_DELAY_MS = 100;
    let ambientTimer: number | null = null;
    const unsubLoader = subscribeToLoaderComplete(() => {
      ambientTimer = window.setTimeout(() => {
        orchestratorRef.current?.triggerAmbient();
      }, AMBIENT_DELAY_MS);
    });

    // iOS fires resize on URL-bar show/hide mid-scroll; coalesce to one rAF.
    let resizeRaf: number | null = null;
    const onResize = () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        sizeCanvas();
        orchestratorRef.current?.resize(canvas.width, canvas.height);
      });
    };
    window.addEventListener("resize", onResize);

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("resize", onResize);
      if (ambientTimer !== null) window.clearTimeout(ambientTimer);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      unsubLoader();
      unsubPreset();
      orchestrator.dispose();
      orchestratorRef.current = null;
      warmupRef.current = null;
    };
  }, [config, reduced, onGLReady]);

  // Passive document-level input leaves the browser in charge of scrolling.
  // Movement only replaces a pending sample; the shared RAF consumes at most
  // one splat per frame, including when touch events arrive in bursts.
  useEffect(() => {
    if (reduced) return;

    let gesture: {
      id: number;
      x: number;
      y: number;
      startedAt: number;
      moved: boolean;
      color: SpotColor;
    } | null = null;

    const cancel = () => {
      gesture = null;
      touchSplatRef.current = null;
    };
    const clampPosition = (value: number) => Math.max(0, Math.min(1, value));
    const clampForce = (value: number) =>
      Math.max(-TOUCH_MAX_FORCE, Math.min(TOUCH_MAX_FORCE, value));

    const onStart = (e: TouchEvent) => {
      cancel();
      if (e.touches.length !== 1 || document.hidden) return;
      const t = e.touches[0];
      if (!t) return;
      if (
        e.target instanceof Element &&
        e.target.closest(
          '[data-no-splat], a, button, input, textarea, select, label, [role="button"], [role="link"], [contenteditable]:not([contenteditable="false"])',
        )
      )
        return;
      gesture = {
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        startedAt: performance.now(),
        moved: false,
        // Spot intensity selects the current theme's existing ladder band.
        color: SPOT_COLORS[Math.floor(Math.random() * SPOT_COLORS.length)] ?? "rose",
      };
    };
    const onMove = (e: TouchEvent) => {
      if (!gesture) return;
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t || t.identifier !== gesture.id) {
        cancel();
        return;
      }
      const dx = t.clientX - gesture.x;
      const dy = gesture.y - t.clientY;
      if ((dx === 0 && dy === 0) || (!gesture.moved && Math.hypot(dx, dy) < TOUCH_MIN_MOVE_PX))
        return;
      const pending = touchSplatRef.current;
      touchSplatRef.current = {
        x: clampPosition(t.clientX / window.innerWidth),
        y: clampPosition(1 - t.clientY / window.innerHeight),
        dx: clampForce((pending?.dx ?? 0) + dx / window.innerWidth),
        dy: clampForce((pending?.dy ?? 0) + dy / window.innerHeight),
        color: gesture.color,
      };
      gesture.x = t.clientX;
      gesture.y = t.clientY;
      gesture.moved = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!gesture) return;
      if (e.touches.length !== 0 || e.changedTouches[0]?.identifier !== gesture.id) {
        cancel();
        return;
      }
      if (!gesture.moved && performance.now() - gesture.startedAt <= TAP_MAX_MS) {
        touchSplatRef.current = {
          x: clampPosition(gesture.x / window.innerWidth),
          y: clampPosition(1 - gesture.y / window.innerHeight),
          dx: 0,
          dy: 0,
          color: gesture.color,
        };
      }
      gesture = null;
    };
    const onVisibility = () => {
      if (document.hidden) cancel();
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", cancel, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", cancel);

    return () => {
      cancel();
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", cancel);
    };
  }, [reduced]);

  // Keep the ink moving with native scrolling on every mobile platform.
  useEffect(() => {
    if (reduced) return;

    let lastY = window.scrollY;
    let lastT = performance.now();
    let lastInjectT = 0;

    const onScroll = () => {
      const now = performance.now();
      const dtMs = now - lastT;
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      lastT = now;
      if (dtMs <= 0) return;

      // Normalize to px per 16ms frame so thresholds match Desktop feel.
      const velocity = (dy / dtMs) * 16;
      if (Math.abs(velocity) < COUPLE_VELOCITY_THRESHOLD) return;
      if (now - lastInjectT < COUPLE_MIN_INTERVAL_MS) return;
      lastInjectT = now;

      const force = Math.min(Math.abs(velocity) * COUPLE_VELOCITY_TO_FORCE, COUPLE_MAX_FORCE);
      // y origin is canvas-bottom: scroll-down (velocity > 0) moves
      // content up, so the ink drifts up with it; scroll-up mirrors.
      orchestratorRef.current?.injectSplat(
        0.5,
        0.5,
        NO_DYE,
        0,
        velocity > 0 ? force : -force,
        COUPLE_FORCE_RADIUS,
      );
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  // Shared RAF continues during scrolling; no opacity fade or compute drain.
  useEffect(() => {
    if (reduced) return;
    let virtualElapsedMs = 0;
    const unsub = subscribe((deltaMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const dt = Math.min(deltaMs * 0.001, MAX_DT_S);
      virtualElapsedMs += Math.min(deltaMs, MAX_DT_S * 1000);
      const startedAt = performance.now();
      const touch = touchSplatRef.current;
      if (touch && !document.hidden && orchestrator.isStarted()) {
        touchSplatRef.current = null;
        orchestrator.injectSplat(touch.x, touch.y, touch.color, touch.dx, touch.dy);
      }
      orchestrator.step(dt, virtualElapsedMs, pointerRef.current);
      if (orchestrator.isStarted() && warmupRef.current === null) {
        warmupRef.current = createInkWarmup(performance.now());
      }
      if (
        measuringRef.current &&
        warmupRef.current?.(
          performance.now(),
          document.readyState === "complete" && document.fonts.status !== "loading",
        )
      ) {
        const gl = canvasRef.current?.getContext("webgl2");
        if (gl) {
          gl.finish();
          onFrametimeRef.current(performance.now() - startedAt);
        }
      }
    }, 15);
    return () => unsub();
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="mobile-bg-sim"
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        // Promote the fixed layer and retain the last frame during Safari repaint pauses.
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        willChange: "transform",
        contain: "paint",
        isolation: "isolate",
      }}
    />
  );
}
