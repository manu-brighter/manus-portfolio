"use client";

import type { CSSProperties, ReactNode } from "react";
import { useHoverOrCenterViewport } from "@/hooks/useHoverOrCenterViewport";

/**
 * Wraps a single Off-the-screen tile so its hover-driven choreography
 * (rotate, flood, caption-shift) can also fire on viewport-entry on
 * coarse-pointer devices. Desktop path unchanged: CSS `hover:` rules
 * keep firing on mouse-enter. Mobile path: useHoverOrCenterViewport
 * sets `data-active="true"` while the tile overlaps the central 35%
 * viewport band, and the matching `data-[active=true]:*` Tailwind
 * variants mirror the hover effects.
 *
 * Reduced-motion: IO gate disabled. The data-active state drives a
 * 280ms transition (rotate + translate). Reduced-motion users get the
 * static neutral state and never see the choreography — matches the
 * other coarse-pointer hover→IO replacements (WorkCard,
 * PortfolioCardReveal, PlaygroundCard).
 */
type Props = {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function TileFigure({ className, style, children }: Props) {
  const { ref, active } = useHoverOrCenterViewport<HTMLElement>();

  return (
    <figure ref={ref} data-active={active ? "true" : undefined} className={className} style={style}>
      {children}
    </figure>
  );
}
