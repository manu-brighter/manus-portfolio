import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { AboutBlock } from "@/components/about/AboutBlock";
import { ObjectGrid } from "@/components/about/ObjectGrid";
import { PlateCornerMarks } from "@/components/about/PlateCornerMarks";
import { PullQuote } from "@/components/about/PullQuote";
import { StampDivider } from "@/components/about/StampDivider";
import { FadeIn } from "@/components/motion/FadeIn";
import { Portrait } from "@/components/ui/Portrait";

/**
 * About — Section 01 (Phase 11 visual rework).
 *
 * Spine (see docs/superpowers/specs/2026-05-04-about-skills-visual-
 * rework-design.md § 3):
 *
 *   00 Header  → 01 Wer ich bin (rose)  → 02 Anfangen (mint)
 *   → 03 Portrait  → 04 AI-Workflow (amber)  → 05 Antrieb (violet)
 *   → 06 Object-Grid  → 07 AI-Pinsel-Closer
 *
 * Briefing § 2.2 prose stays verbatim — only structure + theatrics
 * change. Pull-quotes are pulled FROM that prose, not new text.
 *
 * Currently-block (Briefing § 2.5) is dropped from About; the
 * "Currently learning" residue lives as a sub-band under the
 * Object-Grid header.
 */

type AboutPart = {
  id: string;
  heading: string;
  body: string[];
};

type StampMargItem = { label: string; year: string };

type CurrentlyItem = { verb: string; value: string };

/**
 * BodyProse — wraps each paragraph in FadeIn (B2 in spec § 4) so the
 * body-prose trickles in after the pull-quote lands. Stagger 120ms
 * per paragraph, baseline delay 500ms, duration 1.1s (`dur.long`).
 * Slow + buttery feel — paragraphs settle in well after the quote
 * has finished its overprint reveal.
 *
 * Drop-cap (B4) is CSS via `.about-block-body > p:first-of-type::
 * first-letter` and works through the FadeIn span because
 * `:first-letter` styles the first formatted character inside the
 * `<p>` regardless of intermediate inline elements.
 */
function BodyProse({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="about-block-body mt-8 flex flex-col gap-4">
      {paragraphs.map((p, i) => (
        <p
          key={`p-${
            // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order is stable
            i
          }`}
          className="type-body text-ink"
        >
          <FadeIn delay={i * 0.12 + 0.5} duration={1.1}>
            {p}
          </FadeIn>
        </p>
      ))}
    </div>
  );
}

