"use client";

import { useEffect, useRef } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  createFluidOrchestrator,
  type FluidOrchestrator,
  type PointerState,
} from "@/lib/gl/fluidOrchestrator";
import { SPOT_RGB, type SpotColor } from "@/lib/palette";
import { MAX_DT_S, subscribe } from "@/lib/raf";

type Props = {
  /** Current slide's spot color — drives the splat that fires when index changes. */
  spot: SpotColor;
  /**
   * Slide index. Used as a re-trigger key: when it changes we inject a
   * new splat in the current `spot` color so the user sees a colored
   * burst on each swipe.
   */
  index: number;
};

/**
 * Mobile-Rework Photography swiper sim canvas.
 *
 * Sits behind the horizontal swiper container; each swipe injects a
 * splat in the incoming slide's spot color. Replaces the 5 separate
 * PhotoInkMask WebGL2 contexts (Desktop) with a single pooled context
 * that survives all swipes — keeps iOS Safari's 8-context budget
 * comfortable (Hero sim + Case-Study sim + this = 3).
 *
 * No touch handlers — the swiper's native `scroll-snap-x` handles touch,
 * and we just react to index changes via the splat re-trigger.
 */
export function PhotoSwiperSim({ spot, index }: Props) {
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
  const inViewRef = useRef(true);

  const { capability } = useGPUCapability();
  const config = capability.config;
  const reduced = useReducedMotion();

  // Init orchestrator on mount, dispose on unmount.
  useEffect(() => {
    if (reduced) return;
    if (!config) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    orchestrator.injectSplat(-1, -1, [0, 0, 0], 0, 0); // warmup
    orchestrator.start();
    orchestratorRef.current = orchestrator;

    const onResize = () => {
      sizeCanvas();
      orchestratorRef.current?.resize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [config, reduced]);

  // Splat re-trigger: every time `index` (or `spot`) changes, fire a
  // splat in the new spot color at viewport centre with a small downward
  // velocity for a settling-ink feel.
  useEffect(() => {
    if (reduced) return;
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;
    const color = SPOT_RGB[spot];
    orchestrator.injectSplat(0.5, 0.55, color, 0, -0.25);
  }, [spot, index, reduced]);

  // RAF loop with IO-pause-gate.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inViewRef.current = entry.intersectionRatio > 0.2;
        }
      },
      { threshold: [0, 0.2, 0.5] },
    );
    io.observe(canvas);

    const unsubRaf = subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      if (!inViewRef.current) return;
      const dt = Math.min(deltaMs * 0.001, MAX_DT_S);
      orchestrator.step(dt, elapsedMs, pointerRef.current);
    }, 15);

    return () => {
      io.disconnect();
      unsubRaf();
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="photo-swiper-sim"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    />
  );
}
