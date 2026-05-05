"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * StationFrame — per-station wrapper. Each station fades in on viewport
 * entry and fades out on leave. Includes a small spot-color "wet-ink"
 * accent in the corner.
 *
 * Width default is 65vw (Phase-12 rework) so multiple stations are
 * visible simultaneously in the horizontal track — the cohesive
 * Foto-Workplace feel needs adjacent stations peeking in. Per-station
 * `offsetYVh` + `rotate` props give the table a hand-laid "scattered"
 * feel: each station sits at a slightly different vertical position +
 * rotation, deterministic per-index from CaseStudy.tsx.
 *
 * The original SVG-mask + path-tween "ink-blob → rectangle" morph
 * (Phase 12 first iteration) was dropped because:
 * (a) `maskUnits="userSpaceOnUse"` with 500×500 path coords didn't scale
 *     to actual station size (100vw × 100vh), so the mask cut off most
 *     content visually
 * (b) `objectBoundingBox` would require fully rewriting the path-tween
 *     primitive against 0–1 coordinates, which is more re-work than the
 *     decorative effect warrants
 *
 * The pathTween helper at `src/lib/pathTween.ts` stays in the codebase
 * for future use. The simple opacity fade-in is a clean fallback that
 * makes the horizontal-scroll choreography readable as the primary
 * effect.
 */

type Props = {
  spot: "rose" | "amber" | "mint" | "violet";
  children: ReactNode;
  /** Width in vw. Default 65 (Phase 12 rework — narrower for adjacency). */
  widthVw?: number;
  /** Vertical offset in vh (negative = up, positive = down). Default 0. */
  offsetYVh?: number;
  /** Rotation in degrees. Default 0. */
  rotate?: number;
};

export function StationFrame({ spot, children, widthVw, offsetYVh, rotate }: Props) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Under reduced-motion, no scatter — clean grid alignment.
  const effectiveOffsetY = reducedMotion ? 0 : (offsetYVh ?? 0);
  const effectiveRotate = reducedMotion ? 0 : (rotate ?? 0);

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    gsap.set(container, { opacity: 0 });

    const tween = gsap.to(container, {
      opacity: 1,
      duration: 0.6,
      ease: "power2.out",
      paused: true,
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            tween.play();
          } else {
            tween.reverse();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(container);

    return () => {
      io.disconnect();
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative mr-[6vw] h-screen flex-shrink-0 last:mr-0"
      style={{
        width: `${widthVw ?? 65}vw`,
        transform: `translateY(${effectiveOffsetY}vh) rotate(${effectiveRotate}deg)`,
      }}
    >
      {children}
      {!reducedMotion ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-8 bottom-12 size-12 rounded-full opacity-40 blur-[8px] motion-safe:animate-[ink-spot-pulse_4s_ease-in-out_infinite]"
          style={{ backgroundColor: `var(--color-spot-${spot})` }}
        />
      ) : null}
    </div>
  );
}
