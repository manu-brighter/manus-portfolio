import { useTranslations } from "next-intl";
import { HeroSkillPulse } from "@/components/skills/HeroSkillPulse";
import { VibecodedStamp } from "@/components/skills/VibecodedStamp";

/**
 * Skills — Section 02.
 *
 * Editorial typographic list, not an icon grid. Size transports weight:
 * the XXL hero-skill (AI-Workflow) gets its own feature block at the
 * top; everything else flows as tier groups sized by `weight` (xl / l / m).
 *
 * The [vibecoded] marker animates in via `<VibecodedStamp>` (C1) — each
 * stamp lands with a scale/rotate snap and a brief rose halo, staggered
 * by the item's index in its tier so siblings cascade.
 *
 * Skill names wrap in `.misreg-hover` (C2) — pseudo-elements (mint -2px,
 * rose +2px) appear on `:hover` and `:focus-visible`, giving the live
 * Riso-misregistration twitch when the user hovers a word. `tabIndex=0`
 * on the wrapper makes the effect keyboard-equivalent.
 *
 * The XXL hero-skill block hosts an ambient `<HeroSkillPulse>` (C3) —
 * a continuously-cycling spot-color halo behind the headline that
 * keeps the section feeling "alive" without competing for attention.
 *
 * Items use `display: inline-block` with Instrument Serif upright so
 * they read as a mixed typographic column, not as list items. Between
 * items, a mid-dot separator keeps a rhythmic "Riso stamp" feel
 * consistent with the mono labels elsewhere on the site.
 */

type SkillItem = {
  name: string;
  vibecoded?: boolean;
};

type SkillTier = {
  id: string;
  label: string;
  description?: string;
  weight: "xl" | "l" | "m";
  items: SkillItem[];
};

const TIER_ITEM_CLASSES: Record<SkillTier["weight"], string> = {
  xl: "text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.05] tracking-[-0.015em]",
  l: "text-[clamp(1.25rem,2vw,1.75rem)] leading-[1.15] tracking-[-0.01em]",
  m: "text-[clamp(1rem,1.4vw,1.25rem)] leading-[1.3]",
};

export function Skills() {
  const t = useTranslations("skills");
  const tiers = t.raw("tiers") as SkillTier[];
  const marker = t("vibecodedMarker");

  return (
    <section
      id="skills"
      aria-labelledby="skills-heading"
      className="container-page relative py-20 md:py-28"
    >
      <header className="grid-12 mb-16 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <h2 id="skills-heading" className="type-h1 text-ink">
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-4 text-ink-soft">{t("subhead")}</p>
        </div>
      </header>

      {/* Hero-Skill: XXL feature block, Riso-stamped border. The
          relative wrapper hosts the ambient `<HeroSkillPulse>` (C3)
          which cycles through the 4 Riso spot-colors behind the text. */}
      <article
        aria-labelledby="skill-hero"
        className="relative mb-20 border-ink border-t-2 border-b-2 py-10 md:mb-28 md:py-16"
      >
        <HeroSkillPulse />
        <p className="mb-4 text-ink-muted type-label">{t("heroSkill.eyebrow")}</p>
        <h3
          id="skill-hero"
          className="font-display italic text-ink text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.03em]"
        >
          {t("heroSkill.name")}
        </h3>
        <p className="type-body-lg mt-6 max-w-2xl text-ink-soft">{t("heroSkill.description")}</p>
      </article>

      {/* Secondary tiers — flow as a stack, each with its own mono label. */}
      <div className="flex flex-col gap-16 md:gap-20">
        {tiers.map((tier) => (
          <article key={tier.id} aria-labelledby={`tier-${tier.id}`} className="grid-12 gap-y-4">
            <header className="col-span-12 md:col-span-4">
              <h3 id={`tier-${tier.id}`} className="text-ink type-label">
                {tier.label}
              </h3>
              {tier.description ? (
                <p className="mt-2 text-ink-muted type-body">{tier.description}</p>
              ) : null}
            </header>

            <ul className="col-span-12 flex flex-wrap gap-x-6 gap-y-3 font-display md:col-span-8">
              {tier.items.map((item, i) => (
                <li
                  key={item.name}
                  className={`${TIER_ITEM_CLASSES[tier.weight]} flex items-baseline gap-2 text-ink`}
                >
                  {i > 0 ? (
                    <span aria-hidden="true" className="text-ink-faint">
                      ·
                    </span>
                  ) : null}
                  {/* C2: misreg-hover wrapper — pseudo-elements borrow
                      the host text via `attr(data-text)` for the
                      mint/rose ghost split on :hover / :focus-visible.
                      tabIndex=0 is intentional: gives keyboard users
                      the same misreg twitch via :focus-visible. The
                      span carries no action — it's a decorative-effect
                      affordance, not an interactive control. */}
                  {/* biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard-equivalent for the decorative misreg-hover effect — see CLAUDE.md Phase 11 polish-rework deviation */}
                  <span className="misreg-hover" data-text={item.name} tabIndex={0}>
                    {item.name}
                  </span>
                  {item.vibecoded ? (
                    <VibecodedStamp delay={i * 0.08}>{marker}</VibecodedStamp>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
