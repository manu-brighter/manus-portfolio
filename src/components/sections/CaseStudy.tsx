import { useTranslations } from "next-intl";
import { CaseStudyShot } from "@/components/ui/CaseStudyShot";

/**
 * Case Study — Section 04, Joggediballa deep-dive.
 *
 * Long-form editorial block. Lives inline in the home page, not at
 * /work/[slug] (Phase 7 deviation: single-page-portfolio stays
 * consistent, the WorkCard CTA already points at #case-study).
 *
 * Section flow:
 *   1. Pull-quote hook
 *   2. "Was ist Jogge di Balla?" — facts <dl> + story prose
 *   3. Die Plattform — tech-stack table + modules note
 *   4. Highlight 01 — Admin-Dashboard (screenshot + 3 feature blocks)
 *   5. Highlight 02 — Schlag-den-Kassier-Overlay (same shape)
 *   6. Public layer — 5 screenshots in an editorial grid
 *   7. Reflection — pull-quote
 *   8. Footer link to live site
 *
 * Screenshots stay in their actual colors (per Phase 6 portrait
 * deviation: pro UI captures should remain legible). Riso treatment
 * lives in the framing — paper-shade backing, ink border, spot offset
 * shadow — not in pixel-level color manipulation. The photo-duotone
 * shader from plan §6.5 ships in Phase 9 and can backport later.
 */

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string; why: string };
type HighlightFeature = { title: string; body: string };
type Highlight = {
  id: string;
  kicker: string;
  title: string;
  lede: string;
  screenshot: string;
  screenshotAlt: string;
  features: HighlightFeature[];
};
type PublicShot = { slug: string; alt: string; caption: string };

