"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PenScribble — circular scribble that "draws itself" once on viewport-entry.
 */
export function PenScribble({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            gsap.to(path, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" });
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(path);
    return () => {
      io.disconnect();
    };
  }, [reducedMotion]);

  return (
    <svg
      width={64}
      height={48}
      viewBox="0 0 64 48"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <title>Pen scribble</title>
      <path
        ref={pathRef}
        d="M 8 24 Q 20 8, 32 16 T 56 12 Q 48 28, 28 32 T 12 36"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
