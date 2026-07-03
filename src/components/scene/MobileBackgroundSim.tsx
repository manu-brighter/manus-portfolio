"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { applySimPreset, firePresetBurst, getSimPreset } from "@/lib/content/simPresets";
import {
  createFluidOrchestrator,
  type FluidOrchestrator,
  type PointerState,
} from "@/lib/gl/fluidOrchestrator";
import { subscribeToLoaderComplete } from "@/lib/loaderSession";
import { MAX_DT_S, subscribe } from "@/lib/raf";
import { useSimPresetStore } from "@/lib/simPresetStore";

/**
 * Mobile full-page background fluid sim.
 *
 * Replaces the per-section HeroMobileSim with a single fixed, full-viewport
 * canvas behind ALL content on Mobile-phone layouts (coarse + < 768) — the
 * same "the sim IS the background" model the Desktop uses, brought back to
 * Mobile now that the scroll-drain choreography is clean.
 *
 * The scroll-drain does double duty:
 *   1. Perf — pauses the orchestrator while the user scrolls.
 *   2. iOS cull masking — iOS Safari drops `position:fixed` WebGL layers
 *      during momentum scroll (the documented blink that pushed the rework
 *      to per-section canvases / a <video> on tablets). Here the canvas is
 *      already faded to opacity 0 while scrolling, so the cull lands on a
 *      transparent layer and is invisible. When scrolling stops it fades
 *      back in — past the momentum, so no cull. Combined with the same
 *      layer-promotion stack SceneCanvas uses (translateZ / will-change /
 *      contain:paint / isolation / preserveDrawingBuffer / alpha).
 *
 * Smoothness (vs the old hero choreography): a single clean fade-out on
 * scroll-start and a single fade-in once still — no staggered re-emergence
 * splats that read as a flicker. The reveal holds at opacity 0 through a
 * short settle window so the orchestrator's wall-clock reset stays hidden.
 *
 * `pointer-events: none` so the canvas never eats taps/scrolls; touch input
 * is read at the document level — a genuine tap (no drag) pokes one splat,
 * scroll gestures are ignored.
 *
 * Reduced-motion: renders nothing (SceneProvider routes reduced/static to
 * StaticFallback before this ever mounts; the internal guards are belt-and-
 * suspenders).
 */

const SCROLL_DISTANCE_THRESHOLD = 24; // px of travel before draining (ignore jitter)
const DRAIN_MS = 240; // fade-out on scroll-start (fast enough to beat the cull)
const REVEAL_SETTLE_MS = 360; // hold at 0 after resume so the orchestrator re-settles unseen
const REVEAL_MS = 560; // smooth fade-in once scrolling has stopped
const SCROLL_IDLE_COOLDOWN_MS = 1000; // stillness required before revealing
const TAP_MOVE_TOLERANCE_PX = 12; // beyond this a touch is a scroll, not a tap
const TAP_MAX_MS = 400; // longer than this is a long-press, not a tap

