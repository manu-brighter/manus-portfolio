import { useTranslations } from "next-intl";
import { OverprintReveal } from "@/components/motion/OverprintReveal";

/**
 * AiPinselQuote — the standalone "AI ist wie ein Pinsel" editorial moment.
 *
 * Briefing §2.3 calls this out as its own visual gesture, explicitly
 * NOT embedded in the About long-read. Full container bleed,
 * Instrument Serif italic, left-aligned as a visual counterweight
 * to the right-aligned hero (asymmetric mirror).
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
    <figure className="container-page py-20 md:py-28">
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
  );
}
