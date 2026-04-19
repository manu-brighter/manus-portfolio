import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

/**
 * Home — Phase 2 hero placeholder wired through next-intl.
 *
 * The fluid sim arrives in Phase 4. Until then this page proves the
 * editorial layout works across all 4 locales: right-aligned Instrument
 * Serif italic anchored to the right edge, left mono-stamp column for
 * biographical meta. The left margin must read as "breathing room" —
 * that's the slot the fluid will eventually fill.
 *
 * Mono stamps (Section 00 · Hero, zvoove AG · Frontend, …) stay in the
 * source literal form across locales by design: in the Riso editorial
 * language of plan §6.3 they read as typographic ornaments, not
 * translatable prose. Still piped through messages so Phase 6 can swap
 * per-locale if the stamp copy earns its keep.
 */
type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default function HomePage({ params }: HomePageProps) {
  const { locale } = use(params);
  setRequestLocale(locale);

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
        {t("heading.family")} <span className="not-italic">/</span> {t("heading.given")}
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