export function MobileBackgroundSim() {
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
  const rafPausedRef = useRef(false);
  const { capability } = useGPUCapability();
  const config = capability.config;
  const reduced = useReducedMotion();

  // Mount orchestrator (own WebGL2 context) + ambient start + resize.
  useEffect(() => {
    if (reduced || !config) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sizeCanvas = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    };
    sizeCanvas();

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      // Keep the last frame visible through iOS Safari's momentum-scroll
      // repaint pauses (same reasoning as SceneCanvas).
      preserveDrawingBuffer: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const orchestrator = createFluidOrchestrator();
    orchestrator.init(gl, config);
    orchestratorRef.current = orchestrator;

    // Preset: mirror the Desktop FluidSim wiring — apply the persisted
    // selection on every fresh init and re-apply live on store change
    // (the switcher is available on Mobile-phone layouts too). Only
    // live changes fire the celebration burst.
    applySimPreset(orchestrator, getSimPreset(useSimPresetStore.getState().presetId), config);
    const unsubPreset = useSimPresetStore.subscribe((current, previous) => {
      if (current.presetId === previous.presetId) return;
      const preset = getSimPreset(current.presetId);
      applySimPreset(orchestrator, preset, config);
      firePresetBurst(orchestrator, preset, config.splatRadius);
    });

    // Warmup splat off-screen — compiles shaders silently so the first
    // visible frame doesn't trigger an iOS Safari compile freeze.
    orchestrator.injectSplat(-1, -1, [0, 0, 0], 0, 0);

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
      window.removeEventListener("resize", onResize);
      if (ambientTimer !== null) window.clearTimeout(ambientTimer);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      unsubLoader();
      unsubPreset();
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [config, reduced]);

  // Tap-to-splat at the document level (the canvas is pointer-events:none).
  // Only a genuine tap pokes the sim — a drag is the user scrolling.
  useEffect(() => {
    if (reduced) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let moved = false;
    let onChrome = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      startT = performance.now();
      moved = false;
      // Taps on interactive UI (nav, links, the preset switcher's
      // [data-no-splat] pill, form fields) act on that UI — poking a
      // splat under it reads as an accident, not a feature.
      onChrome =
        e.target instanceof Element &&
        e.target.closest("[data-no-splat], a, button, input, textarea, select, label") !== null;
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (Math.hypot(t.clientX - startX, t.clientY - startY) > TAP_MOVE_TOLERANCE_PX) {
        moved = true;
      }
    };
    const onEnd = () => {
      if (onChrome || moved || performance.now() - startT > TAP_MAX_MS) return;
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const u = startX / window.innerWidth;
      const v = 1 - startY / window.innerHeight;
      orchestrator.injectSplat(u, v, [1, 1, 1], 0, 0);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [reduced]);

  // Scroll-drain / reveal choreography. Direct style manipulation (no React
  // state) — this is a per-frame animation, not a render concern.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.opacity = "1";

    let opacityTween: gsap.core.Tween | null = null;
    let idleTimerId: number | null = null;
    let settleTimerId: number | null = null;
    let drained = false;
    let scrollAccumulator = 0;
    let lastScrollY = window.scrollY;
    // Horizontal-gesture guard: a side-swipe on the Case-Study / Photography
    // carousels can drag `window.scrollY` a few px diagonally, which would
    // otherwise trip drain() — fading the background AND doing GSAP+GL work
    // right in the middle of the carousel's first swipe (a second stall source
    // on top of the React re-render the carousel already debounced away). We
    // only drain on a vertical-dominant gesture, so horizontal swipes leave
    // the sim alone and the iOS cull-mask still kicks in for real page scroll.
    let horizontalGesture = false;
    let gestureStartX = 0;
    let gestureStartY = 0;

    // Opacity fade rides the shared gsap.ticker (raf.ts wraps it) rather than
    // a standalone requestAnimationFrame loop — keeps the "one RAF ticker"
    // invariant. `power2.out` matches the prior easeOutCubic (1-(1-t)^3); the
    // DRAIN_MS/REVEAL_MS timings are unchanged so the iOS cull-masking is too.
    const tweenOpacity = (to: number, durationMs: number, onComplete?: () => void) => {
      opacityTween?.kill();
      opacityTween = gsap.to(canvas, {
        opacity: to,
        duration: durationMs / 1000,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: () => {
          opacityTween = null;
          onComplete?.();
        },
      });
    };

    const clearSettle = () => {
      if (settleTimerId !== null) {
        window.clearTimeout(settleTimerId);
        settleTimerId = null;
      }
    };

    const drain = () => {
      if (drained) return;
      drained = true;
      clearSettle();
      tweenOpacity(0, DRAIN_MS, () => {
        rafPausedRef.current = true;
      });
    };

    const reveal = () => {
      if (!drained) return;
      drained = false;
      // Resume compute first, but stay at opacity 0 through the settle window
      // so the orchestrator's wall-clock reset-blink is never seen, then fade.
      rafPausedRef.current = false;
      clearSettle();
      settleTimerId = window.setTimeout(() => {
        settleTimerId = null;
        tweenOpacity(1, REVEAL_MS);
      }, REVEAL_SETTLE_MS);
    };

    const onScroll = () => {
      const y = window.scrollY;
      scrollAccumulator += Math.abs(y - lastScrollY);
      lastScrollY = y;
      if (!horizontalGesture && scrollAccumulator > SCROLL_DISTANCE_THRESHOLD) drain();

      // Reveal only after a full SCROLL_IDLE_COOLDOWN_MS of stillness — the
      // timer is reset on every scroll event, so slow/stop-start scrolling
      // keeps the sim drained instead of flickering it back in.
      if (idleTimerId !== null) window.clearTimeout(idleTimerId);
      idleTimerId = window.setTimeout(() => {
        idleTimerId = null;
        scrollAccumulator = 0;
        reveal();
      }, SCROLL_IDLE_COOLDOWN_MS);
    };

    // Classify each touch gesture by dominant axis; a clearly-horizontal drag
    // (carousel swipe) is flagged so onScroll skips drain() for its duration.
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      gestureStartX = t.clientX;
      gestureStartY = t.clientY;
      horizontalGesture = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - gestureStartX);
      const dy = Math.abs(t.clientY - gestureStartY);
      if (dx > dy && dx > 10) horizontalGesture = true;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      opacityTween?.kill();
      if (idleTimerId !== null) window.clearTimeout(idleTimerId);
      clearSettle();
      rafPausedRef.current = false;
      canvas.style.opacity = "1";
    };
  }, [reduced]);

  // RAF loop — gated by rafPausedRef so the scroll-drain can pause compute
  // while the canvas is faded out.
  useEffect(() => {
    if (reduced) return;
    let virtualElapsedMs = 0;
    const unsub = subscribe((deltaMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      if (rafPausedRef.current) return;
      const dt = Math.min(deltaMs * 0.001, MAX_DT_S);
      virtualElapsedMs += Math.min(deltaMs, MAX_DT_S * 1000);
      orchestrator.step(dt, virtualElapsedMs, pointerRef.current);
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
        // Same iOS-cull layer-promotion stack as SceneCanvas. Together with
        // the scroll-drain (opacity 0 while scrolling) the momentum-scroll
        // cull lands on an already-transparent layer -> no visible blink.
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
        contain: "paint",
        isolation: "isolate",
      }}
    />
  );
}
