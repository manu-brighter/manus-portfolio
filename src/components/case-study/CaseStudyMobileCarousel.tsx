"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { HighlightCard } from "@/components/case-study/cards/HighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SpotColor } from "@/lib/palette";
import type {
  CaseStudyFacts,
  CaseStudyHighlightAdmin,
  CaseStudyHighlightOverlay,
  CaseStudyHighlights,
  CaseStudyHookStation,
  CaseStudyStack,
  CaseStudyStackStation,
  CaseStudyStory,
} from "@/types/i18n-shapes";

/**
 * Mobile-Rework — Case-Study side-swipe carousel.
 *
 * Replaces the earlier vertical scrolly + per-station fluid sim
 * (CaseStudyMobileSim, removed) with a horizontal swipeable carousel of
 * the 4 narrative stations — the same content the Desktop Diorama lays out
 * horizontally, here reachable by touch side-swipes.
 *
 * Same interaction model as the Photography mobile swiper (scroll-snap-x
 * track + pagination dots + prev/next + aria-live), with two deliberate
 * differences:
 *   - The swipe is NOT forced: the track is a fixed-height block in normal
 *     flow, so a vertical drag scrolls the page past it (tall stations
 *     scroll internally first, then chain to the page). Only horizontal
 *     drags move the carousel.
 *   - A "<- swipe ->" hint sits above the track (faded once the user leaves
 *     station 1) so the side-swipe affordance is discoverable.
 *
 * Lightbox plumbing is shared with Desktop — the parent CaseStudy passes
 * `handleOpen` + `publicShots` so lightbox indices stay identical across
 * both views (hook=0, admin=1, overlay=2, public shots=3..5).
 */

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  spot: "mint" | "violet" | "rose" | "amber";
  rotate: number;
  alt: string;
  datestamp: string;
  caption: string;
};

type Props = {
  handleOpen: (index: number) => () => void;
  publicShots: PublicShot[];
};

const TOTAL = 4;

/** Dot color per station — echoes the retired sim's transition sequence. */
const STATION_DOT_SPOT: SpotColor[] = ["mint", "rose", "amber", "violet"];

const SPOT_BG_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};

