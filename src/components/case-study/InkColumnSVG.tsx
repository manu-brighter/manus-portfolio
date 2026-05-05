"use client";

// SVG-based animated ink-column overlay for the case-study diorama.
//
// Replaces the prior WebGL fluid-sim approach (`InkColumnFluidSim`).
// The fluid sim was the wrong abstraction — Manuel's reference sketch
// calls for two solid, sharp-edged dark-ink shapes pinned to the left
// and right viewport edges, bauchy in the middle and tapering at top
// and bottom. Fluid dynamics produced hectic blinking dots that bore
// no resemblance to the sketch.
//
// This component renders two `<path>` elements inside a fixed-position
// SVG covering the viewport. The shape "breathes" via 12 staggered
// GSAP yoyo tweens (6 per column) on numeric state values that drive
// the bezier control points. A single `gsap.ticker` callback writes
// the current `d` attribute each frame — no React re-renders.
//
// Reduced-motion: renders the static rest-state path only.
// No mobile gating here (this is purely DOM SVG, no GPU cost) — the
// case-study mobile fallback in `CaseStudy.tsx` doesn't render the
// diorama at all on <768px, so this component is naturally hidden
// on mobile by virtue of not being mounted there.

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ColumnState = {
  taperTop: number;
  taperBottom: number;
  bauchUpperX: number;
  bauchUpperY: number;
  bauchLowerX: number;
  bauchLowerY: number;
};

const REST_STATE: ColumnState = {
  taperTop: 3,
  taperBottom: 3,
  bauchUpperX: 12,
  bauchUpperY: 35,
  bauchLowerX: 12,
  bauchLowerY: 65,
};

function leftPath(s: ColumnState): string {
  return (
    `M 0 0 L 0 100 L ${s.taperBottom.toFixed(2)} 100 ` +
    `C ${s.bauchLowerX.toFixed(2)} ${s.bauchLowerY.toFixed(2)}, ` +
    `${s.bauchUpperX.toFixed(2)} ${s.bauchUpperY.toFixed(2)}, ` +
    `${s.taperTop.toFixed(2)} 0 Z`
  );
}

function rightPath(s: ColumnState): string {
  return (
    `M 100 0 L 100 100 L ${(100 - s.taperBottom).toFixed(2)} 100 ` +
    `C ${(100 - s.bauchLowerX).toFixed(2)} ${s.bauchLowerY.toFixed(2)}, ` +
    `${(100 - s.bauchUpperX).toFixed(2)} ${s.bauchUpperY.toFixed(2)}, ` +
    `${(100 - s.taperTop).toFixed(2)} 0 Z`
  );
}

export function InkColumnSVG() {
  const reducedMotion = useReducedMotion();
  const leftRef = useRef<SVGPathElement>(null);
  const rightRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (reducedMotion) return;

    // Two independent state objects — left + right breathe out of phase.
    const left: ColumnState = { ...REST_STATE };
    const right: ColumnState = { ...REST_STATE };

    const tweens: gsap.core.Tween[] = [];

    // Each axis gets ONE yoyo tween from `lo` to `hi`. The initial
    // value is set to `lo` so the yoyo motion sweeps the full range.
    // Staggered durations + odd ratios across axes ensure the loops
    // never sync — pure organic compound motion.
    const stagger = (
      state: ColumnState,
      key: keyof ColumnState,
      lo: number,
      hi: number,
      dur: number,
      delay: number,
    ) => {
      state[key] = lo;
      tweens.push(
        gsap.to(state, {
          [key]: hi,
          duration: dur,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay,
        }),
      );
    };

    // Left column: 6 axes, staggered durations, in-phase start.
    stagger(left, "taperTop", 2.4, 3.6, 11, 0);
    stagger(left, "taperBottom", 2.4, 3.6, 10, 0);
    stagger(left, "bauchUpperX", 10, 14, 6, 0);
    stagger(left, "bauchUpperY", 28, 42, 7, 0);
    stagger(left, "bauchLowerX", 10, 14, 9, 0);
    stagger(left, "bauchLowerY", 58, 72, 8, 0);

    // Right column: same axes, slightly different bounds and durations,
    // out-of-phase delays so left and right never resemble each other.
    stagger(right, "taperTop", 2.4, 3.6, 10.5, 1.7);
    stagger(right, "taperBottom", 2.4, 3.6, 11.5, 2.3);
    stagger(right, "bauchUpperX", 10, 14, 6.5, 1.1);
    stagger(right, "bauchUpperY", 30, 44, 7.5, 2.5);
    stagger(right, "bauchLowerX", 10, 14, 9.5, 0.9);
    stagger(right, "bauchLowerY", 56, 70, 8.5, 1.4);

    const onTick = () => {
      leftRef.current?.setAttribute("d", leftPath(left));
      rightRef.current?.setAttribute("d", rightPath(right));
    };
    gsap.ticker.add(onTick);

    return () => {
      gsap.ticker.remove(onTick);
      for (const t of tweens) t.kill();
    };
  }, [reducedMotion]);

  // Initial paint — both branches render the rest state. When motion
  // is enabled, the GSAP ticker overwrites `d` from frame 1 onward.
  const initialLeft = leftPath(REST_STATE);
  const initialRight = rightPath(REST_STATE);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none fixed inset-0 z-30"
      style={{ width: "100vw", height: "100vh" }}
    >
      <path ref={leftRef} d={initialLeft} fill="var(--color-ink)" />
      <path ref={rightRef} d={initialRight} fill="var(--color-ink)" />
    </svg>
  );
}
