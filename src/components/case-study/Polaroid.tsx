"use client";

import type { CSSProperties, ReactNode } from "react";
import { PlateCornerMarks } from "@/components/about/PlateCornerMarks";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Polaroid — editorial photo-frame primitive used by the Case Study cards.
 *
 * Layers: paper-tint frame with 2px ink border, slight rotation (±3°), spot-color
 * offset shadow, optional caption strip below the photo, optional plate-corner-marks
 * (existing About primitive recycled).
 *
 * Under `prefers-reduced-motion: reduce`, rotation is forced to 0° per
 * spec §7 (vestibular-safety). The shadow and frame remain.
 */

type Props = {
  /** Aspect-ratio of the inner photo. "16/9" for landscape, "9/16" for phone. */
  aspect: "16/9" | "9/16" | "4/3";
  /** Rotation in degrees (±3 is the typical desktop range). 0 disables.
   * Forced to 0 under prefers-reduced-motion. */
  rotate?: number;
  /** Spot-color for offset shadow + plate-corner accent. */
  spot: "rose" | "amber" | "mint" | "violet";
  /** Photo content (`<picture>` or `<img>`). */
  children: ReactNode;
  /** Caption strip rendered below the photo (mono-font, dated/tagged feel). */
  caption?: string;
  /** Decorative datestamp ("2024.06"). Rendered top-right of frame. */
  datestamp?: string;
  /** Pass-through className for outer wrapper (sizing). */
  className?: string;
  /** When provided, the inner image-frame becomes a <button> that
   *  triggers this handler on click. The button is the FLIP source —
   *  the lightbox captures its bounding rect for the zoom animation.
   *  When omitted (legacy / non-clickable), the frame stays a <div>. */
  onClick?: () => void;
  /** When provided, decorates the inner button with
   *  data-lightbox-index, used by the parent CaseStudy to look up the
   *  source rect at open time. */
  lightboxIndex?: number;
};

const SPOT_VAR: Record<Props["spot"], string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
};

export function Polaroid({
  aspect,
  rotate = 0,
  spot,
  children,
  caption,
  datestamp,
  className,
  onClick,
  lightboxIndex,
}: Props) {
  const reducedMotion = useReducedMotion();
  const effectiveRotate = reducedMotion ? 0 : rotate;
  const cssVars = { "--polaroid-spot": SPOT_VAR[spot] } as CSSProperties;
  return (
    <figure
      // pt has its own clamp with a 1rem floor so the absolutely-
      // positioned datestamp (top-1 right-2, ~12px tall) doesn't clip
      // into the image. The shared `p-[clamp(0.5rem,1.2vh,1rem)]`
      // resolved to 8-11px on mobile heights, leaving the datestamp's
      // bottom edge overlapping the inner image div. Split into
      // explicit px / pb / pt so the pt floor doesn't depend on
      // Tailwind's CSS source order beating the shorthand `p-*`.
      className={`plate-corners relative inline-block bg-paper-tint px-[clamp(0.5rem,1.2vh,1rem)] pt-[clamp(1rem,1.5vh,1.25rem)] pb-[clamp(0.5rem,1.2vh,1rem)] ${className ?? ""}`}
      style={{
        ...cssVars,
        transform: `rotate(${effectiveRotate}deg)`,
        boxShadow: `5px 5px 0 ${SPOT_VAR[spot]}`,
      }}
    >
      <PlateCornerMarks />
      {onClick ? (
        // Stays a <div> (NOT a <button>) so default button user-agent styles
        // and the `block w-full` reset can't perturb the card-layout geometry
        // we tuned in the responsive-fix sprint. ARIA role + keyboard handler
        // gives the same accessibility as a real button. The cursor + focus
        // ring + hover-scale read identically.
        // biome-ignore lint/a11y/useSemanticElements: real <button> default UA styling perturbed the diorama card-layout geometry; div+role=button is the documented workaround (see commit 838d12a)
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
          aria-haspopup="dialog"
          data-lightbox-index={lightboxIndex}
          className="relative overflow-hidden border-[1.5px] border-ink cursor-zoom-in transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none motion-reduce:hover:scale-100"
          style={{ aspectRatio: aspect }}
        >
          {children}
        </div>
      ) : (
        <div
          className="relative overflow-hidden border-[1.5px] border-ink"
          style={{ aspectRatio: aspect }}
        >
          {children}
        </div>
      )}
      {datestamp ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-2 font-mono text-[clamp(0.5rem,0.65vh,0.6rem)] tracking-[0.16em] text-ink-muted"
        >
          {datestamp}
        </span>
      ) : null}
      {caption ? (
        // Mono uppercase + tracking-0.18em pushes the caption past
        // narrow mobile polaroid widths. Force break-anywhere via
        // inline style — Tailwind's arbitrary `[overflow-wrap:...]`
        // wasn't reliably picking up on the Anmeldeformular shot, so
        // the caption was leaking out of the card. Inline style
        // guarantees the property gets applied regardless of utility-
        // class compilation. Tighter tracking on mobile too.
        <figcaption
          className="mt-2 font-mono text-[clamp(0.5rem,0.75vh,0.7rem)] tracking-[0.12em] text-ink-muted uppercase md:tracking-[0.18em]"
          style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
