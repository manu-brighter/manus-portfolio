import clsx from "clsx";
import { FadeIn } from "@/components/motion/FadeIn";
import { OverprintReveal } from "@/components/motion/OverprintReveal";
import { SPOT_BG_CLASS, type SpotColor } from "@/lib/palette";

/**
 * SectionHeader — the shared editorial section header, now with the
 * entrance choreography every section except Hero was missing: label
 * fades up, headline plays the OverprintReveal misregistration, the
 * copy below trickles in staggered.
 *
 * Covers both header variants used across the page:
 *   - standard (About, Skills, Work, Contact): label / h2 / subhead
 *   - eyebrow  (Playground, Photography): label / eyebrow-with-dot /
 *     italic h2 / lede (+ optional stamp line)
 *
 * The heading `id` stays on the `<h2>` itself so `aria-labelledby`
 * wiring on the parent `<section>` and the Nav/ScrollProgress
 * scroll-spy are untouched. OverprintReveal ships its own sr-only +
 * aria-hidden composition, so the accessible heading name is exactly
 * `headline`.
 *
 * All motion primitives handle prefers-reduced-motion internally
 * (plain static render), so this component has no reduced branch of
 * its own.
 */

type SectionHeaderProps = {
  /** Left-column mono label (e.g. "01 — Arbeiten"). */
  label: string;
  /** id for the <h2>; parent section references it via aria-labelledby. */
  headingId: string;
  headline: string;
  /** Standard variant: body-lg line right below the headline. */
  subhead?: string;
  /** Eyebrow variant: small label with a spot-color dot above the h2. */
  eyebrow?: string;
  /** Fill color of the eyebrow dot (spot colors as fills only). */
  eyebrowSpot?: SpotColor;
  /** Eyebrow variant: lede paragraph below the headline. */
  lede?: string;
  /** Eyebrow variant: optional stamp line under the lede (Photography). */
  techLabel?: string;
  /** Italic display headline (Playground, Photography). */
  italicHeadline?: boolean;
  /** Extra classes on the <header> (container/margin variants). */
  className?: string;
};

export function SectionHeader({
  label,
  headingId,
  headline,
  subhead,
  eyebrow,
  eyebrowSpot = "violet",
  lede,
  techLabel,
  italicHeadline = false,
  className,
}: SectionHeaderProps) {
  return (
    <header className={clsx("grid-12 gap-y-4", className)}>
      <p className="col-span-12 text-ink-muted type-label md:col-span-4">
        <FadeIn y={10}>{label}</FadeIn>
      </p>
      <div className="col-span-12 md:col-span-8">
        {eyebrow !== undefined && (
          <p className="type-label inline-flex items-center gap-2 text-ink">
            <FadeIn y={10} className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={clsx("inline-block size-2", SPOT_BG_CLASS[eyebrowSpot])}
              />
              {eyebrow}
            </FadeIn>
          </p>
        )}
        <h2
          id={headingId}
          className={clsx(
            "type-h1 text-ink",
            italicHeadline && "italic",
            eyebrow !== undefined && "mt-4",
          )}
        >
          <OverprintReveal text={headline} />
        </h2>
        {subhead !== undefined && (
          <p className="type-body-lg mt-4 text-ink-soft">
            <FadeIn delay={0.3} y={10}>
              {subhead}
            </FadeIn>
          </p>
        )}
        {lede !== undefined && (
          <p className="type-body-lg mt-6 max-w-[55ch] text-ink-soft">
            <FadeIn delay={0.3} y={10}>
              {lede}
            </FadeIn>
          </p>
        )}
        {techLabel !== undefined && (
          <p className="type-label-stamp mt-8">
            <FadeIn delay={0.45} y={8}>
              {techLabel}
            </FadeIn>
          </p>
        )}
      </div>
    </header>
  );
}
