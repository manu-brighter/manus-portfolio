"use client";

import { useTranslations } from "next-intl";
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
} from "@/components/case-study/MobileDioramaDecor";
import { FadeIn } from "@/components/motion/FadeIn";
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
 * Mobile Case-Study — vertical station flow.
 *
 * Replaces the side-swipe carousel from the first mobile rework
 * (Manuel: too many horizontal swipers). The 6 narrative stations now
 * stack in the page's natural scroll, divided by ink rules, each on a
 * paper-tint desk surface (which also isolates the section from the
 * full-page background sim) with a numbered station stamp and a light
 * scatter of the desk-diorama props. Entrances are FadeIns with a low
 * threshold — stations can be taller than the viewport, so a higher
 * IO threshold would never fire on them.
 *
 * Lightbox plumbing is shared with Desktop (hook=0, admin=1,
 * overlay=2, public shots=3..5).
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

/** Station stamp dot color — one spot per station across the 6-station flow. */
const STATION_SPOT: SpotColor[] = ["mint", "violet", "amber", "rose", "amber", "violet"];

const SPOT_BG_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};

const STATION_CLASS = "relative overflow-hidden bg-paper-tint px-6 py-14";
const CONTENT_CLASS = "relative z-10";

/** Numbered mono stamp above each station's card. */
function StationStamp({ index, label }: { index: number; label: string }) {
  const spot = STATION_SPOT[index] ?? "mint";
  return (
    <p className="mb-6 flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`size-2.5 rounded-full border border-ink ${SPOT_BG_CLASS[spot]}`}
      />
      <span className="type-label-stamp">
        {String(index + 1).padStart(2, "0")} · {label}
      </span>
    </p>
  );
}

/** Inert decor layer behind a station's content. */
function StationDecor({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {children}
    </div>
  );
}

export function CaseStudyMobileStations({ handleOpen, publicShots }: Props) {
  const t = useTranslations("caseStudy");

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

  return (
    <section id="case-study" aria-labelledby="case-study-heading" className="relative py-12">
      <h2 id="case-study-heading" className="sr-only">
        {t("headline")}
      </h2>

      <div className="divide-y-2 divide-ink border-ink border-y-2">
        {/* Station 1 · Hook */}
        <article data-testid="cs-station-hook" id="cs-station-hook" className={STATION_CLASS}>
          <StationDecor>
            <InkSplat color="rose" className="absolute top-3 left-3 w-16 opacity-50" />
            <CameraProp className="absolute top-2 right-3 w-20 rotate-6 opacity-80" />
          </StationDecor>
          <FadeIn as="div" y={24} threshold={0.15} className={CONTENT_CLASS}>
            <StationStamp index={0} label={stationLabels[0] ?? ""} />
            <HookCard
              hookText={t("hook")}
              datestamp={hookStation.datestamp}
              polaroidCaption={hookStation.polaroidCaption ?? ""}
              lightboxIndex={0}
              onPolaroidClick={handleOpen(0)}
            />
          </FadeIn>
        </article>

        {/* Station 2 · Context (What) */}
        <article data-testid="cs-station-what" id="cs-station-what" className={STATION_CLASS}>
          <StationDecor>
            <InkSplat color="amber" className="absolute top-3 right-3 w-20 opacity-50" />
            <PencilProp className="absolute bottom-2 left-3 w-24 -rotate-6 opacity-80" />
          </StationDecor>
          <FadeIn as="div" y={24} threshold={0.15} className={CONTENT_CLASS}>
            <StationStamp index={1} label={stationLabels[1] ?? ""} />
            <WhatCard label={t("context.label")} facts={facts} storyParas={storyParas} />
          </FadeIn>
        </article>

        {/* Station 3 · Stack */}
        <article data-testid="cs-station-stack" id="cs-station-stack" className={STATION_CLASS}>
          <StationDecor>
            <FlashProp className="absolute top-2 right-4 w-14 rotate-6 opacity-80" />
            <RulerProp className="absolute right-3 bottom-2 w-36 rotate-[8deg] opacity-80" />
          </StationDecor>
          <FadeIn as="div" y={24} threshold={0.15} className={CONTENT_CLASS}>
            <StationStamp index={2} label={stationLabels[2] ?? ""} />
            <StackCard heading={stackStation.heading} stack={stack} />
          </FadeIn>
        </article>

        {/* Station 4 · Highlight · Admin */}
        <article data-testid="cs-station-admin" id="cs-station-admin" className={STATION_CLASS}>
          <StationDecor>
            <InkSplat color="mint" className="absolute top-3 left-3 w-20 opacity-50" />
          </StationDecor>
          <FadeIn as="div" y={24} threshold={0.15} className={CONTENT_CLASS}>
            <StationStamp index={3} label={stationLabels[3] ?? ""} />
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
          </FadeIn>
        </article>

        {/* Station 5 · Highlight · Twitch-Overlay */}
        <article data-testid="cs-station-overlay" id="cs-station-overlay" className={STATION_CLASS}>
          <StationDecor>
            <InkSplat color="amber" className="absolute bottom-3 left-3 w-16 opacity-50" />
            <MobileLupe className="absolute top-2 right-3 z-20 h-16 w-16" />
          </StationDecor>
          <FadeIn as="div" y={24} threshold={0.15} className={CONTENT_CLASS}>
            <StationStamp index={4} label={stationLabels[4] ?? ""} />
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
          </FadeIn>
        </article>

        {/* Station 6 · Public */}
        <article data-testid="cs-station-public" id="cs-station-public" className={STATION_CLASS}>
          <StationDecor>
            <InkSplat color="violet" className="absolute top-3 left-3 w-20 opacity-50" />
            <CoffeeProp className="absolute right-2 bottom-2 w-24 -rotate-6 opacity-80" />
          </StationDecor>
          <FadeIn as="div" y={24} threshold={0.15} className={CONTENT_CLASS}>
            <StationStamp index={5} label={stationLabels[5] ?? ""} />
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
          </FadeIn>
        </article>
      </div>
    </section>
  );
}

export type { PublicShot };
