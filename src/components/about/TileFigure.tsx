"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Wraps a single Off-the-screen tile so its hover-driven choreography
 * (rotate, flood, caption-shift) can also fire on viewport-entry on
 * coarse-pointer devices. Desktop path unchanged: CSS `hover:` rules
 * keep firing on mouse-enter. Mobile path: an IntersectionObserver
 * sets `data-active="true"` while the tile is in viewport, and the
 * matching `data-[active=true]:*` Tailwind variants mirror the hover
 * effects.
 *
 * Reduced-motion: IO gate disabled. The data-active state drives a
 * 280ms transition (rotate + translate). Reduced-motion users get the
 * static neutral state and never see the choreography — matches the
 * other 3 coarse-pointer hover→IO replacements (WorkCard,
 * PortfolioCardReveal, PlaygroundCard).
 */
type Props = {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function TileFigure({ className, style, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const reducedMotion = useReducedMotion();
  const [isCoarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    if (!isCoarse || reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    // Middle-35% band: tile activates when it's genuinely mid-screen,
    // not just past the upper third. Matches the other coarse-pointer
    // hover→scroll replacements.
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

  return (
    <figure ref={ref} data-active={active ? "true" : undefined} className={className} style={style}>
      {children}
    </figure>
  );
}
