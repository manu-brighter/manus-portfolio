"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Lupe — magnifier clipart, gently bobs ±2px y in a 3s sine loop when in viewport.
 */
export function Lupe({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const tl = gsap.to(el, {
      y: -2,
      duration: 1.5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <svg
      ref={ref}
      width={56}
      height={56}
      viewBox="0 0 56 56"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: "rotate(-12deg)" }}
    >
      <title>Magnifier</title>
      <g fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinecap="round">
        <circle cx={22} cy={22} r={14} />
        <circle cx={22} cy={22} r={10} stroke="var(--color-spot-amber)" strokeWidth={1} />
        <path d="M 32 32 L 46 46" />
        <path d="M 30 34 L 36 28" strokeWidth={3} stroke="var(--color-ink)" />
      </g>
    </svg>
  );
}
