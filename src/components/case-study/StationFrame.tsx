"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { lerpPath } from "@/lib/pathTween";

/**
 * StationFrame — per-station wrapper that fires an ink-akzent on viewport entry.
 *
 * Visual: a hidden SVG-mask path morphs from "spread ink-blob" → "rectangle = the
 * station's bounding box" via `lerpPath`. The masked station content fades to
 * full opacity as the path settles. Spot-color rotates per station.
 */

type Props = {
  spot: "rose" | "amber" | "mint" | "violet";
  children: ReactNode;
  /** Optional explicit width (px). Default: 100vw. */
  width?: number;
};

// Both paths must have identical command structure for `lerpPath` to
// interpolate them (same command sequence, same coord-count per command).
// Layout: M + 4 Q + Z. The Z is skipped by the parser (not in the
// [MLQCmlqc] alphabet) and re-emitted unchanged. Each Q has 4 coords.
const BLOB_PATH =
  "M 100 250 Q 50 100, 250 80 Q 450 60, 470 250 Q 490 400, 250 420 Q 100 410, 100 250 Z";
const RECT_PATH = "M 0 0 Q 250 0, 500 0 Q 500 250, 500 500 Q 250 500, 0 500 Q 0 250, 0 0 Z";

export function StationFrame({ spot, children, width }: Props) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const uid = useId();
  const maskId = `station-mask-${uid}`;

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    const path = pathRef.current;
    if (!container || !path) return;

    let progress = 0;
    let frameRequested = false;

    const update = () => {
      frameRequested = false;
      path.setAttribute("d", lerpPath(BLOB_PATH, RECT_PATH, progress));
    };

    const tween = gsap.to(
      { p: 0 },
      {
        p: 1,
        duration: 1.4,
        ease: "power2.inOut",
        paused: true,
        onUpdate() {
          progress = this.targets()[0].p;
          if (!frameRequested) {
            frameRequested = true;
            window.requestAnimationFrame(update);
          }
        },
      },
    );

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
      { threshold: 0.4 },
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
      className="relative h-screen flex-shrink-0"
      style={{ width: width ?? "100vw" }}
    >
      {!reducedMotion ? (
        <svg className="absolute size-0" aria-hidden="true">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="500" height="500" fill="black" />
              <path ref={pathRef} d={BLOB_PATH} fill="white" />
            </mask>
          </defs>
        </svg>
      ) : null}
      <div
        className="relative h-full w-full"
        style={
          !reducedMotion ? { mask: `url(#${maskId})`, WebkitMask: `url(#${maskId})` } : undefined
        }
      >
        {children}
      </div>
      {!reducedMotion ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-8 bottom-12 size-12 rounded-full opacity-40 blur-[8px]"
          style={{ backgroundColor: `var(--color-spot-${spot})` }}
        />
      ) : null}
    </div>
  );
}