export function About() {
  const t = useTranslations("about");
  // Currently-list (5 verbs) is rendered next to the portrait as the
  // editorial flank — refilled into the spine after originally being
  // dropped in favour of the Object-Grid's "currently learning" band.
  const tCurrently = useTranslations("currently");
  const parts = t.raw("parts") as AboutPart[];
  const partsById = Object.fromEntries(parts.map((p) => [p.id, p]));
  const currentlyItems = tCurrently.raw("items") as CurrentlyItem[];

  // Helpers — body prose lookup (stays verbatim from briefing).
  const bodyOf = (id: string) => partsById[id]?.body ?? [];

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="plate-corners relative py-20 md:py-28"
    >
      <PlateCornerMarks />

      {/* 00 Header */}
      <header className="container-page grid-12 mb-12 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <h2 id="about-heading" className="type-h1 text-ink">
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-4 text-ink-soft">{t("subhead")}</p>
        </div>
      </header>

      {/* 01 Wer ich bin */}
      <AboutBlock
        id="wer-ich-bin"
        spot="rose"
        layout="marg-left-content-right"
        marginalia={
          <div className="flex flex-col gap-2">
            <span className="type-label-stamp">{t("marginalia.werIchBin.counter")}</span>
            <span className="type-label text-ink-muted">{t("marginalia.werIchBin.label")}</span>
            <span className="type-label text-ink-muted">{t("marginalia.werIchBin.year")}</span>
          </div>
        }
      >
        <PullQuote text={t("pullQuotes.werIchBin")} />
        <BodyProse paragraphs={bodyOf("wer-ich-bin")} />
      </AboutBlock>

      <StampDivider spot="rose" />

      {/* 02 Anfangen */}
      <AboutBlock
        id="wie-angefangen"
        spot="mint"
        layout="content-left-marg-right"
        marginalia={
          <div className="flex flex-col gap-3">
            <span className="type-label-stamp">{t("marginalia.anfangen.counter")}</span>
            {(t.raw("marginalia.anfangen.stamps") as StampMargItem[]).map((s) => (
              <span key={s.label} className="type-label-stamp">
                {s.label} · {s.year}
              </span>
            ))}
          </div>
        }
      >
        <PullQuote text={t("pullQuotes.anfangen")} />
        <BodyProse paragraphs={bodyOf("wie-angefangen")} />
      </AboutBlock>

      <StampDivider spot="mint" />

      {/* 03 Portrait-Anchor — editorial composition: portrait left,
          editorial-flank right (plate-stamp -> asterism -> label ->
          Currently 5-item dl -> asterism -> signature). On mobile the
          flank falls below the portrait. The Currently block (Briefing
          §2.5) is reattached here as the data-rich flank — replaces
          the empty single-portrait block. */}
      <section
        id="about-portrait"
        aria-labelledby="about-portrait-heading"
        className="about-block plate-corners container-page-wide relative my-16 md:my-24"
        style={{ "--block-spot": "var(--color-spot-rose)" } as CSSProperties}
      >
        <PlateCornerMarks />
        <div className="grid-12 gap-y-8">
          <div className="col-span-12 md:col-span-5 md:col-start-2">
            <Portrait alt={t("portrait.alt")} caption={t("portrait.caption")} />
          </div>
          <div className="col-span-12 flex flex-col gap-6 md:col-span-4 md:col-start-8 md:pt-6">
            <span className="type-label-stamp self-start">{t("portrait.plate")}</span>
            <div aria-hidden="true" className="flex items-center gap-2 text-ink-muted">
              <span className="size-1 rounded-full bg-current" />
              <span className="text-base" style={{ color: "var(--block-spot)" }}>
                ✱
              </span>
              <span className="size-1 rounded-full bg-current" />
            </div>
            <h3 id="about-portrait-heading" className="type-h3 italic text-ink">
              {tCurrently("label")}
            </h3>
            <dl className="flex flex-col gap-2">
              {currentlyItems.map((item) => (
                <div key={item.verb} className="flex items-baseline gap-3 font-mono text-sm">
                  <dt className="w-24 shrink-0 text-ink-muted uppercase tracking-[0.18em] text-xs">
                    {item.verb}
                  </dt>
                  <dd className="text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
            <div aria-hidden="true" className="flex items-center gap-2 text-ink-muted">
              <span className="size-1 rounded-full bg-current" />
              <span className="text-base" style={{ color: "var(--block-spot)" }}>
                ✱
              </span>
              <span className="size-1 rounded-full bg-current" />
            </div>
          </div>
        </div>
      </section>

      <StampDivider spot="rose" />

      {/* 04 AI-Workflow (loud-centered, wide container). The
          "AI ist wie ein Pinsel" closer was dropped (Phase 11
          polish-rework) — the body-prose first paragraph already
          says "Eine AI ist wie ein Pinsel: ein Werkzeug, das die
          Kunst nicht alleine macht.", making the standalone quote
          redundant. */}
      <AboutBlock id="ai-workflow" spot="amber" layout="loud-centered" wide>
        <PullQuote text={t("pullQuotes.aiWorkflow")} />
        <BodyProse paragraphs={bodyOf("ai-workflow")} />
      </AboutBlock>

      <StampDivider spot="amber" />

      {/* 05 Antrieb (short-centered) */}
      <AboutBlock id="antrieb" spot="violet" layout="short-centered">
        <PullQuote text={t("pullQuotes.antrieb")} />
        <BodyProse paragraphs={bodyOf("antrieb")} />
      </AboutBlock>

      <StampDivider spot="violet" />

      {/* 06 Object-Grid (replaces part 5 + Currently) */}
      <ObjectGrid />
    </section>
  );
}
