"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { HighlightCard } from "@/components/case-study/cards/HighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";
import {
  CameraProp,
  CoffeeProp,
  FlashProp,
  InkSplat,
  MobileLupe,
  PencilProp,
  RulerProp,
  TableLine,
} from "@/components/case-study/MobileDioramaDecor";
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
 * Horizontal swipeable carousel of the 4 narrative stations (same content
 * the Desktop Diorama lays out horizontally). Not height-pinned so a
 * vertical drag scrolls the page past it; only horizontal drags blade
 * through stations. Arrows + dots + swipe hint + aria-live.
 *
 * Flair: each slide is its own little "desk diorama" — a paper-tint surface
 * (which also isolates the section from the full-page background sim) framed
 * by comic table-edge lines, with the Desktop illustration's props (camera,
 * pencil, ruler, flash, coffee mug), curated ink splats, and the animated
 * magnifier (Lupe) scattered into the slides' empty space. Decor lives in a
 * pointer-events-none layer behind the card content. See MobileDioramaDecor.
 *
 * Lightbox plumbing is shared with Desktop (hook=0, admin=1, overlay=2,
 * public shots=3..5).
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

const TOTAL = 6;

/** Dot color per station — one spot per slide across the 6-station flow. */
const STATION_DOT_SPOT: SpotColor[] = ["mint", "violet", "amber", "rose", "amber", "violet"];

const SPOT_BG_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};

/**
 * Shared slide shell: one diorama panel == exactly one screen (h-full of the
 * 80svh track). Each slide holds a SINGLE card now (the dense stations were
 * split — highlights into admin + overlay, context into what + stack) so the
 * content fits one screen and is vertically centred without clipping or the
 * runaway empty space the equal-height-to-tallest approach produced.
 * `overflow-hidden` clips props that bleed past the slide edge.
 */
const SLIDE_CLASS =
  "relative flex h-full w-full shrink-0 snap-center snap-always flex-col justify-center overflow-hidden bg-paper-tint";
