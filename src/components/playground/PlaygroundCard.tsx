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
import { useScene } from "@/components/scene/SceneProvider";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Link, useRouter } from "@/i18n/navigation";
import type { ExperimentSlug } from "@/lib/content/playground";
import { GROW_MS, useInkWipeStore } from "@/lib/inkWipeStore";
import { SPOT_BG_CLASS, SPOT_CSS_VAR, type SpotColor } from "@/lib/palette";

type PlaygroundCardProps = {
  slug: ExperimentSlug;
  i18nKey: "inkDropStudio" | "typeAsFluid";
  cardSpot: SpotColor;
  /** Static visual rendered behind the card text. Always present. */
  visual: ReactNode;
  /** Live preview on desktop hover/focus or centered mobile media.
   * Desktop preserves paused state; mobile releases inactive previews. */
  LiveSim?: ComponentType<{ paused: boolean }>;
};

// `SPOT_BG_CLASS` + `SPOT_CSS_VAR` come from `@/lib/palette`. The shadow
// uses a per-card `--card-spot` CSS variable so :hover / :focus-visible
// can drive it without imperative handlers. Tailwind v4's class scanner
// can't see runtime-built names, so the bg-class lookup goes through
// the static map.

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
 * Touch: the centered media frame activates the preview. Leaving the
 * center band or hiding the page unmounts it to release its GL resources.
 *
 * Reduced motion: skip the LiveSim entirely, the static SVG is the
 * card's full visual.
 */
export function PlaygroundCard({ slug, i18nKey, cardSpot, visual, LiveSim }: PlaygroundCardProps) {
  const t = useTranslations(`playground.experiments.${i18nKey}`);
  const tCommon = useTranslations("playground");
  const reducedMotion = useReducedMotion();
  const isCoarse = useCoarsePointer();
  const { effectsReduced } = useScene();
  const router = useRouter();
  const startGrow = useInkWipeStore((s) => s.startGrow);

  const [hovered, setHovered] = useState(false);
  const [activated, setActivated] = useState(false);
  const [inViewport, setInViewport] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const navTimerRef = useRef<number | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  // Desktop visibility only pauses intentionally activated previews.
  // Mobile additionally requires the media frame to be centered.
  useEffect(() => {
    if (reducedMotion) return;
    const root = isCoarse ? centerRef.current : linkRef.current;
    if (!root) return;
    let obs: IntersectionObserver | null = null;
    const observe = () => {
      obs?.disconnect();
      // Percent root margins resolve against width. Height-derived pixels
      // keep the central 35% band narrow on tall phones; the media's center
      // marker avoids activating a second frame merely clipping that band.
      const margin = isCoarse ? window.innerHeight * 0.325 : 0;
      obs = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          setInViewport(entry.isIntersecting);
        },
        { threshold: 0, rootMargin: `-${margin}px 0px -${margin}px 0px` },
      );
      obs.observe(root);
    };
    observe();
    if (isCoarse) window.addEventListener("resize", observe);
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      obs?.disconnect();
      window.removeEventListener("resize", observe);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion, isCoarse]);

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
  const previewActive = inViewport && pageVisible && (isCoarse || hovered);
  const mountPreview = isCoarse ? previewActive : activated;

  const onEnter = () => {
    setHovered(true);
    setActivated(true);
  };
  const onLeave = () => setHovered(false);

  // Every same-tab navigation must restore pinned DOM before React unmounts it.
  // Only Full-mode pointer clicks wait for the ink overlay to cover the route.
  const onLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (navTimerRef.current !== null) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    const navigate = () => {
      // Pin spacers change the DOM hierarchy. kill(true) restores it before
      // route unmount, avoiding React removeChild errors. Preserve non-pin
      // triggers, including GSAP's internal bookkeeping.
      for (const trigger of ScrollTrigger.getAll()) {
        if (trigger.vars.pin === true) trigger.kill(true);
      }
      navTimerRef.current = null;
      router.push(`/playground/${slug}`);
    };
    if (reducedMotion || effectsReduced || e.detail === 0) {
      navigate();
      return;
    }
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    startGrow({ x, y, color: cardSpot });
    navTimerRef.current = window.setTimeout(navigate, Math.max(GROW_MS - 60, 0));
  };

  return (
    <Link
      ref={linkRef}
      href={`/playground/${slug}`}
      className="group block focus:outline-none focus-visible:outline-none"
      style={cssVars}
      aria-label={`${t("cardTitle")}: ${tCommon("openLabel")}`}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onEnter();
      }}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) onEnter();
      }}
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
        <div
          ref={centerRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-px"
        />
        {/* Keep the SVG underneath: failed GL initialization stays useful. */}
        <div className="absolute inset-0">{visual}</div>

        {/* Mobile retains only active previews; desktop preserves hover state. */}
        {showLive && mountPreview ? (
          <div
            className="absolute inset-0 transition-opacity duration-[320ms] ease-out"
            style={{ opacity: previewActive ? 1 : 0 }}
          >
            <LiveSim paused={!previewActive} />
          </div>
        ) : null}
      </div>

      {/* Caption */}
      <div className="mt-6 flex flex-col gap-3">
        <p className="type-label-stamp inline-flex items-center gap-2 text-ink-soft">
          <span aria-hidden="true" className={`inline-block size-2 ${SPOT_BG_CLASS[cardSpot]}`} />
          <span>{t("cardKicker")}</span>
        </p>
        <h3 className="type-h2 italic text-ink">{t("cardTitle")}</h3>
        <p className="type-body max-w-[42ch] text-ink-soft">{t("cardBody")}</p>
        <p
          className="type-label-stamp mt-1 inline-flex items-baseline gap-2 text-ink transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
          aria-hidden="true"
        >
          <span>{tCommon("openLabel")}</span>
          <span aria-hidden="true">→</span>
        </p>
      </div>
    </Link>
  );
}
