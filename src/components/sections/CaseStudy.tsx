"use client";

import { useTranslations } from "next-intl";
import { CoffeeRing } from "@/components/case-study/cliparts/CoffeeRing";
import { Lupe } from "@/components/case-study/cliparts/Lupe";
import { TintenSpot } from "@/components/case-study/cliparts/TintenSpot";
import { InkSplat } from "@/components/case-study/InkSplat";
import { StationContainer } from "@/components/case-study/StationContainer";
import { StationFrame } from "@/components/case-study/StationFrame";
import { HighlightStation } from "@/components/case-study/stations/HighlightStation";
import { HookStation } from "@/components/case-study/stations/HookStation";
import { PublicStation } from "@/components/case-study/stations/PublicStation";
import { StackStation } from "@/components/case-study/stations/StackStation";
import { WhatStation } from "@/components/case-study/stations/WhatStation";
import { TrackDecor } from "@/components/case-study/TrackDecor";

/**
 * Per-station layout (Phase-12 rework iteration 3). Tightened widths so
 * 3–4 stations are visible simultaneously between the InkColumns —
 * matches Manuel's sketch of "scattered paper notes streaming under
 * the ink columns". Vertical offsets + rotations give the track a
 * hand-laid feel rather than a dead-center grid. Highlight stations
 * stay wider (48vw) because they pair a polaroid with side text; the
 * public station is widest (58vw) for the 3-shot grid + reflection +
 * footer-link. Reduced-motion clamps offset+rotate to 0 (handled
 * inside StationFrame).
 */
const STATION_LAYOUT = {
  hook: { widthVw: 32, offsetYVh: -8, rotate: -2.5 },
  what: { widthVw: 38, offsetYVh: 5, rotate: 1.5 },
  stack: { widthVw: 30, offsetYVh: -4, rotate: -1 },
  admin: { widthVw: 48, offsetYVh: 7, rotate: 2 },
  overlay: { widthVw: 48, offsetYVh: -6, rotate: -1.5 },
  public: { widthVw: 58, offsetYVh: 4, rotate: 1 },
} as const;

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
      {/* Ink-edge fluid effect deferred — needs proper WebGL fluid-sim
          with DOM-card alpha compositing (cards visually emerging from
          fluid). Tracked as Phase 12 follow-up. */}
      <StationContainer>
        <StationFrame
          spot="rose"
          widthVw={STATION_LAYOUT.hook.widthVw}
          offsetYVh={STATION_LAYOUT.hook.offsetYVh}
          rotate={STATION_LAYOUT.hook.rotate}
        >
          <HookStation
            hookText={t("hook")}
            datestamp={hookStation.datestamp}
            polaroidCaption={hookStation.polaroidCaption ?? ""}
          />
        </StationFrame>
        {/* Decor between Hook and What — rose ink splat + tinten-spot pulse */}
        <TrackDecor widthVw={6} offsetYVh={5}>
          <InkSplat spot="rose" size={70} rotate={-18} opacity={0.6} />
          <TintenSpot spot="amber" className="absolute right-0 top-1/3" />
        </TrackDecor>
        <StationFrame
          spot="amber"
          widthVw={STATION_LAYOUT.what.widthVw}
          offsetYVh={STATION_LAYOUT.what.offsetYVh}
          rotate={STATION_LAYOUT.what.rotate}
        >
          <WhatStation label={t("context.label")} facts={facts} storyParas={storyParas} />
        </StationFrame>
        {/* Decor between What and Stack — coffee ring + small ink splat */}
        <TrackDecor widthVw={5} offsetYVh={-8}>
          <CoffeeRing className="absolute" />
          <InkSplat
            spot="mint"
            size={48}
            rotate={32}
            opacity={0.5}
            className="absolute -bottom-4"
          />
        </TrackDecor>
        <StationFrame
          spot="mint"
          widthVw={STATION_LAYOUT.stack.widthVw}
          offsetYVh={STATION_LAYOUT.stack.offsetYVh}
          rotate={STATION_LAYOUT.stack.rotate}
        >
          <StackStation
            heading={stackStation.heading}
            rule={stackStation.rule}
            intro={t("platform.intro")}
            modules={t("platform.modules")}
            stack={stack}
          />
        </StationFrame>
        {/* Decor between Stack and Admin highlight — bigger ink splat cluster */}
        <TrackDecor widthVw={7} offsetYVh={6}>
          <InkSplat spot="ink" size={80} rotate={-22} opacity={0.45} />
          <InkSplat
            spot="rose"
            size={36}
            rotate={50}
            opacity={0.55}
            className="absolute top-1/4 left-1/4"
          />
        </TrackDecor>
        {adminHighlight ? (
          <StationFrame
            spot="rose"
            widthVw={STATION_LAYOUT.admin.widthVw}
            offsetYVh={STATION_LAYOUT.admin.offsetYVh}
            rotate={STATION_LAYOUT.admin.rotate}
          >
            <div className="relative h-full w-full">
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
              {/* Lupe hovering over admin polaroid — bobs gently per existing
                  GSAP animation in the Lupe component itself. */}
              <Lupe className="pointer-events-none absolute top-[20%] left-[28%] z-20" />
            </div>
          </StationFrame>
        ) : null}
        {/* Decor between Admin and Overlay — small splats cluster */}
        <TrackDecor widthVw={5} offsetYVh={-4}>
          <InkSplat spot="amber" size={52} rotate={12} opacity={0.55} />
          <InkSplat
            spot="violet"
            size={28}
            rotate={-40}
            opacity={0.6}
            className="absolute bottom-1/4 right-1/4"
          />
        </TrackDecor>
        {overlayHighlight ? (
          <StationFrame
            spot="amber"
            widthVw={STATION_LAYOUT.overlay.widthVw}
            offsetYVh={STATION_LAYOUT.overlay.offsetYVh}
            rotate={STATION_LAYOUT.overlay.rotate}
          >
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
        {/* Decor between Overlay and Public — ink splash + tinten-spot */}
        <TrackDecor widthVw={6} offsetYVh={3}>
          <InkSplat spot="violet" size={64} rotate={-15} opacity={0.5} />
          <TintenSpot spot="mint" className="absolute -top-6 right-0" />
        </TrackDecor>
        <StationFrame
          spot="violet"
          widthVw={STATION_LAYOUT.public.widthVw}
          offsetYVh={STATION_LAYOUT.public.offsetYVh}
          rotate={STATION_LAYOUT.public.rotate}
        >
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
