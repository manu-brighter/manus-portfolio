"use client";

import { useTranslations } from "next-intl";
import { StationContainer } from "@/components/case-study/StationContainer";
import { StationFrame } from "@/components/case-study/StationFrame";
import { HighlightStation } from "@/components/case-study/stations/HighlightStation";
import { HookStation } from "@/components/case-study/stations/HookStation";
import { PublicStation } from "@/components/case-study/stations/PublicStation";
import { StackStation } from "@/components/case-study/stations/StackStation";
import { WhatStation } from "@/components/case-study/stations/WhatStation";

// NOTE — Phase-12 first-iteration overlays disabled:
//
//   • PaperWorkplace (full-bleed detail-layer SVG): the 6000×1000 viewBox
//     with `preserveAspectRatio="none"` stretched into the section's
//     100vh × auto block, distorting the inkblot decorations into giant
//     blurred shapes that dominated the foreground.
//
//   • InkTransition (1 shared WebGL canvas): the canvas covers the
//     viewport with `position: fixed` + `z-30` and the mask-composite
//     shader paints paper-color over the entire scene whenever active=
//     true. Without an opacity drain after the splat, it left the
//     stations completely covered through the entire pinned phase.
//
//   • Lupe / CoffeeRing / TintenSpot cliparts: positioned `absolute` on
//     the outer wrapper, they don't move with the horizontal track and
//     anchor to fixed positions during the pinned phase, drifting visually
//     out of context.
//
// All three primitives stay in the codebase and will be re-architected
// in a follow-up sprint. The horizontal-scroll + station fade-in is the
// load-bearing visual; we ship that solid first.

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string; why: string };
type Feature = { title: string; body: string };
type Highlight = {
  id: string;
  kicker: string;
  title: string;
  lede: string;
  screenshot: string;
  screenshotAlt: string;
  features: Feature[];
};
type StationDateCaption = { datestamp: string; polaroidCaption?: string };
type PublicShotI18n = { datestamp: string; caption: string };

const PUBLIC_SHOT_CONFIG: {
  slug: string;
  aspect: "16/9" | "9/16";
  spot: "mint" | "violet" | "rose" | "amber";
  rotate: number;
}[] = [
  { slug: "statistics", aspect: "16/9", spot: "mint", rotate: -2 },
  { slug: "goennerverwaltung", aspect: "16/9", spot: "violet", rotate: 3 },
  { slug: "formular-phone", aspect: "9/16", spot: "rose", rotate: -1 },
];

export function CaseStudy() {
  const t = useTranslations("caseStudy");

  const facts = t.raw("context.facts") as Fact[];
  const storyParas = t.raw("context.story") as string[];
  const stack = t.raw("platform.stack") as StackRow[];
  const highlights = t.raw("highlights.items") as Highlight[];
  const hookStation = t.raw("stations.hook") as StationDateCaption;
  const stackStation = t.raw("stations.stack") as { heading: string; rule: string };
  const highlightAdmin = t.raw("stations.highlightAdmin") as StationDateCaption;
  const highlightOverlay = t.raw("stations.highlightOverlay") as StationDateCaption;
  const publicShotsI18n = t.raw("stations.publicShots") as PublicShotI18n[];

  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  return (
    <div className="relative">
      <h2 id="case-study-heading" className="sr-only">
        {t("headline")}
      </h2>
      <StationContainer>
        <StationFrame spot="rose">
          <HookStation
            hookText={t("hook")}
            datestamp={hookStation.datestamp}
            polaroidCaption={hookStation.polaroidCaption ?? ""}
          />
        </StationFrame>
        <StationFrame spot="amber">
          <WhatStation label={t("context.label")} facts={facts} storyParas={storyParas} />
        </StationFrame>
        <StationFrame spot="mint">
          <StackStation
            heading={stackStation.heading}
            rule={stackStation.rule}
            intro={t("platform.intro")}
            modules={t("platform.modules")}
            stack={stack}
          />
        </StationFrame>
        {adminHighlight ? (
          <StationFrame spot="rose">
            <HighlightStation
              kicker={adminHighlight.kicker}
              title={adminHighlight.title}
              lede={adminHighlight.lede}
              features={adminHighlight.features}
              screenshotSlug="admin"
              screenshotAlt={adminHighlight.screenshotAlt}
              datestamp={highlightAdmin.datestamp}
              polaroidCaption={highlightAdmin.polaroidCaption ?? ""}
              spot="rose"
              rotate={2}
            />
          </StationFrame>
        ) : null}
        {overlayHighlight ? (
          <StationFrame spot="amber">
            <HighlightStation
              kicker={overlayHighlight.kicker}
              title={overlayHighlight.title}
              lede={overlayHighlight.lede}
              features={overlayHighlight.features}
              screenshotSlug="twitchoverlay"
              screenshotAlt={overlayHighlight.screenshotAlt}
              datestamp={highlightOverlay.datestamp}
              polaroidCaption={highlightOverlay.polaroidCaption ?? ""}
              spot="amber"
              rotate={-2}
            />
          </StationFrame>
        ) : null}
        <StationFrame spot="violet">
          <PublicStation
            publicShots={PUBLIC_SHOT_CONFIG.map((cfg, i) => ({
              ...cfg,
              alt: `${t("publicLayer.label")} ${i + 1}`,
              datestamp: publicShotsI18n[i]?.datestamp ?? "",
              caption: publicShotsI18n[i]?.caption ?? "",
            }))}
            reflectionLabel={t("reflection.label")}
            reflectionBody={t("reflection.body")}
            footerLabel={t("footerLink.label")}
            footerDomain={t("footerLink.domain")}
            footerUrl={t("footerLink.url")}
            footerExternal={t("footerLink.external")}
          />
        </StationFrame>
      </StationContainer>
    </div>
  );
}
