"use client";

import { type ReactNode, useEffect, useRef } from "react";

/** Below this the copy stops being comfortably readable; clipping a few
 *  pixels is the lesser evil at that point (no real viewport gets here:
 *  the diorama hands over to the vertical fallback under 700px height). */
const MIN_SCALE = 0.72;
/** Binary-search steps — 7 halvings of [0.72, 1] land within 0.3%. */
const FIT_STEPS = 7;

type Props = {
  children: ReactNode;
};

/**
 * DioramaFit — keeps a diorama card's copy inside its vh-sized box.
 *
 * Card boxes are sized in vh, the copy in `clamp(rem, vh, rem)`. Below
 * ~1000px viewport height the rem floors win, so the text stays at a
 * readable size while the box keeps shrinking — and at 1536x730 (a
 * 1080p laptop at 125% scaling) the last feature rows of both highlight
 * cards were cut off by the card's `overflow: hidden`.
 *
 * When the card overflows, its content is laid out in a box enlarged by
 * 1/s and scaled back down by s, with s the largest factor that fits
 * (binary search, measured). Wider layout means fewer line breaks, so
 * the copy shrinks less than a plain scale-to-fit would. Cards that fit
 * keep scale 1 and are untouched.
 *
 * Cost: transform-only, re-measured on resize (ResizeObserver on the
 * stable outer box, which the scaling never changes, so no feedback
 * loop) and once fonts settle. Nothing runs per frame.
 */
export function DioramaFit({ children }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const apply = (s: number) => {
      const size = s === 1 ? "100%" : `${100 / s}%`;
      inner.style.width = size;
      inner.style.height = size;
      inner.style.transform = s === 1 ? "" : `scale(${s})`;
    };
    // The card root (first child) owns the `overflow: hidden` box.
    const fits = () => {
      const card = inner.firstElementChild as HTMLElement | null;
      if (!card) return true;
      return card.scrollHeight <= card.clientHeight + 1;
    };

    const fit = () => {
      apply(1);
      if (fits()) return;
      let lo = MIN_SCALE;
      let hi = 1;
      for (let i = 0; i < FIT_STEPS; i++) {
        const mid = (lo + hi) / 2;
        apply(mid);
        if (fits()) lo = mid;
        else hi = mid;
      }
      apply(lo);
    };

    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={outerRef} className="relative h-full w-full">
      <div ref={innerRef} className="h-full w-full origin-top-left">
        {children}
      </div>
    </div>
  );
}
