"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

gsap.registerPlugin(ScrollTrigger);

/**
 * Mobile-Rework Case-Study sim canvas.
 *
 * Sits behind the 4-station vertical scrolly. ScrollTrigger per station
 * fires a splat when each station passes through viewport centre, in the
 * spot color of the NEXT station — the splat becomes the visual bridge
 * between sections (mint → rose → amber → final settle).
 *
 * One canvas, one orchestrator (post-SF-3 factory), one WebGL2 context —
 * keeps iOS Safari's 8-context budget comfortable.
 */

type Props = {
  /** DOM ids of the 4 stations, in scroll order. */
  stationIds: readonly string[];
};

// Spot color of the splat that fires when each station passes 50% through
// viewport. Index N corresponds to station N's transition outward — its
// color signals the colour of the NEXT station's content.
const STATION_TRANSITION_COLOR: readonly SpotColor[] = ["mint", "rose", "amber", "violet"];

export function CaseStudyMobileSim({ stationIds }: Props) {
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

  // Init orchestrator on mount.
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

  // ScrollTrigger per station — splat at center-of-viewport when each
  // station crosses 50% through. Color = the NEXT station's mood.
  useEffect(() => {
    if (reduced) return;

    const triggers: ScrollTrigger[] = [];
    stationIds.forEach((id, i) => {
      const color = STATION_TRANSITION_COLOR[i];
      if (!color) return;
      const target = document.getElementById(id);
      if (!target) return;
      const trigger = ScrollTrigger.create({
        trigger: target,
        start: "center center",
        once: false,
        onEnter: () => {
          const orchestrator = orchestratorRef.current;
          if (!orchestrator) return;
          const rgb = SPOT_RGB[color];
          // Multi-burst: a centre splat + two flanking offsets give the
          // transition a wider visible impact than a single point-splat.
          // Manuel's read of the previous single-splat behind bg-paper:
          // "viel text und langweiliger vertical scroll, hast du da
          // überhaupt was gemacht" — making the sim genuinely visible
          // here is the entire point of the per-station transition.
          orchestrator.injectSplat(0.5, 0.45, rgb, 0, -0.35, 0.05);
          orchestrator.injectSplat(0.3, 0.55, rgb, -0.25, -0.2, 0.04);
          orchestrator.injectSplat(0.7, 0.55, rgb, 0.25, -0.2, 0.04);
        },
      });
      triggers.push(trigger);
    });

    return () => {
      for (const trigger of triggers) trigger.kill();
    };
  }, [stationIds, reduced]);

  // RAF loop with IO-pause-gate.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inViewRef.current = entry.intersectionRatio > 0.1;
        }
      },
      { threshold: [0, 0.1, 0.5] },
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
      data-testid="cs-mobile-sim"
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    />
  );
}
