import { useTranslations } from "next-intl";
import { PortfolioCardVisual } from "@/components/ui/PortfolioCardVisual";
import { WorkCard } from "@/components/ui/WorkCard";

/**
 * Work — Section 03.
 *
 * Two cards. No three-column grid. Each card claims roughly half the
 * container width and the second drops vertically so the eye walks
 * the page diagonally — Riso editorial layout, not a directory listing.
 *
 * Card 1 (Portfolio, this site) is the meta-flex; card 2 (Jogge di
 * Balla) leads into the Phase-8 case study via the `#case-study`
 * anchor (resolves to nothing in Phase 7, will resolve once Phase 8
 * adds the section). See briefing §4 + §15 — the briefing reduced
 * the original plan's "3–6 projects" to two intentional ones.
 *
 * Translation deferred — DE source mirrored across EN/FR/IT until a
 * later pass.
 */

type WorkProject = {
  id: string;
  title: string;
  subtitle?: string;
  year: string;
  role: string;
  stack: string[];
  description: string;
  metaNote?: string;
  ctaLabel: string;
  screenshot?: {
    alt: string;
    caption?: string;
  };
};

export function Work() {
  const t = useTranslations("work");
  const projects = t.raw("projects") as WorkProject[];
  const vibecodedLabel = t("vibecodedStamp");

  // Hard-coded order matches briefing §4: Portfolio first (meta-card),
  // Jogge di Balla second. We look up by id rather than relying on
  // array position so future content edits in the JSON can't silently
  // reorder without an explicit code change.
  const portfolio = projects.find((p) => p.id === "portfolio");
  const joggediballa = projects.find((p) => p.id === "joggediballa");

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="container-page relative py-20 md:py-28"
    >
      <header className="grid-12 mb-16 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <h2 id="work-heading" className="type-h1 text-ink">
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-4 text-ink-soft">{t("subhead")}</p>
        </div>
      </header>

      <div className="grid-12 gap-y-16 md:gap-y-24">
        {portfolio ? (
          <div className="col-span-12 md:col-span-7">
            <WorkCard
              id={portfolio.id}
              title={portfolio.title}
              subtitle={portfolio.subtitle}
              year={portfolio.year}
              role={portfolio.role}
              stack={portfolio.stack}
              description={portfolio.description}
              metaNote={portfolio.metaNote}
              ctaLabel={portfolio.ctaLabel}
              splatColor="rose"
              vibecoded
              vibecodedLabel={vibecodedLabel}
              click={{ kind: "scroll-hero" }}
              media={<PortfolioCardVisual className="absolute inset-0 h-full w-full" />}
            />
          </div>
        ) : null}

        {joggediballa ? (
          <div className="col-span-12 md:col-start-6 md:col-span-7 md:mt-32">
            <WorkCard
              id={joggediballa.id}
              title={joggediballa.title}
              subtitle={joggediballa.subtitle}
              year={joggediballa.year}
              role={joggediballa.role}
              stack={joggediballa.stack}
              description={joggediballa.description}
              ctaLabel={joggediballa.ctaLabel}
              splatColor="amber"
              vibecoded
              vibecodedLabel={vibecodedLabel}
              click={{ kind: "anchor", target: "#case-study" }}
              media={
                <picture className="block h-full w-full">
                  <source
                    type="image/avif"
                    srcSet="/projects/joggediballa/home-480w.avif 480w, /projects/joggediballa/home-800w.avif 800w, /projects/joggediballa/home-1200w.avif 1200w"
                    sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
                  />
                  <source
                    type="image/webp"
                    srcSet="/projects/joggediballa/home-480w.webp 480w, /projects/joggediballa/home-800w.webp 800w, /projects/joggediballa/home-1200w.webp 1200w"
                    sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
                  />
                  <img
                    src="/projects/joggediballa/home-800w.jpg"
                    alt={joggediballa.screenshot?.alt ?? joggediballa.title}
                    width={800}
                    height={1000}
                    loading="lazy"
                    decoding="async"
                    className="block h-full w-full object-cover object-top"
                  />
                </picture>
              }
              mediaAlt={joggediballa.screenshot?.alt}
              mediaCaption={joggediballa.screenshot?.caption}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
