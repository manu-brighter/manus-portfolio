"use client";

/**
 * Shared coarse-pointer hover-replacement IO hook.
 *
 * On coarse-pointer + non-reduced-motion: attaches an
 * IntersectionObserver to the returned ref, flipping `active` true when
 * the observed element overlaps the central 35% vertical viewport band
 * (`rootMargin: -32.5% 0px -32.5% 0px`, `threshold: 0`). Mirrors the
 * heuristic shared across WorkCard / PortfolioCardReveal /
 * PlaygroundCard / TileFigure — extracting it forces those sites to
 * stay calibrated to the same value.
 *
 * Desktop pointer-enter / pointer-leave stays in the consumer because
 * each site varies (small differences in what "enter" means — set
 * activated + hovered, vs just hovered, etc.). This hook covers the
 * mobile-IO half only.
 */

import { useEffect, useRef, useState } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function useHoverOrCenterViewport<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  active: boolean;
} {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);
  const reducedMotion = useReducedMotion();
  const isCoarse = useCoarsePointer();

  useEffect(() => {
    if (!isCoarse || reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setActive(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-32.5% 0px -32.5% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isCoarse, reducedMotion]);

  return { ref, active };
}
