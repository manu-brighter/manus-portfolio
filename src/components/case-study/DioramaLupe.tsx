"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * DioramaLupe — foreground overlay rendering the magnifier (Lupe) above
 * DioramaCards (specifically the Admin polaroid). Extracted from
 * DioramaIllustration so it can sit on top of cards in z-order rather
 * than behind them.
 *
 * Position: anchored ABOVE the Admin card (which now sits at left=140,
 * width=72 → horizontal center 176vh; wrapper width 18vh → left 167vh).
 * Animation is a generous horizontal sweep on the wrapper (±25vh) on a
 * 5.5s sine loop, gated on prefers-reduced-motion.
 */
export function DioramaLupe() {
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const w = wrapperRef.current;
    if (!w) return;
    const tween = gsap.fromTo(
      w,
      { x: "-25vh" },
      {
        x: "25vh",
        duration: 5.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
    );
    return () => {
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="pointer-events-none absolute z-20"
      style={{ left: "167vh", top: "8vh", width: "18vh", height: "18vh" }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 155 155"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <g transform="rotate(-12 72 72)">
          <circle cx={60} cy={60} r={55} fill="none" stroke="var(--color-ink)" strokeWidth={4} />
          <circle
            cx={60}
            cy={60}
            r={44}
            fill="var(--color-paper-tint)"
            opacity={0.4}
            stroke="var(--color-ink)"
            strokeWidth={1}
          />
          <line
            x1={100}
            y1={100}
            x2={142}
            y2={142}
            stroke="var(--color-ink)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx={146} cy={146} r={5} fill="var(--color-ink)" />
        </g>
      </svg>
    </div>
  );
}
