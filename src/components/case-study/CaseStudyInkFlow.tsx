"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dispatchSplat, type SplatColorName } from "@/lib/fluidBus";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * CaseStudyInkFlow — section enter/exit ink dispatch.
 *
 * Replaces the previous InkSweep (paper-shade SVG ellipse sweep) which
 * read as a brown overlay rather than ink. This component renders
 * nothing visually itself — it just dispatches a wave of colored splats
 * via the existing splat-bus (`src/lib/fluidBus.ts`, Phase 7) to the
 * persistent Hero-FluidSim (Phase 9 deviation: sim runs everywhere as
 * a full-screen WebGL canvas behind all content). The sim's actual
 * Navier-Stokes ink propagation is what the visitor sees — real wet
 * ink flowing through the viewport, advecting + dissipating.
 *
 * Enter (or re-enter scrolling up): 8 splats spread along the right
 * edge with leftward velocity. The wave sweeps left across the
 * viewport. Each splat staggered ~75ms so the wave reads as flowing,
 * not single-burst.
 *
 * Exit (or scroll-back-out): mirrored — splats from left edge,
 * rightward velocity.
 *
 * Reduced-motion: no dispatch.
 */

const SPLAT_COLORS: readonly SplatColorName[] = ["rose", "amber", "mint", "violet"];
const SPLAT_STAGGER_MS = 75;

type SplatPlan = {
  x: number;
  y: number;
  color: SplatColorName;
  dx: number;
  dy: number;
};

// Splat positions are normalised 0..1 with origin at canvas bottom-left
// (per fluidBus convention). 8 splats spread vertically y=0.2..0.8 with
// slight horizontal scatter so the wave has texture.
function makeBatch(direction: -1 | 1): SplatPlan[] {
  return Array.from({ length: 8 }, (_, i) => {
    const baseX = direction === -1 ? 0.88 : 0.12;
    return {
      x: baseX - direction * 0.02 * (i % 3),
      y: 0.2 + (i / 8) * 0.6,
      // Non-null cast: SPLAT_COLORS has 4 entries, modulo 4 always lands.
      color: SPLAT_COLORS[i % SPLAT_COLORS.length] as SplatColorName,
      dx: direction * (0.09 + (i % 3) * 0.02),
      dy: ((i % 2) - 0.5) * 0.025,
    };
  });
}

const ENTER_BATCH = makeBatch(-1);
const EXIT_BATCH = makeBatch(+1);

export function CaseStudyInkFlow() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const dispatchBatch = (batch: SplatPlan[]) => {
      const timers: number[] = [];
      batch.forEach((splat, i) => {
        const t = window.setTimeout(() => {
          dispatchSplat({
            x: splat.x,
            y: splat.y,
            color: splat.color,
            dx: splat.dx,
            dy: splat.dy,
          });
        }, i * SPLAT_STAGGER_MS);
        timers.push(t);
      });
      return () => {
        for (const t of timers) window.clearTimeout(t);
      };
    };

    let cancelLast: (() => void) | null = null;

    const onEnter = () => {
      cancelLast?.();
      cancelLast = dispatchBatch(ENTER_BATCH);
    };
    const onExit = () => {
      cancelLast?.();
      cancelLast = dispatchBatch(EXIT_BATCH);
    };

    const st = ScrollTrigger.create({
      trigger: "#case-study",
      start: "top center",
      end: "bottom center",
      onEnter,
      onLeave: onExit,
      onEnterBack: onEnter,
      onLeaveBack: onExit,
    });

    return () => {
      st.kill();
      cancelLast?.();
    };
  }, [reducedMotion]);

  return null;
}
