import { useTranslations } from "next-intl";
import { OverprintReveal } from "@/components/motion/OverprintReveal";

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
      className="container-page grid-12 relative min-h-[calc(100dvh-9rem)] items-end gap-y-12 py-16 md:py-24"
    >
      <div className="stamp-column col-span-12 self-start text-ink-muted md:col-span-4">
        <span className="type-label">{t("statusStamps.section")}</span>
        <span className="type-label">{t("statusStamps.status")}</span>
      </div>

      <h1 id="hero-heading" className="type-display col-span-12 text-ink md:col-span-12">
        <OverprintReveal text={t("heading.family")} className="inline-block" waitForLoader />
        <span aria-hidden="true" className="not-italic inline-block">
          &nbsp;/&nbsp;
        </span>
        <OverprintReveal
          text={t("heading.given")}
          className="inline-block"
          delay={0.25}
          waitForLoader
        />
      </h1>

      <div className="stamp-column col-span-12 md:col-span-5">
        <span className="type-label-stamp">{t("bioStamps.role")}</span>
        <span className="type-label-stamp">{t("bioStamps.sideProject")}</span>
        <span className="type-label-stamp">{t("bioStamps.location")}</span>
      </div>

      <p className="type-body-lg col-span-12 ml-auto text-right text-ink-soft md:col-span-7">
        {t("tagline")}
        <span aria-hidden="true"> — </span>
        <em>{t("taglineSuffix")}</em>
      </p>
    </section>
  );
}
