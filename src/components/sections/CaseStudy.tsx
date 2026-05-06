"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { AdminHighlightCard } from "@/components/case-study/cards/AdminHighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { OverlayHighlightCard } from "@/components/case-study/cards/OverlayHighlightCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";
import { DioramaCards } from "@/components/case-study/DioramaCards";
import { DioramaIllustration } from "@/components/case-study/DioramaIllustration";
import { DioramaLupe } from "@/components/case-study/DioramaLupe";
import { DioramaTrack } from "@/components/case-study/DioramaTrack";
import { Lightbox } from "@/components/case-study/Lightbox";
import { type LightboxImage, useLightboxStore } from "@/lib/lightboxStore";

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string };
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
type DateCaption = { datestamp: string; polaroidCaption?: string };
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
  const hookStation = t.raw("stations.hook") as DateCaption;
  const stackStation = t.raw("stations.stack") as { heading: string };
  const highlightAdmin = t.raw("stations.highlightAdmin") as DateCaption;
  const highlightOverlay = t.raw("stations.highlightOverlay") as DateCaption;
  const publicShotsI18n = t.raw("stations.publicShots") as PublicShotI18n[];

  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  const publicShots = PUBLIC_SHOT_CONFIG.map((cfg, i) => ({
    ...cfg,
    alt: `${t("publicLayer.label")} ${i + 1}`,
    datestamp: publicShotsI18n[i]?.datestamp ?? "",
    caption: publicShotsI18n[i]?.caption ?? "",
  }));

  // Image set for the lightbox — fixed order: hook (0), admin (1),
  // overlay (2), public shots 3/4/5. Each entry uses the largest
  // available width as the lightbox source.
  const lightboxImages = useMemo<LightboxImage[]>(() => {
    const out: LightboxImage[] = [
      {
        fullSrc: "/projects/joggediballa/homepage-phone-720w.jpg",
        avifSrc: "/projects/joggediballa/homepage-phone-720w.avif",
        webpSrc: "/projects/joggediballa/homepage-phone-720w.webp",
        aspect: 540 / 960,
        alt: "Joggediballa Homepage Mobile",
        caption: hookStation.polaroidCaption ?? "",
      },
    ];
    if (adminHighlight) {
      out.push({
        fullSrc: "/projects/joggediballa/admin-1200w.jpg",
        avifSrc: "/projects/joggediballa/admin-1200w.avif",
        webpSrc: "/projects/joggediballa/admin-1200w.webp",
        aspect: 800 / 450,
        alt: adminHighlight.screenshotAlt,
        caption: highlightAdmin.polaroidCaption ?? "",
      });
    }
    if (overlayHighlight) {
      out.push({
        fullSrc: "/projects/joggediballa/twitchoverlay-1200w.jpg",
        avifSrc: "/projects/joggediballa/twitchoverlay-1200w.avif",
        webpSrc: "/projects/joggediballa/twitchoverlay-1200w.webp",
        aspect: 800 / 450,
        alt: overlayHighlight.screenshotAlt,
        caption: highlightOverlay.polaroidCaption ?? "",
      });
    }
    publicShots.forEach((s) => {
      const isPortrait = s.aspect === "9/16";
      const fallbackW = isPortrait ? 720 : 1200;
      out.push({
        fullSrc: `/projects/joggediballa/${s.slug}-${fallbackW}w.jpg`,
        avifSrc: `/projects/joggediballa/${s.slug}-${fallbackW}w.avif`,
        webpSrc: `/projects/joggediballa/${s.slug}-${fallbackW}w.webp`,
        aspect: isPortrait ? 540 / 960 : 800 / 450,
        alt: s.alt,
        caption: s.caption,
      });
    });
    return out;
  }, [
    adminHighlight,
    overlayHighlight,
    highlightAdmin.polaroidCaption,
    highlightOverlay.polaroidCaption,
    hookStation.polaroidCaption,
    publicShots,
  ]);

  const setLightboxImages = useLightboxStore((s) => s.setImages);
  const openLightbox = useLightboxStore((s) => s.open);
  useEffect(() => {
    setLightboxImages(lightboxImages);
  }, [lightboxImages, setLightboxImages]);

  // Click handler factory: looks up the polaroid button via its
  // data-lightbox-index attribute, captures its bounding rect, then
  // opens the lightbox.
  const handleOpen = (index: number) => () => {
    if (typeof document === "undefined") return;
    const el = document.querySelector<HTMLElement>(`[data-lightbox-index="${index}"]`);
    const rect = el?.getBoundingClientRect();
    if (!rect) return;
    openLightbox(index, rect);
  };

  // Mobile / reduced-motion fallback: render the cards in a vertical
  // stack without illustration or fluid-sim.
  const mobileFallback = (
    <div className="container-page flex flex-col gap-12 py-12">
      <h2 id="case-study-heading" className="type-h2 text-ink">
        {t("headline")}
      </h2>
      <HookCard
        hookText={t("hook")}
        datestamp={hookStation.datestamp}
        polaroidCaption={hookStation.polaroidCaption ?? ""}
        lightboxIndex={0}
        onPolaroidClick={handleOpen(0)}
      />
      <WhatCard label={t("context.label")} facts={facts} storyParas={storyParas} />
      <StackCard heading={stackStation.heading} stack={stack} />
      {adminHighlight ? (
        <AdminHighlightCard
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
        <OverlayHighlightCard
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
  );

  // Desktop: full diorama with sticky-pin + horizontal scroll.
  return (
    <>
      <DioramaTrack mobileFallback={mobileFallback}>
        <h2 id="case-study-heading" className="sr-only">
          {t("headline")}
        </h2>
        <DioramaIllustration />
        {adminHighlight && overlayHighlight ? (
          <DioramaCards
            hookText={t("hook")}
            hookStation={hookStation}
            storyParas={storyParas}
            whatLabel={t("context.label")}
            facts={facts}
            stackHeading={stackStation.heading}
            stack={stack}
            adminKicker={adminHighlight.kicker}
            adminTitle={adminHighlight.title}
            adminLede={adminHighlight.lede}
            adminFeatures={adminHighlight.features}
            adminScreenshotAlt={adminHighlight.screenshotAlt}
            adminStation={highlightAdmin}
            overlayKicker={overlayHighlight.kicker}
            overlayTitle={overlayHighlight.title}
            overlayLede={overlayHighlight.lede}
            overlayFeatures={overlayHighlight.features}
            overlayScreenshotAlt={overlayHighlight.screenshotAlt}
            overlayStation={highlightOverlay}
            publicShots={publicShots}
            reflectionLabel={t("reflection.label")}
            reflectionBody={t("reflection.body")}
            footerLabel={t("footerLink.label")}
            footerDomain={t("footerLink.domain")}
            footerUrl={t("footerLink.url")}
            footerExternal={t("footerLink.external")}
            hookOnClick={handleOpen(0)}
            adminOnClick={handleOpen(1)}
            overlayOnClick={handleOpen(2)}
            publicOnShotClick={(i) => handleOpen(3 + i)()}
          />
        ) : null}
        <DioramaLupe />
      </DioramaTrack>
      <Lightbox />
    </>
  );
}
