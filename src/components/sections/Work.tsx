import { useTranslations } from "next-intl";
import { FadeIn } from "@/components/motion/FadeIn";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WorkCard } from "@/components/ui/WorkCard";
import { JoggediballaScreenshot } from "@/components/work/JoggediballaScreenshot";
import { PortfolioCardReveal } from "@/components/work/PortfolioCardReveal";
import { SideProjectCard } from "@/components/work/SideProjectCard";
import type { SpotColor } from "@/lib/palette";
import { SITE } from "@/lib/site";
import type { WorkProjects, WorkSideProjects } from "@/types/i18n-shapes";

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

// Repo URL + spot color per B-side id — URLs live in site.ts (single
// source), spots use the pair the two hero cards don't (rose/amber).
// The id union is explicit (JSON imports widen literals to string), so
// adding a meta entry is exhaustiveness-checked; catalog ids without a
// meta entry are dropped through the NAMED guard below, not silently.
const SIDE_PROJECT_IDS = ["shotCounter", "fullProjectRework"] as const;
type SideProjectId = (typeof SIDE_PROJECT_IDS)[number];

const SIDE_PROJECT_META: Record<SideProjectId, { href: string; spot: SpotColor }> = {
  shotCounter: { href: SITE.repos.shotCounter, spot: "mint" },
  fullProjectRework: { href: SITE.repos.fullProjectRework, spot: "violet" },
};

function isSideProjectId(id: string): id is SideProjectId {
  return (SIDE_PROJECT_IDS as readonly string[]).includes(id);
}

export function Work() {
  const t = useTranslations("work");
  const projects = t.raw("projects") as WorkProjects;
  const sideProjects = t.raw("sideProjects.items") as WorkSideProjects;
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
      className="container-page-wide relative py-20 md:py-28"
    >
      <SectionHeader
        className="mb-16 md:mb-20"
        label={t("sectionLabel")}
        headingId="work-heading"
        headline={t("headline")}
        subhead={t("subhead")}
      />

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
              media={
                portfolio.reveal ? (
                  <PortfolioCardReveal
                    alt={portfolio.screenshot?.alt ?? portfolio.title}
                    surname={portfolio.reveal.surname}
                    given={portfolio.reveal.given}
                    ariaAnnouncement={portfolio.reveal.ariaAnnouncement}
                  />
                ) : (
                  <picture className="block h-full w-full">
                    <source
                      type="image/avif"
                      srcSet="/projects/portfolio/homepage-themes-480w.avif 480w, /projects/portfolio/homepage-themes-800w.avif 800w, /projects/portfolio/homepage-themes-1200w.avif 1200w"
                      sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
                    />
                    <source
                      type="image/webp"
                      srcSet="/projects/portfolio/homepage-themes-480w.webp 480w, /projects/portfolio/homepage-themes-800w.webp 800w, /projects/portfolio/homepage-themes-1200w.webp 1200w"
                    />
                    <img
                      src="/projects/portfolio/homepage-themes-800w.jpg"
                      alt={portfolio.screenshot?.alt ?? portfolio.title}
                      width={800}
                      height={450}
                      loading="lazy"
                      className="block h-full w-full object-cover object-center md:object-top"
                    />
                  </picture>
                )
              }
              mediaAlt={portfolio.screenshot?.alt}
              mediaCaption={portfolio.screenshot?.caption}
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
                // Theme-aware: swaps to the real darkmode homepage
                // shot while the Nachtdruck preset is active.
                <JoggediballaScreenshot alt={joggediballa.screenshot?.alt ?? joggediballa.title} />
              }
              mediaAlt={joggediballa.screenshot?.alt}
              mediaCaption={joggediballa.screenshot?.caption}
            />
          </div>
        ) : null}
      </div>

      {/* B-sides strip — the smaller public repos. Compact catalog
          cards, not a third hero (the section stays "two intentional
          projects" + a quiet open-source shelf below). */}
      <FadeIn as="div" y={14} className="mt-20 md:mt-28">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-baseline md:gap-6">
          <h3 className="type-label-stamp">{t("sideProjects.label")}</h3>
          <p className="type-label text-ink-muted">{t("sideProjects.lede")}</p>
        </div>
        {/* Side-scroll rail on phones, two-column grid from `md`.
            Carousels are used sparingly here (see CLAUDE.md); this one
            earns it by keeping a quiet open-source shelf from eating a
            full screen of vertical scroll on the way to Contact.

            The layout is Tailwind UTILITIES, not a hand-written class.
            A first cut put all of it in a `.side-rail` component rule,
            which meant the desktop grid depended on that one rule
            shipping — when it did not, desktop regressed from a working
            two-column grid to a plain stack. Utilities are emitted from
            a source scan and the grid classes here predate the rail, so
            desktop can no longer be collateral damage of a mobile-only
            feature. The only custom class left is `.no-scrollbar`,
            which is cosmetic.

            The negative margin cancels the section gutter so cards
            bleed to the viewport edge and the next one peeks in; that
            peek plus the snap points is the whole affordance. `py-2` is
            not decoration: `overflow-x: auto` forces `overflow-y` to
            compute to `auto` too, so without the room a card's hover
            translate and focus ring spawn a nested vertical scrollbar.

            No `tabIndex`: axe's scrollable-region-focusable only fires
            when a scrollable region has no focusable descendants, and
            every card is a link. */}
        <div
          data-testid="side-rail"
          className="-mx-[var(--container-gutter)] no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain px-[var(--container-gutter)] py-2 md:mx-0 md:grid md:grid-cols-2 md:gap-8 md:overflow-x-visible md:px-0 md:py-0 lg:max-w-4xl"
        >
          {sideProjects.map((project) => {
            if (!isSideProjectId(project.id)) return null;
            const meta = SIDE_PROJECT_META[project.id];
            return (
              <div key={project.id} className="w-[84%] shrink-0 snap-center md:w-auto">
                <SideProjectCard
                  title={project.title}
                  tagline={project.tagline}
                  description={project.description}
                  stack={project.stack}
                  ctaLabel={project.ctaLabel}
                  href={meta.href}
                  spot={meta.spot}
                />
              </div>
            );
          })}
        </div>
      </FadeIn>
    </section>
  );
}
