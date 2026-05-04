import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { PlateCornerMarks } from "@/components/about/PlateCornerMarks";
import { OverprintReveal } from "@/components/motion/OverprintReveal";

/**
 * AiPinselQuote — the standalone "AI ist wie ein Pinsel" editorial moment.
 *
 * Briefing §2.3 calls this out as its own visual gesture, explicitly
 * NOT embedded in the About long-read. Visual review (Phase 11
 * polish-rework) flagged the prior bare layout as feeling orphaned —
 * "man weiss gar nicht zu was es gehört." Fix: wrap the quote in the
 * same editorial frame the rest of About uses (eyebrow stamp +
 * asterism divider + plate-corner-marks + block-spot variable),
 * binding it visually to the spine without burying it as just
 * another paragraph.
 *
 * The word "Pinsel" is the only part that gets Riso misregistration —
 * treating it as a hand-set block inside an otherwise flat setting.
 *
 * The `—` in the caption is the single intentional em-dash of the
 * entire site, per briefing §0 / §2.3. Do not remove and do not
 * propagate the character elsewhere.
 */
export function AiPinselQuote() {
  const t = useTranslations("aiPinsel");
  const line1 = t("quoteLine1");
  const emphasisWord = t("emphasisWord");

  // Split the first line around the emphasis word so we can wrap just
  // that one token in OverprintReveal. If the word isn't found (e.g.
  // future translation), fall back to rendering the whole line flat.
  const match = line1.split(emphasisWord);
  const hasEmphasis = match.length === 2;

  return (
    <section
      aria-label={t("eyebrow")}
      className="plate-corners container-page-wide relative my-16 md:my-24"
      style={{ "--block-spot": "var(--color-spot-violet)" } as CSSProperties}
    >
      <PlateCornerMarks />
      <div className="grid-12">
        <figure className="col-span-12 md:col-span-10 md:col-start-2">
          {/* Eyebrow + asterism divider — anchors the quote as a
              deliberate editorial coda, not a floating fragment. */}
          <div className="mb-8 flex items-center gap-4">
            <span className="type-label-stamp">{t("eyebrow")}</span>
            <span aria-hidden="true" className="text-ink-muted text-base">
              <span className="mr-2">·</span>
              <span className="mr-2" style={{ color: "var(--block-spot)" }}>
                ✱
              </span>
              <span>·</span>
            </span>
          </div>
          <blockquote className="type-h1 max-w-4xl font-display text-ink italic">
            {hasEmphasis ? (
              <span className="block">
                {match[0]}
                <OverprintReveal
                  text={emphasisWord}
                  className="inline-block align-baseline"
                  threshold={0.6}
                  delay={0.2}
                  stagger={0.07}
                />
                {match[1]}
              </span>
            ) : (
              <span className="block">{line1}</span>
            )}
            <span className="block">{t("quoteLine2")}</span>
          </blockquote>
          <figcaption className="mt-6 text-ink-muted type-label">{t("caption")}</figcaption>
        </figure>
      </div>
    </section>
  );
}
