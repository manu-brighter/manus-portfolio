"use client";

import { useEffect, useRef } from "react";
import { FluidOrchestrator, type PointerState } from "@/components/scene/FluidOrchestrator";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TYPE_AS_FLUID_DEFAULTS } from "@/lib/content/playground";
import { getTierConfig } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";
import { TextStamper } from "@/lib/textStamp";

type Props = {
  /** True while the parent card is NOT hovered/focused. */
  paused: boolean;
};

const SPOT_KEYS = ["rose", "amber", "mint", "violet"] as const;
function randomSpot(): "rose" | "amber" | "mint" | "violet" {
  return SPOT_KEYS[Math.floor(Math.random() * SPOT_KEYS.length)] ?? "rose";
}

/**
 * Tiny self-driven Type-as-Fluid demo for the home-card hover state.
 *
 * Runs the same TextStamper pipeline as the experiment route but at
 * "minimal" GPU tier and with a faster default-word rotation (every
 * 1.8s vs 7s on the full route) so a brief hover shows multiple words
 * cycling. Same calm-paper baseline as the route — ambient OFF, slow
 * dye dissipation.
 */
export function TypeAsFluidMiniSim({ paused }: Props) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const stamperRef = useRef<TextStamper | null>(null);
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

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);

    const orchestrator = new FluidOrchestrator();
    orchestrator.init(gl, {
      ...getTierConfig("minimal"),
      velocityDissipation: 0.95,
      dyeDissipation: 0.995,
      confinement: 8,
    });
    orchestrator.setAmbientEnabled(false);
    orchestratorRef.current = orchestrator;
    stamperRef.current = new TextStamper(gl, orchestrator);

    // Fire an initial stamp so the card has dye visible the moment
    // it cross-fades in (rather than blank paper for ~1s).
    const initial =
      TYPE_AS_FLUID_DEFAULTS.defaultWords[
        Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
      ] ?? "MANUEL";
    stamperRef.current.stampText(initial, randomSpot(), 1.4, 1);

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
      stamperRef.current?.dispose();
      stamperRef.current = null;
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [reducedMotion]);

  // Auto-stamp loop — only fires while the card is hovered (not paused).
  // setInterval over RAF here because stamping is expensive (rasterize +
  // upload + blur) and we want a fixed 1.8s cadence rather than per-frame.
  useEffect(() => {
    if (reducedMotion || paused) return;
    const handle = window.setInterval(() => {
      const stamper = stamperRef.current;
      if (!stamper) return;
      const word =
        TYPE_AS_FLUID_DEFAULTS.defaultWords[
          Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
        ] ?? "MANUEL";
      stamper.stampText(word, randomSpot(), 1.4, 1);
    }, 1800);
    return () => window.clearInterval(handle);
  }, [paused, reducedMotion]);

  // Pause/resume the orchestrator with the parent's hover state.
  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;
    if (paused) orchestrator.pause();
    else orchestrator.resume();
  }, [paused]);

  // Shared RAF.
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
