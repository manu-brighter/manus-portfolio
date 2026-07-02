"use client";

import { useEffect, useRef, useState } from "react";
import { useOrchestratorRAF } from "@/hooks/useOrchestratorRAF";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FluidOrchestrator, type PointerState } from "@/lib/gl/fluidOrchestrator";
import { capDPR, DPR_MINI, getTierConfig } from "@/lib/gpu";
import { syncPresetVisuals } from "@/lib/simPresetStore";

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
  // Local init-failure flag — flipped if the orchestrator throws during
  // setup (most commonly EXT_color_buffer_float missing on the older
  // mobile drivers we target). Rendering null in that case lets the
  // parent card's static SVG visual remain visible underneath.
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

    // DPR capped at 1.5 — these mini-frames are tiny on screen, no
    // need to push 2x pixels through the toon shader's posterize pass.
    const dpr = capDPR(DPR_MINI);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);

    let orchestrator: FluidOrchestrator;
    try {
      orchestrator = new FluidOrchestrator();
      orchestrator.init(gl, getTierConfig("minimal"));
      orchestrator.setAmbientEnabled(true);
      orchestrator.triggerAmbient();
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: init failure is a dev signal
      console.error("[InkDropMiniSim] orchestrator init failed", err);
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
