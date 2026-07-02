"use client";

import { useEffect, useRef, useState } from "react";
import { useOrchestratorRAF } from "@/hooks/useOrchestratorRAF";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TYPE_AS_FLUID_DEFAULTS } from "@/lib/content/playground";
import { FluidOrchestrator, type PointerState } from "@/lib/gl/fluidOrchestrator";
import { capDPR, DPR_MINI, getTierConfig } from "@/lib/gpu";
import { randomSpot } from "@/lib/palette";
import { syncPresetVisuals } from "@/lib/simPresetStore";
import { TextStamper } from "@/lib/textStamp";

type Props = {
  /** True while the parent card is NOT hovered/focused. */
  paused: boolean;
};

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
  // Local init-failure flag — see InkDropMiniSim for rationale.
  const [initFailed, setInitFailed] = useState(false);

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
    if (!gl) {
      setInitFailed(true);
      return;
    }

    const dpr = capDPR(DPR_MINI);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);

    let orchestrator: FluidOrchestrator;
    try {
      orchestrator = new FluidOrchestrator();
      orchestrator.init(gl, {
        ...getTierConfig("minimal"),
        velocityDissipation: 0.94,
        // Faster fade than the full route's 0.995 — at this cadence
        // each word has to clear out of the way before the next one
        // lands, otherwise stamps stack into illegible mush. 0.985
        // means the previous word is at ~7% density by 3s, basically
        // gone by the time the next stamp arrives.
        dyeDissipation: 0.985,
        confinement: 8,
      });
      orchestrator.setAmbientEnabled(false);
      // Open the warmup gate so step() runs — TypeAsFluid drives the
      // dye field via TextStamper, no ambient kick needed.
      orchestrator.start();
      stamperRef.current = new TextStamper(gl, orchestrator);

      // Fire an initial stamp so the card has dye visible the moment
      // it cross-fades in (rather than blank paper for ~1s).
      const initial =
        TYPE_AS_FLUID_DEFAULTS.defaultWords[
          Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
        ] ?? "MANUEL";
      stamperRef.current.stampText(initial, randomSpot(), 1.4, 1);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: init failure is a dev signal
      console.error("[TypeAsFluidMiniSim] orchestrator/stamper init failed", err);
      setInitFailed(true);
      return;
    }
    orchestratorRef.current = orchestrator;
    // Inherit the active preset's look (visuals only) so the card
    // matches the hero sim's current character.
    const unsubPreset = syncPresetVisuals(orchestrator);

    const onResize = () => {
      const ratio = capDPR(DPR_MINI);
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
      unsubPreset();
      stamperRef.current?.dispose();
      stamperRef.current = null;
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [reducedMotion]);

  // Auto-stamp loop — only fires while the card is hovered (not paused).
  // 3000ms cadence pairs with the bumped dyeDissipation so each word
  // has room to fade before the next lands. setInterval over RAF
  // because stamping is expensive (rasterize + upload + blur) and we
  // want a fixed cadence, not per-frame.
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
    }, 3000);
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
  useOrchestratorRAF(orchestratorRef, pointerRef, 25, !reducedMotion);

  if (reducedMotion || initFailed) return null;

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
