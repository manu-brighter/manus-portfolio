"use client";

import { useTranslations } from "next-intl";
import { type ComponentType, type CSSProperties, type ReactNode, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Link } from "@/i18n/navigation";
import type { ExperimentSlug, SpotColor } from "@/lib/content/playground";

type PlaygroundCardProps = {
  slug: ExperimentSlug;
  i18nKey: "inkDropStudio" | "typeAsFluid";
  cardSpot: SpotColor;
  /** Static visual rendered behind the card text. Always present. */
  visual: ReactNode;
  /** Optional live mini-sim component, lazy-mounted on first hover/
   *  focus and cross-faded over the static visual. Receives a `paused`
   *  prop synced to hover/focus state — false while interacted with,
   *  true otherwise (orchestrator pauses, state preserved). */
  LiveSim?: ComponentType<{ paused: boolean }>;
};

// Tailwind v4's class scanner can't see runtime-built class names, so
// dynamic spot bg-classes come from a static map. The shadow uses a
// per-card `--card-spot` CSS variable so :hover / :focus-visible can
// drive the shadow without imperative handlers.
const SPOT_BG_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};
const SPOT_CSS_VAR: Record<SpotColor, string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
};

/**
 * Playground card on the home page.
 *
 * Layout: a 4:3 media frame holding the static visual, ink-outline
 * border, Riso shadow offset in the card's spot colour. The kicker /
 * title / body sit *under* the frame, not over it — the visual stands
 * alone like a Riso print, the editorial copy is the caption. Whole
 * card is one Link to /playground/[slug].
 *
 * Hover behaviour (when LiveSim is provided AND reduced-motion is
 * off): on first hover/focus, lazy-mount the LiveSim component inside
 * the media frame. Cross-fade SVG → LiveSim. On unhover, the LiveSim
 * stays mounted (so re-hover is instant) but its `paused` prop flips
 * true → orchestrator stops sim work. State preserved.
 *
 * Reduced motion: skip the LiveSim entirely, the static SVG is the
 * card's full visual.
 */
export function PlaygroundCard({ slug, i18nKey, cardSpot, visual, LiveSim }: PlaygroundCardProps) {
  const t = useTranslations(`playground.experiments.${i18nKey}`);
  const tCommon = useTranslations("playground");
  const reducedMotion = useReducedMotion();

  const [hovered, setHovered] = useState(false);
  const [activated, setActivated] = useState(false);

  const cssVars = { "--card-spot": SPOT_CSS_VAR[cardSpot] } as CSSProperties;
  const showLive = LiveSim && !reducedMotion;

  const onEnter = () => {
    setHovered(true);
    setActivated(true);
  };
  const onLeave = () => setHovered(false);

  return (
    <Link
      href={`/playground/${slug}`}
      className="group block focus:outline-none focus-visible:outline-none"
      style={cssVars}
      aria-label={`${t("cardTitle")} — ${tCommon("openLabel")}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      {/* Media frame */}
      <div
        className={[
          "relative aspect-[4/3] w-full overflow-hidden",
          "border-[1.5px] border-ink bg-paper-shade",
          "shadow-[6px_6px_0_var(--card-spot)]",
          "group-hover:shadow-[8px_8px_0_var(--card-spot)] group-hover:-translate-x-[2px] group-hover:-translate-y-[2px]",
          "group-focus-visible:shadow-[8px_8px_0_var(--card-spot)] group-focus-visible:-translate-x-[2px] group-focus-visible:-translate-y-[2px]",
          "transition-[transform,box-shadow] duration-[280ms] ease-out",
        ].join(" ")}
      >
        {/* Static SVG layer — always rendered. Fades out when LiveSim
            is showing to avoid double-stacked visuals. */}
        <div
          className="absolute inset-0 transition-opacity duration-[320ms] ease-out"
          style={{ opacity: showLive && hovered ? 0 : 1 }}
        >
          {visual}
        </div>

        {/* Live sim layer — lazy-mounted on first hover, then sticks
            around in paused state for instant re-hovers. */}
        {showLive && activated ? (
          <div
            className="absolute inset-0 transition-opacity duration-[320ms] ease-out"
            style={{ opacity: hovered ? 1 : 0 }}
          >
            <LiveSim paused={!hovered} />
          </div>
        ) : null}
      </div>

      {/* Caption */}
      <div className="mt-6 flex flex-col gap-3">
        <p className="type-label-stamp inline-flex items-center gap-2 text-ink-soft">
          <span aria-hidden="true" className={`inline-block size-2 ${SPOT_BG_CLASS[cardSpot]}`} />
          <span>{t("cardKicker")}</span>
        </p>
        <h3 className="type-h2 text-ink" style={{ fontStyle: "italic" }}>
          {t("cardTitle")}
        </h3>
        <p className="type-body max-w-[42ch] text-ink-soft">{t("cardBody")}</p>
        <p
          className="type-label-stamp mt-1 inline-flex items-baseline gap-2 text-ink transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
          aria-hidden="true"
        >
          <span>{tCommon("openLabel")}</span>
          <span>→</span>
        </p>
      </div>
    </Link>
  );
}
