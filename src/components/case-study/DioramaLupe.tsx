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
 * Position: anchored ABOVE the Admin card so the lens overlaps the
 * upper portion of the polaroid from outside the card. Animation is a
 * generous horizontal sweep (±10 viewBox units, ~±1.2vh) on a 4s sine
 * loop, gated on prefers-reduced-motion.
 */
export function DioramaLupe() {
  const reducedMotion = useReducedMotion();
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const g = groupRef.current;
    if (!g) return;
    const tween = gsap.fromTo(
      g,
      { x: -10 },
      {
        x: 10,
        duration: 4,
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
      aria-hidden="true"
      className="pointer-events-none absolute z-20"
      style={{ left: "145vh", top: "14vh", width: "18vh", height: "18vh" }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 145 145"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <g ref={groupRef} transform="rotate(-12 72 72)">
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
            x2={138}
            y2={138}
            stroke="var(--color-ink)"
            strokeWidth={6}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
