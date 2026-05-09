"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import {
  type ComponentType,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Link, useRouter } from "@/i18n/navigation";
import type { ExperimentSlug, SpotColor } from "@/lib/content/playground";
import { GROW_MS, useInkWipeStore } from "@/lib/inkWipeStore";

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
  const router = useRouter();
  const startGrow = useInkWipeStore((s) => s.startGrow);

  const [hovered, setHovered] = useState(false);
  const [activated, setActivated] = useState(false);
  const navTimerRef = useRef<number | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Coarse-pointer: hover state is driven by viewport visibility instead
  // of mouseenter/leave. Card entering viewport activates + unpauses the
  // mini-sim; leaving pauses it (orchestrator state preserved).
  const [isCoarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    if (!isCoarse || reducedMotion) return;
    const root = linkRef.current;
    if (!root) return;
    // Middle-35% band: mini-sim wakes when the card is genuinely
    // mid-screen, not just past the upper third. Pauses on exit.
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setActivated(true);
          setHovered(true);
        } else {
          setHovered(false);
        }
      },
      { threshold: 0, rootMargin: "-32.5% 0px -32.5% 0px" },
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [isCoarse, reducedMotion]);

  // Cancel a pending router.push if the card unmounts before the wipe
  // completes (e.g. user navigates via the locale switcher mid-grow).
  // Without this, `router.push` fires after unmount → no warning, but
  // it can race with the user's actual destination.
  useEffect(() => {
    return () => {
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, []);

  const cssVars = { "--card-spot": SPOT_CSS_VAR[cardSpot] } as CSSProperties;
  const showLive = LiveSim && !reducedMotion;

  const onEnter = () => {
    setHovered(true);
    setActivated(true);
  };
  const onLeave = () => setHovered(false);

  /**
   * Click handler for the Fluid-Ink-Wipe transition. Intercepts the
   * Link's default navigation IF this is a plain primary-button click;
   * for cmd/ctrl/middle-click (open-in-new-tab intents), keyboard
   * Enter via the Link, or reduced-motion users we let the browser /
   * default behavior handle the navigation as-is.
   *
   * On a normal click:
   *   1. Read the click coordinates (so the wipe grows from where the
   *      user actually clicked, not card centre — feels causal).
   *   2. Fire startGrow on the inkWipe store; the overlay component
   *      mounted in the locale layout picks this up and starts
   *      animating.
   *   3. Schedule router.push 60ms before grow completes so the route
   *      swap finishes during the `covered` window, hiding the
   *      destination's loading state behind ink.
   */
  const onLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (reducedMotion) return; // browser navigates normally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    startGrow({ x, y, color: cardSpot });
    navTimerRef.current = window.setTimeout(
      () => {
        // Revert ALL ScrollTrigger pin spacers BEFORE the route change
        // unmounts the home page. Otherwise React's removeChild fails
        // because pin-spacer divs are now between <main> and the pinned
        // <section>, so the section is no longer a direct child of main.
        // kill(true) restores the original DOM hierarchy.
        for (const t of ScrollTrigger.getAll()) t.kill(true);
        router.push(`/playground/${slug}`);
        navTimerRef.current = null;
      },
      Math.max(GROW_MS - 60, 0),
    );
  };

  return (
    <Link
      ref={linkRef}
      href={`/playground/${slug}`}
      className="group block focus:outline-none focus-visible:outline-none"
      style={cssVars}
      aria-label={`${t("cardTitle")} — ${tCommon("openLabel")}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onLinkClick}
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