export function CaseStudyMobileCarousel({ handleOpen, publicShots }: Props) {
  const t = useTranslations("caseStudy");
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  const facts = t.raw("context.facts") as CaseStudyFacts;
  const storyParas = t.raw("context.story") as CaseStudyStory;
  const stack = t.raw("platform.stack") as CaseStudyStack;
  const highlights = t.raw("highlights.items") as CaseStudyHighlights;
  const hookStation = t.raw("stations.hook") as CaseStudyHookStation;
  const stackStation = t.raw("stations.stack") as CaseStudyStackStation;
  const highlightAdmin = t.raw("stations.highlightAdmin") as CaseStudyHighlightAdmin;
  const highlightOverlay = t.raw("stations.highlightOverlay") as CaseStudyHighlightOverlay;
  const stationLabels = t.raw("carousel.stationLabels") as string[];

  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  // Sync index from native scroll-snap position. A touch side-swipe scrolls
  // the track; we read scrollLeft -> slide index on each scroll event.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const slide = Math.round(track.scrollLeft / track.clientWidth);
      setIndex((current) => (current === slide ? current : slide));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(TOTAL - 1, newIndex));
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
    setIndex(clamped);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  const slideLabel = (i: number) =>
    t("carousel.ariaSlideOf", { index: i + 1, total: TOTAL, label: stationLabels[i] ?? "" });

  return (
    <section id="case-study" aria-labelledby="case-study-heading" className="relative py-12">
      <h2 id="case-study-heading" className="sr-only">
        {t("headline")}
      </h2>

      {/* Side-swipe affordance — fades out once the user leaves station 1. */}
      <div
        aria-hidden="true"
        className={`container-page mb-4 flex items-center justify-center gap-3 text-ink-muted type-label transition-opacity duration-500 ${
          index === 0 ? "opacity-100" : "opacity-0"
        }`}
      >
        <span>&larr;</span>
        <span>{t("carousel.swipeHint")}</span>
        <span>&rarr;</span>
      </div>

      <div className="relative">
        {/* Carousel track. Fixed-height block in normal flow: vertical drags
            scroll the page past it (tall stations scroll internally first,
            then chain to the page), only horizontal drags move the carousel
            — so the side-swipe is never forced. Mirrors the Photography
            mobile swiper, minus the height-pin trapping vertical scroll. */}
        <section
          ref={trackRef as React.RefObject<HTMLElement>}
          data-testid="cs-carousel-track"
          aria-roledescription="carousel"
          aria-label={t("carousel.ariaLabel")}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: ARIA carousel pattern — region is tab stop for arrow-key nav
          tabIndex={0}
          onKeyDown={onKey}
          className="flex h-[80vh] snap-x snap-mandatory overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-spot-mint)] focus-visible:ring-offset-2"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Station 1 · Hook */}
          <article
            data-testid="cs-station-hook"
            id="cs-station-hook"
            aria-roledescription="slide"
            aria-label={slideLabel(0)}
            className="h-full w-full shrink-0 snap-center overflow-y-auto px-6 py-4"
          >
            <HookCard
              hookText={t("hook")}
              datestamp={hookStation.datestamp}
              polaroidCaption={hookStation.polaroidCaption ?? ""}
              lightboxIndex={0}
              onPolaroidClick={handleOpen(0)}
            />
          </article>

          {/* Station 2 · Context + Stack */}
          <article
            data-testid="cs-station-context"
            id="cs-station-context"
            aria-roledescription="slide"
            aria-label={slideLabel(1)}
            className="flex h-full w-full shrink-0 snap-center flex-col gap-8 overflow-y-auto px-6 py-4"
          >
            <WhatCard label={t("context.label")} facts={facts} storyParas={storyParas} />
            <StackCard heading={stackStation.heading} stack={stack} />
          </article>

          {/* Station 3 · Highlights */}
          <article
            data-testid="cs-station-highlights"
            id="cs-station-highlights"
            aria-roledescription="slide"
            aria-label={slideLabel(2)}
            className="flex h-full w-full shrink-0 snap-center flex-col gap-8 overflow-y-auto px-6 py-4"
          >
            {adminHighlight ? (
              <HighlightCard
                slug="admin"
                spot="rose"
                kicker={adminHighlight.kicker}
                title={adminHighlight.title}
                lede={adminHighlight.lede}
                features={adminHighlight.features}
                screenshotAlt={adminHighlight.screenshotAlt}
                datestamp={highlightAdmin.datestamp}
                polaroidCaption={highlightAdmin.polaroidCaption ?? ""}
                lightboxIndex={1}
                onPolaroidClick={handleOpen(1)}
              />
            ) : null}
            {overlayHighlight ? (
              <HighlightCard
                slug="twitchoverlay"
                spot="amber"
                kicker={overlayHighlight.kicker}
                title={overlayHighlight.title}
                lede={overlayHighlight.lede}
                features={overlayHighlight.features}
                screenshotAlt={overlayHighlight.screenshotAlt}
                datestamp={highlightOverlay.datestamp}
                polaroidCaption={highlightOverlay.polaroidCaption ?? ""}
                lightboxIndex={2}
                onPolaroidClick={handleOpen(2)}
              />
            ) : null}
          </article>

          {/* Station 4 · Public */}
          <article
            data-testid="cs-station-public"
            id="cs-station-public"
            aria-roledescription="slide"
            aria-label={slideLabel(3)}
            className="h-full w-full shrink-0 snap-center overflow-y-auto px-6 py-4"
          >
            <PublicCard
              shots={publicShots}
              reflectionLabel={t("reflection.label")}
              reflectionBody={t("reflection.body")}
              footerLabel={t("footerLink.label")}
              footerDomain={t("footerLink.domain")}
              footerUrl={t("footerLink.url")}
              footerExternal={t("footerLink.external")}
              lightboxBaseIndex={3}
              onShotClick={(i) => handleOpen(3 + i)()}
            />
          </article>
        </section>

        {/* Controls — prev | dots | next. 44x44 hit-areas (WCAG 2.5.5),
            touch-action manipulation kills the iOS 300ms tap delay. */}
        <div className="container-page mt-6 flex items-center justify-between">
          <button
            type="button"
            data-testid="cs-carousel-prev"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label={t("carousel.ariaPrev")}
            className="inline-flex size-12 cursor-pointer items-center justify-center text-2xl text-ink disabled:opacity-30"
            style={{ touchAction: "manipulation" }}
          >
            <span aria-hidden="true">&larr;</span>
          </button>

          <div
            className="flex items-center gap-1"
            role="tablist"
            aria-label={t("carousel.ariaPaginationLabel")}
          >
            {STATION_DOT_SPOT.map((spot, i) => (
              <button
                key={spot}
                type="button"
                data-testid="cs-carousel-dot"
                role="tab"
                aria-current={i === index ? "true" : "false"}
                aria-label={t("carousel.ariaDot", { index: i + 1, total: TOTAL })}
                onClick={() => goTo(i)}
                className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center"
                style={{ touchAction: "manipulation" }}
              >
                <span
                  aria-hidden="true"
                  className={`block size-3 rounded-full border border-ink ${
                    i === index ? SPOT_BG_CLASS[spot] : "bg-paper"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="cs-carousel-next"
            onClick={() => goTo(index + 1)}
            disabled={index === TOTAL - 1}
            aria-label={t("carousel.ariaNext")}
            className="inline-flex size-12 cursor-pointer items-center justify-center text-2xl text-ink disabled:opacity-30"
            style={{ touchAction: "manipulation" }}
          >
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>

        {/* aria-live status — announces the active station to AT users. */}
        <div
          data-testid="cs-carousel-live"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {t("carousel.ariaLive", {
            index: index + 1,
            total: TOTAL,
            label: stationLabels[index] ?? "",
          })}
        </div>
      </div>
    </section>
  );
}

export type { PublicShot };
