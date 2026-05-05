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
 * Position: tracked to the Admin card area in the diorama track. The
 * wrapper is absolute-positioned in vh units so it scrolls horizontally
 * with the rest of the track. Animation is a small horizontal wobble
 * (±1px) on a 1.5s sine loop, gated on prefers-reduced-motion.
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
      { x: -1 },
      {
        x: 1,
        duration: 1.5,
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
      style={{ left: "183vh", top: "36vh", width: "14vh", height: "14vh" }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 145 145"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <g ref={groupRef} transform="rotate(-12 72 72)">
          <circle cx={45} cy={45} r={55} fill="none" stroke="var(--color-ink)" strokeWidth={4} />
          <circle
            cx={45}
            cy={45}
            r={44}
            fill="var(--color-paper-tint)"
            opacity={0.4}
            stroke="var(--color-ink)"
            strokeWidth={1}
          />
          <line
            x1={91}
            y1={91}
            x2={140}
            y2={140}
            stroke="var(--color-ink)"
            strokeWidth={6}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