export function CaseStudy() {
  const t = useTranslations("caseStudy");
  const facts = t.raw("context.facts") as Fact[];
  const storyParas = t.raw("context.story") as string[];
  const stack = t.raw("platform.stack") as StackRow[];
  const highlights = t.raw("highlights.items") as Highlight[];
  const publicShots = t.raw("publicLayer.screenshots") as PublicShot[];

  return (
    <section
      id="case-study"
      aria-labelledby="case-study-heading"
      className="container-page relative py-24 md:py-36"
    >
      <header className="grid-12 mb-20 gap-y-4 md:mb-28">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <p className="type-label inline-flex items-center gap-2 text-ink">
            <span aria-hidden="true" className="inline-block size-2 bg-spot-amber" />
            {t("eyebrow")}
          </p>
          <h2 id="case-study-heading" className="type-h1 mt-3 text-ink">
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-4 text-ink-soft">{t("subhead")}</p>
        </div>
      </header>

      {/* 1 · Hook — pull-quote, large serif italic. */}
      <div className="grid-12 mb-24 md:mb-32">
        <blockquote className="col-span-12 md:col-start-2 md:col-span-10">
          <p className="font-display italic text-ink text-[clamp(1.5rem,3vw,2.5rem)] leading-[1.25] tracking-[-0.01em]">
            <span className="mr-1 text-spot-amber" aria-hidden="true">
              «
            </span>
            {t("hook")}
            <span className="ml-1 text-spot-amber" aria-hidden="true">
              »
            </span>
          </p>
        </blockquote>
      </div>

      {/* 2 · Context — facts dl + story prose. */}
      <div className="grid-12 mb-24 gap-y-10 md:mb-32">
        <div className="col-span-12 md:col-span-4">
          <h3 className="type-h3 text-ink">{t("context.label")}</h3>
          <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3">
            {facts.map((f) => (
              <div key={f.key} className="contents">
                <dt className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
                  {f.key}
                </dt>
                <dd className="type-body-sm text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="col-span-12 space-y-5 md:col-span-7 md:col-start-6">
          {storyParas.map((p) => (
            <p key={p.slice(0, 32)} className="type-body text-ink-soft">
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* 3 · Platform — tech-stack table + modules paragraph. */}
      <div className="grid-12 mb-24 gap-y-10 md:mb-32">
        <div className="col-span-12 md:col-span-4">
          <h3 className="type-h3 text-ink">{t("platform.label")}</h3>
          <p className="mt-4 type-body text-ink-soft">{t("platform.intro")}</p>
        </div>
        <div className="col-span-12 md:col-span-8">
          <table className="w-full border-collapse border-2 border-ink bg-paper">
            <thead>
              <tr className="bg-paper-shade">
                <th className="border-b-2 border-ink px-4 py-3 text-left font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink">
                  Tech
                </th>
                <th className="border-b-2 border-ink px-4 py-3 text-left font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink">
                  Use
                </th>
                <th className="border-b-2 border-ink px-4 py-3 text-left font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink">
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {stack.map((row, i) => (
                <tr
                  key={row.tech}
                  className={i < stack.length - 1 ? "border-b border-paper-line" : ""}
                >
                  <td className="px-4 py-3 type-body-sm font-medium text-ink">{row.tech}</td>
                  <td className="px-4 py-3 type-body-sm text-ink-soft">{row.use}</td>
                  <td className="px-4 py-3 type-body-sm text-ink-muted">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 type-body-sm text-ink-muted italic">{t("platform.modules")}</p>
        </div>
      </div>

      {/* 4 + 5 · Highlights — Admin + Overlay. */}
      <div className="space-y-24 md:space-y-32">
        {highlights.map((h, i) => (
          <article
            key={h.id}
            className="grid-12 gap-y-10"
            aria-labelledby={`highlight-${h.id}-title`}
          >
            <div
              className={`col-span-12 ${
                i % 2 === 0 ? "md:col-span-6" : "md:col-span-6 md:col-start-7"
              }`}
            >
              <CaseStudyShot
                slug={h.screenshot}
                alt={h.screenshotAlt}
                accent={i % 2 === 0 ? "rose" : "amber"}
              />
            </div>
            <div
              className={`col-span-12 ${
                i % 2 === 0
                  ? "md:col-span-5 md:col-start-8"
                  : "md:col-span-5 md:col-start-1 md:row-start-1"
              }`}
            >
              <p className="type-label inline-flex items-center gap-2 text-ink">
                <span
                  aria-hidden="true"
                  className="inline-block size-2"
                  style={{ background: `var(--color-spot-${i % 2 === 0 ? "rose" : "amber"})` }}
                />
                {h.kicker}
              </p>
              <h3
                id={`highlight-${h.id}-title`}
                className="mt-3 font-display italic text-ink text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] tracking-[-0.015em]"
              >
                {h.title}
              </h3>
              <p className="mt-4 type-body text-ink-soft">{h.lede}</p>
              <ul className="mt-8 space-y-6">
                {h.features.map((f) => (
                  <li key={f.title} className="border-l-2 border-ink pl-4">
                    <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink">
                      {f.title}
                    </p>
                    <p className="mt-2 type-body-sm text-ink-soft">{f.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      {/* 6 · Public layer — editorial screenshot grid. */}
      <div className="mt-24 md:mt-32">
        <h3 className="type-h3 mb-10 text-ink">{t("publicLayer.label")}</h3>
        <div className="grid-12 gap-y-12">
          {publicShots.map((s, i) => {
            // Editorial irregular grid: alternating column spans with
            // a deliberate offset on every other row to break the
            // rectangular feel.
            const layouts = [
              "md:col-span-7",
              "md:col-span-5 md:col-start-8 md:mt-12",
              "md:col-span-6",
              "md:col-span-5 md:col-start-7 md:mt-8",
              "md:col-span-8 md:col-start-3",
            ];
            return (
              <div key={s.slug} className={`col-span-12 ${layouts[i] ?? ""}`}>
                <CaseStudyShot
                  slug={s.slug}
                  alt={s.alt}
                  caption={s.caption}
                  accent={i % 2 === 0 ? "mint" : "violet"}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 7 · Reflection — pull-quote. */}
      <div className="grid-12 mt-24 md:mt-32">
        <div className="col-span-12 border-l-2 border-spot-amber pl-6 md:col-start-2 md:col-span-10 md:pl-8">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted">
            {t("reflection.label")}
          </p>
          <p className="mt-3 font-display italic text-ink text-[clamp(1.25rem,2.4vw,1.875rem)] leading-[1.3]">
            {t("reflection.body")}
          </p>
        </div>
      </div>

      {/* 8 · Footer link. */}
      <div className="mt-20 flex flex-col items-start gap-3 md:mt-28 md:flex-row md:items-baseline md:justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted">
          {t("footerLink.label")}
        </p>
        <a
          href={t("footerLink.url")}
          target="_blank"
          rel="noreferrer noopener external"
          className="group inline-flex items-baseline gap-3 border-b-2 border-ink font-display italic text-ink text-[clamp(1.5rem,3vw,2.25rem)] leading-none tracking-[-0.01em] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
        >
          {t("footerLink.domain")}
          <span aria-hidden="true" className="font-mono text-base not-italic">
            ↗
          </span>
          <span className="sr-only">{t("footerLink.external")}</span>
        </a>
      </div>
    </section>
  );
}
