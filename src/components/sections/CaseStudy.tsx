"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { HighlightCard } from "@/components/case-study/cards/HighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";
import { DioramaCards } from "@/components/case-study/DioramaCards";
import { DioramaIllustration } from "@/components/case-study/DioramaIllustration";
import { DioramaLupe } from "@/components/case-study/DioramaLupe";
import { DioramaTrack } from "@/components/case-study/DioramaTrack";
import { Lightbox } from "@/components/case-study/Lightbox";
import { buildPublicShotImage, LIGHTBOX_IMAGES } from "@/components/case-study/lightboxConfig";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { type LightboxImage, useLightboxStore } from "@/lib/lightboxStore";

import type {
  CaseStudyFacts,
  CaseStudyHighlightAdmin,
  CaseStudyHighlightOverlay,
  CaseStudyHighlights,
  CaseStudyHookStation,
  CaseStudyPublicShots,
  CaseStudyStack,
  CaseStudyStackStation,
  CaseStudyStory,
} from "@/types/i18n-shapes";

// Mobile-Rework spec §4.5: lazy-import the Mobile scrolly so Desktop
// bundle stays free of the per-station Sim canvas wiring.
const CaseStudyMobileScrolly = dynamic(
  () =>
    import("@/components/case-study/CaseStudyMobileScrolly").then((m) => m.CaseStudyMobileScrolly),
  { ssr: false },
);

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
  const isMobile = useMobileLayout();

  const facts = t.raw("context.facts") as CaseStudyFacts;
  const storyParas = t.raw("context.story") as CaseStudyStory;
  const stack = t.raw("platform.stack") as CaseStudyStack;
  const highlights = t.raw("highlights.items") as CaseStudyHighlights;
  const hookStation = t.raw("stations.hook") as CaseStudyHookStation;
  const stackStation = t.raw("stations.stack") as CaseStudyStackStation;
  const highlightAdmin = t.raw("stations.highlightAdmin") as CaseStudyHighlightAdmin;
  const highlightOverlay = t.raw("stations.highlightOverlay") as CaseStudyHighlightOverlay;
  const publicShotsI18n = t.raw("stations.publicShots") as CaseStudyPublicShots;

  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  // Wrap in useMemo so the array reference is stable across renders.
  // Without this the downstream `lightboxImages` memo would never hit
  // (its `publicShots` dep is a freshly-allocated array every render),
  // re-firing the `useEffect([lightboxImages, setLightboxImages])`
  // and re-rendering the Lightbox subscriber on every parent render.
  const publicLayerLabel = t("publicLayer.label");
  const publicShots = useMemo(
    () =>
      PUBLIC_SHOT_CONFIG.map((cfg, i) => ({
        ...cfg,
        alt: `${publicLayerLabel} ${i + 1}`,
        datestamp: publicShotsI18n[i]?.datestamp ?? "",
        caption: publicShotsI18n[i]?.caption ?? "",
      })),
    [publicShotsI18n, publicLayerLabel],
  );

  // Image set for the lightbox — fixed order: hook (0), admin (1),
  // overlay (2), public shots 3/4/5. Each entry merges the static
  // LIGHTBOX_IMAGES manifest (paths + aspect ratios) with the
  // per-locale alt + caption strings.
  const lightboxImages = useMemo<LightboxImage[]>(() => {
    const out: LightboxImage[] = [
      {
        ...LIGHTBOX_IMAGES.hook,
        alt: "Joggediballa Homepage Mobile",
        caption: hookStation.polaroidCaption ?? "",
      },
    ];
    if (adminHighlight) {
      out.push({
        ...LIGHTBOX_IMAGES.admin,
        alt: adminHighlight.screenshotAlt,
        caption: highlightAdmin.polaroidCaption ?? "",
      });
    }
    if (overlayHighlight) {
      out.push({
        ...LIGHTBOX_IMAGES.overlay,
        alt: overlayHighlight.screenshotAlt,
        caption: highlightOverlay.polaroidCaption ?? "",
      });
    }
    publicShots.forEach((s) => {
      out.push({
        ...buildPublicShotImage(s.slug, s.aspect),
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
      <h2 id="case-study-heading" className="type-h1 text-ink">
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

  // Mobile-Rework spec §4.5: vertical scrolly with per-station Sim
  // transitions replaces the horizontal-pin Diorama. Desktop branch
  // (Tablet + fine-pointer) is unchanged.
  if (isMobile) {
    return (
      <>
        <CaseStudyMobileScrolly handleOpen={handleOpen} publicShots={publicShots} />
        <Lightbox />
      </>
    );
  }

  // Desktop: full diorama with sticky-pin + horizontal scroll.
  return (
    <>
      <DioramaTrack mobileFallback={mobileFallback} sectionLabel={t("sectionLabel")}>
        <h2 id="case-study-heading" className="sr-only">
          {t("headline")}
        </h2>
        <DioramaIllustration />
        {adminHighlight && overlayHighlight ? (
          <DioramaCards
            hook={{
              hookText: t("hook"),
              station: hookStation,
              onClick: handleOpen(0),
            }}
            context={{
              whatLabel: t("context.label"),
              facts,
              storyParas,
              stackHeading: stackStation.heading,
              stack,
            }}
            admin={{
              kicker: adminHighlight.kicker,
              title: adminHighlight.title,
              lede: adminHighlight.lede,
              features: adminHighlight.features,
              screenshotAlt: adminHighlight.screenshotAlt,
              station: highlightAdmin,
              onClick: handleOpen(1),
            }}
            overlay={{
              kicker: overlayHighlight.kicker,
              title: overlayHighlight.title,
              lede: overlayHighlight.lede,
              features: overlayHighlight.features,
              screenshotAlt: overlayHighlight.screenshotAlt,
              station: highlightOverlay,
              onClick: handleOpen(2),
            }}
            public={{
              shots: publicShots,
              reflectionLabel: t("reflection.label"),
              reflectionBody: t("reflection.body"),
              footerLabel: t("footerLink.label"),
              footerDomain: t("footerLink.domain"),
              footerUrl: t("footerLink.url"),
              footerExternal: t("footerLink.external"),
              onShotClick: (i) => handleOpen(3 + i)(),
            }}
          />
        ) : null}
        <DioramaLupe />
      </DioramaTrack>
      <Lightbox />
    </>
  );
}
