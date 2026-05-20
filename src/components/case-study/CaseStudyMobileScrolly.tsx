"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { HighlightCard } from "@/components/case-study/cards/HighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";
import { CaseStudyMobileSim } from "@/components/scene/CaseStudyMobileSim";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
 * Mobile-Rework Phase 5 — Case-Study vertical scrolly.
 *
 * Spec §4.5: replaces the Desktop horizontal-pin Diorama with a vertical
 * 4-station scrolly on Mobile. Spacers between stations host the
 * CaseStudyMobileSim canvas — splat triggers fire when each station
 * passes through viewport centre, in the next station's spot color.
 *
 * Stations:
 *   1 · Hook (Joggediballa polaroid + hook text) — mint splat → station 2
 *   2 · Context + Stack — rose splat → station 3
 *   3 · Admin + Overlay highlights — amber splat → station 4
 *   4 · Public shots strip + reflection
 *
 * Lightbox plumbing is shared with Desktop — the parent CaseStudy
 * passes `handleOpen` and `publicShots` (so lightboxImages indices stay
 * consistent across both views).
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

const STATION_IDS = [
  "cs-station-hook",
  "cs-station-context",
  "cs-station-highlights",
  "cs-station-public",
] as const;

export function CaseStudyMobileScrolly({ handleOpen, publicShots }: Props) {
  const t = useTranslations("caseStudy");
  const reduced = useReducedMotion();

  const facts = t.raw("context.facts") as CaseStudyFacts;
  const storyParas = t.raw("context.story") as CaseStudyStory;
  const stack = t.raw("platform.stack") as CaseStudyStack;
  const highlights = t.raw("highlights.items") as CaseStudyHighlights;
  const hookStation = t.raw("stations.hook") as CaseStudyHookStation;
  const stackStation = t.raw("stations.stack") as CaseStudyStackStation;
  const highlightAdmin = t.raw("stations.highlightAdmin") as CaseStudyHighlightAdmin;
  const highlightOverlay = t.raw("stations.highlightOverlay") as CaseStudyHighlightOverlay;

  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  const stationIds = useMemo(() => [...STATION_IDS], []);

  return (
    <section id="case-study" aria-labelledby="case-study-heading" className="relative">
      <h2 id="case-study-heading" className="sr-only">
        {t("headline")}
      </h2>

      {/* Sim canvas sits behind the content; ScrollTrigger inside the
          component fires station-transition splats. Hidden under
          prefers-reduced-motion (per CaseStudyMobileSim's own guard). */}
      {!reduced && <CaseStudyMobileSim stationIds={stationIds} />}

      {/* Removed bg-paper from section above so the sim canvas at -z-10
          shows through in the gaps between stations. Cards keep their
          bg-paper-tint, so the gap-32 spacers become the visible sim
          surface where ScrollTrigger fires station-transition splats. */}
      <div className="container-page relative flex flex-col gap-32 py-20">
        {/* Station 1: Hook */}
        <article data-testid="cs-station-hook" id="cs-station-hook" className="relative">
          <HookCard
            hookText={t("hook")}
            datestamp={hookStation.datestamp}
            polaroidCaption={hookStation.polaroidCaption ?? ""}
            lightboxIndex={0}
            onPolaroidClick={handleOpen(0)}
          />
        </article>

        {/* Station 2: Context + Stack — thematic pair */}
        <article
          data-testid="cs-station-context"
          id="cs-station-context"
          className="relative flex flex-col gap-8"
        >
          <WhatCard label={t("context.label")} facts={facts} storyParas={storyParas} />
          <StackCard heading={stackStation.heading} stack={stack} />
        </article>

        {/* Station 3: Admin + Overlay highlights */}
        <article
          data-testid="cs-station-highlights"
          id="cs-station-highlights"
          className="relative flex flex-col gap-8"
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

        {/* Station 4: Public shots */}
        <article data-testid="cs-station-public" id="cs-station-public" className="relative">
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
      </div>
    </section>
  );
}

export { type PublicShot };
