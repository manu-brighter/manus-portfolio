"use client";

import { useEffect, useRef } from "react";
import { FluidOrchestrator, type PointerState } from "@/components/scene/FluidOrchestrator";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getTierConfig } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";

type Props = {
  /** True while the parent card is NOT hovered/focused — orchestrator
   *  is paused but state preserved, so re-hover resumes instantly. */
  paused: boolean;
};

/**
 * Tiny FluidOrchestrator running at the "minimal" GPU tier (96² grid),
 * driven entirely by the orchestrator's built-in ambient wandering
 * points. No user input needed — the demo runs itself.
 *
 * Lifecycle:
 *   - Mount: build context + orchestrator, kick ambient at full
 *     strength, subscribe to the shared RAF.
 *   - When paused: orchestrator.pause(), stops sim work but the
 *     dye/velocity state is preserved so resume picks up cleanly.
 *   - Unmount: dispose orchestrator, drop the GL context.
 *
 * Reduced motion: render nothing — caller falls back to the static
 * SVG underneath.
 */
export function InkDropMiniSim({ paused }: Props) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0.5,
    y: 0.5,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
  });

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) return;

    // DPR capped at 1.5 — these mini-frames are tiny on screen, no
    // need to push 2× pixels through the toon shader's posterize pass.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);

    const orchestrator = new FluidOrchestrator();
    orchestrator.init(gl, getTierConfig("minimal"));
    orchestrator.setAmbientEnabled(true);
    orchestrator.triggerAmbient();
    orchestratorRef.current = orchestrator;

    const onResize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * ratio);
      const h = Math.floor(canvas.clientHeight * ratio);
      canvas.width = w;
      canvas.height = h;
      orchestrator.resize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [reducedMotion]);

  // Sync paused prop into orchestrator each render. Cheap.
  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;
    if (paused) orchestrator.pause();
    else orchestrator.resume();
  }, [paused]);

  // RAF loop — gsap.ticker shared. Pausing happens inside step().
  useEffect(() => {
    if (reducedMotion) return;
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const dt = Math.min(deltaMs * 0.001, 0.033);
      orchestrator.step(dt, elapsedMs, pointerRef.current);
      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, 25);
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      className="block h-full w-full"
      style={{ pointerEvents: "none", touchAction: "none" }}
    />
  );
}
