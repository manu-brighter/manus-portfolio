import { useTranslations } from "next-intl";
import { OverprintReveal } from "@/components/motion/OverprintReveal";

/**
 * AiPinselQuote — the "AI ist wie ein Pinsel" editorial moment.
 *
 * Embedded as the closer of About's AI-Workflow block (Block 04).
 * Logically: the block explains the workflow, the quote punctuates
 * the statement. Visual review (Phase 11 polish-rework) moved this
 * from a standalone section at the end of About — it sat after the
 * "Antrieb" + Object-Grid blocks, where the reader had already left
 * the AI-workflow context. Now it renders inline as Block 04's
 * coda, no plate-corner frame of its own (the parent AboutBlock
 * already provides one).
 *
 * The word "Pinsel" gets Riso misregistration; everything else is
 * flat italic Instrument Serif.
 *
 * The `—` in the caption is the single intentional em-dash of the
 * entire site, per briefing §0 / §2.3.
 */
export function AiPinselQuote() {
  const t = useTranslations("aiPinsel");
  const line1 = t("quoteLine1");
  const emphasisWord = t("emphasisWord");

  // Split the first line around the emphasis word so we can wrap just
  // that one token in OverprintReveal.
  const match = line1.split(emphasisWord);
  const hasEmphasis = match.length === 2;

  return (
    <figure className="border-ink/15 mt-12 border-t pt-10">
      <blockquote className="font-display italic text-ink type-h2 text-ink">
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
      <figcaption className="mt-4 text-ink-muted type-label">{t("caption")}</figcaption>
    </figure>
  );
}
