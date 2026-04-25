import { useTranslations } from "next-intl";
import { AiPinselQuote } from "@/components/ui/AiPinselQuote";
import { Portrait } from "@/components/ui/Portrait";

/**
 * About — Section 01.
 *
 * Briefing §2 content, DE source. Structure:
 *   1. Section header (mono stamp, headline, subhead)
 *   2. Two-column grid:
 *        left 7 cols — editorial long-read (5 parts)
 *        right 5 cols — Portrait + Currently block
 *   3. AiPinselQuote as section closer (briefing §2.3)
 *
 * Translation deferred until later phase; EN/FR/IT message files
 * currently mirror DE content verbatim so next-intl renders something
 * in every locale. See CLAUDE.md Phase 6 deviations.
 */

type AboutPart = {
  id: string;
  heading: string;
  body: string[];
};

type CurrentlyItem = {
  verb: string;
  value: string;
};

export function About() {
  const t = useTranslations("about");
  const tCurrently = useTranslations("currently");

  // next-intl exposes array/object message shapes via t.raw — safe here
  // because the JSON shape is authored + reviewed in-repo, not
  // user-supplied.
  const parts = t.raw("parts") as AboutPart[];
  const currentlyItems = tCurrently.raw("items") as CurrentlyItem[];

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="container-page relative py-20 md:py-28"
    >
      <header className="grid-12 mb-16 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <h2 id="about-heading" className="type-h1 text-ink">
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-4 text-ink-soft">{t("subhead")}</p>
        </div>
      </header>

      <div className="grid-12 gap-y-12">
        <div className="col-span-12 flex flex-col gap-10 md:col-span-7">
          {parts.map((part) => (
            <article key={part.id} aria-labelledby={`about-part-${part.id}`}>
              <h3 id={`about-part-${part.id}`} className="type-label mb-3 text-ink-muted">
                {part.heading}
              </h3>
              <div className="flex flex-col gap-4">
                {part.body.map((paragraph, i) => (
                  <p
                    key={`${part.id}-p-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs order is stable + content doesn't reorder
                      i
                    }`}
                    className="type-body text-ink"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="col-span-12 flex flex-col gap-10 md:col-span-5 md:pl-8">
          <Portrait alt={t("portrait.alt")} caption={t("portrait.caption")} />

          <div className="border-ink border-t-2 pt-6">
            <p className="mb-4 type-label text-ink">{tCurrently("label")}</p>
            <dl className="flex flex-col gap-2">
              {currentlyItems.map((item) => (
                <div key={item.verb} className="flex items-baseline gap-3 font-mono text-sm">
                  <dt className="w-28 shrink-0 text-ink-muted uppercase tracking-[0.18em] text-xs">
                    {item.verb}
                  </dt>
                  <dd className="text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <AiPinselQuote />
    </section>
  );
}
