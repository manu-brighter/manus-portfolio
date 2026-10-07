"use client";

import { useTranslations } from "next-intl";
import { FadeIn } from "@/components/motion/FadeIn";
import { OverprintReveal } from "@/components/motion/OverprintReveal";
import { Link } from "@/i18n/navigation";

/**
 * Hero — Section 00.
 *
 * Right-aligned Instrument Serif italic anchored to the right edge
 * (never centered, never left); left-column mono stamps hold the
 * biographical meta. The left margin breathes — it's the Fluid's slot.
 *
 * Mono stamps (Section 00 · Hero, zvoove AG · Frontend, …) stay in the
 * source literal form across locales by design: in the Riso editorial
 * language of plan §6.3 they read as typographic ornaments, not
 * translatable prose. Still piped through messages so Phase 6 can swap
 * per-locale if the stamp copy earns its keep.
 *
 * Phase 5 reveal: the H1 surname + given name are each wrapped in an
 * `OverprintReveal` — rose + mint ghost copies drift in with ±2px
 * resting misregistration, then the ink glyphs land on top. See
 * `src/components/motion/OverprintReveal.tsx`.
 */
export function Hero() {
  const t = useTranslations("hero");

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="container-page grid-12 relative min-h-[calc(100svh-4.3125rem)] items-end gap-y-12 py-16 md:min-h-[calc(100dvh-9rem)] md:py-24"
    >
      <div className="stamp-column col-span-12 self-start text-ink-muted md:col-span-4">
        <span className="type-label">{t("statusStamps.section")}</span>
        <span className="type-label">{t("statusStamps.status")}</span>
      </div>

      {/* Mobile pr-4: italic Instrument Serif overhangs visually past
          the type's bounding box, the OverprintReveal rose ghost
          translates +2px past the ink, and iOS Safari's transient
          scroll indicator overlays the rightmost ~5px during scroll.
          1rem inset comfortably clears all three on iPhone Pro Max
          widths (430px). Desktop (md:pr-0) keeps the hero composition
          flush to the grid. */}
      <h1 id="hero-heading" className="type-display col-span-12 pr-4 text-ink md:pr-0">
        <OverprintReveal text={t("heading.family")} className="inline-block" waitForLoader />
        {/* Slash fades in alongside the reveal — mirroring delay 0.12s
            puts it between the two halves so it reads as the bridge,
            not pre-loaded furniture. */}
        <FadeIn className="not-italic inline-block" delay={0.12} waitForLoader ariaHidden>
          &nbsp;/&nbsp;
        </FadeIn>
        <OverprintReveal
          text={t("heading.given")}
          className="inline-block"
          delay={0.25}
          waitForLoader
        />
      </h1>

      <div className="stamp-column col-span-12 md:col-span-5">
        <span className="type-label-stamp">{t("bioStamps.sideProject")}</span>
        <span className="type-label-stamp">{t("bioStamps.location")}</span>
        {/* The one way out of the hero: a stamp like its siblings, set
            apart only by the arrow and the press-in hover (the Work CTA
            gesture). Last in the column so the column's bottom edge, which
            the Ink Studio hint is tuned to clear, does not move. min-h
            keeps the tap target at 28px on touch. */}
        <Link
          href="/cv"
          className="type-label-stamp min-h-7 gap-2 transition-[transform,box-shadow] duration-150 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none"
        >
          {t("cvLink")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="type-body-lg col-span-12 ml-auto text-right text-ink-soft md:col-span-7">
        {t("tagline")}
      </p>
    </section>
  );
}