/** Content column above the decor layer — centred single card. */
const CONTENT_CLASS = "relative z-10 flex flex-col px-6";

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
        {/* Carousel track — one screen tall (80svh). `touch-pan-x` is the fix
            for the "first swipe stops halfway": without it the browser has to
            arbitrate horizontal-swipe vs vertical-page-scroll on every touch
            that starts on the track, and the first (cold) swipe gets partly
            eaten by that arbitration. Declaring the track horizontal makes
            side-swipes land cleanly from the first one. Trade-off: vertical
            page-scroll is started off the track (swipe hint above, dots/arrows
            below, neighbouring sections). */}
        <section
          ref={trackRef as React.RefObject<HTMLElement>}
          data-testid="cs-carousel-track"
          aria-roledescription="carousel"
          aria-label={t("carousel.ariaLabel")}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: ARIA carousel pattern — region is tab stop for arrow-key nav
          tabIndex={0}
          onKeyDown={onKey}
          className="flex h-[80svh] snap-x snap-mandatory touch-pan-x overflow-x-auto border-ink border-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-spot-mint)] focus-visible:ring-offset-2"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Station 1 · Hook */}
          <article
            data-testid="cs-station-hook"
            id="cs-station-hook"
            aria-roledescription="slide"
            aria-label={slideLabel(0)}
            className={SLIDE_CLASS}
          >
            <SlideDecor>
              <InkSplat color="rose" className="absolute top-[6%] left-[5%] w-20 opacity-60" />
              <CameraProp className="absolute top-[4%] right-[5%] w-24 rotate-6 opacity-90" />
            </SlideDecor>
            <div className={CONTENT_CLASS}>
              <HookCard
                hookText={t("hook")}
                datestamp={hookStation.datestamp}
                polaroidCaption={hookStation.polaroidCaption ?? ""}
                lightboxIndex={0}
                onPolaroidClick={handleOpen(0)}
              />
            </div>
          </article>

          {/* Station 2 · Context (What) */}
          <article
            data-testid="cs-station-what"
            id="cs-station-what"
            aria-roledescription="slide"
            aria-label={slideLabel(1)}
            className={SLIDE_CLASS}
          >
            <SlideDecor>
              <InkSplat color="amber" className="absolute top-[5%] right-[6%] w-24 opacity-60" />
              <PencilProp className="absolute bottom-[5%] left-[4%] w-28 -rotate-6 opacity-90" />
            </SlideDecor>
            <div className={CONTENT_CLASS}>
              <WhatCard label={t("context.label")} facts={facts} storyParas={storyParas} />
            </div>
          </article>

          {/* Station 3 · Stack */}
          <article
            data-testid="cs-station-stack"
            id="cs-station-stack"
            aria-roledescription="slide"
            aria-label={slideLabel(2)}
            className={SLIDE_CLASS}
          >
            <SlideDecor>
              <InkSplat color="mint" className="absolute top-[7%] left-[6%] w-20 opacity-55" />
              <RulerProp className="absolute right-[4%] bottom-[7%] w-40 rotate-[8deg] opacity-90" />
            </SlideDecor>
            <div className={CONTENT_CLASS}>
              <StackCard heading={stackStation.heading} stack={stack} />
            </div>
          </article>

          {/* Station 4 · Highlight · Admin */}
          <article
            data-testid="cs-station-admin"
            id="cs-station-admin"
            aria-roledescription="slide"
            aria-label={slideLabel(3)}
            className={SLIDE_CLASS}
          >
            <SlideDecor>
              <InkSplat color="mint" className="absolute top-[5%] left-[5%] w-24 opacity-60" />
              <FlashProp className="absolute right-[5%] bottom-[5%] w-14 rotate-6 opacity-90" />
            </SlideDecor>
            <div className={CONTENT_CLASS}>
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
            </div>
          </article>

          {/* Station 5 · Highlight · Twitch-Overlay */}
          <article
            data-testid="cs-station-overlay"
            id="cs-station-overlay"
            aria-roledescription="slide"
            aria-label={slideLabel(4)}
            className={SLIDE_CLASS}
          >
            <SlideDecor>
              <InkSplat color="amber" className="absolute bottom-[6%] left-[5%] w-20 opacity-55" />
              <MobileLupe className="absolute top-[5%] right-[6%] z-20 h-20 w-20" />
            </SlideDecor>
            <div className={CONTENT_CLASS}>
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
            </div>
          </article>

          {/* Station 6 · Public */}
          <article
            data-testid="cs-station-public"
            id="cs-station-public"
            aria-roledescription="slide"
            aria-label={slideLabel(5)}
            className={SLIDE_CLASS}
          >
            <SlideDecor>
              <InkSplat color="violet" className="absolute top-[5%] left-[5%] w-24 opacity-60" />
              <CoffeeProp className="absolute right-[3%] bottom-[4%] w-28 -rotate-6 opacity-90" />
            </SlideDecor>
            <div className={CONTENT_CLASS}>
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
            </div>
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

          {/* A plain group of go-to-slide buttons — NOT a role=tablist: the
              stations carry aria-roledescription="slide", not tabpanels, so a
              tablist would be a mismatched pattern. Each dot is self-labelled
              (aria-label) and the active one is marked with aria-current. */}
          <div className="flex items-center gap-1">
            {STATION_DOT_SPOT.map((spot, i) => (
              <button
                key={spot}
                type="button"
                data-testid="cs-carousel-dot"
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

/**
 * Per-slide decor layer: framing table-edge lines + the caller's scattered
 * diorama props/splats. Inert (aria-hidden, pointer-events-none), painted
 * behind the card content.
 */
function SlideDecor({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <TableLine className="absolute top-[2%] left-0 h-3 w-full opacity-70" />
      <TableLine className="absolute bottom-[2%] left-0 h-3 w-full opacity-70" />
      {children}
    </div>
  );
}

export type { PublicShot };
