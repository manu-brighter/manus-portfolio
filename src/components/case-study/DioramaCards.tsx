import type { CSSProperties } from "react";
import { AdminHighlightCard } from "@/components/case-study/cards/AdminHighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { OverlayHighlightCard } from "@/components/case-study/cards/OverlayHighlightCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string; why?: string };
type Feature = { title: string; body: string };
type StationDateCaption = { datestamp: string; polaroidCaption?: string };

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  alt: string;
  datestamp: string;
  caption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate: number;
};

type Props = {
  hookText: string;
  hookStation: StationDateCaption;
  whatLabel: string;
  facts: Fact[];
  storyParas: string[];
  stackHeading: string;
  stackRule: string;
  platformIntro: string;
  platformModules: string;
  stack: StackRow[];
  adminKicker: string;
  adminTitle: string;
  adminLede: string;
  adminFeatures: Feature[];
  adminScreenshotAlt: string;
  adminStation: StationDateCaption;
  overlayKicker: string;
  overlayTitle: string;
  overlayLede: string;
  overlayFeatures: Feature[];
  overlayScreenshotAlt: string;
  overlayStation: StationDateCaption;
  publicShots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
};

/**
 * DioramaCards — absolute-positioned card layer over DioramaIllustration.
 *
 * Coordinates in vh units (top, left, width, height) so the layout
 * scales consistently across normal and ultrawide displays. The track
 * is 420vh wide; each card's left/top is defined relative to that.
 *
 * Positions match the v3 mockup approved during brainstorming
 * (2026-05-05). Hook polaroid enlarged 20% from prior iteration as
 * eye-catcher.
 */

const CARD_LAYOUT: Record<string, CSSProperties> = {
  hook: { left: "42vh", top: "29vh", width: "24vh", height: "38vh", transform: "rotate(-4deg)" },
  what: { left: "82vh", top: "48vh", width: "38vh", height: "22vh", transform: "rotate(2deg)" },
  stack: { left: "128vh", top: "28vh", width: "24vh", height: "28vh", transform: "rotate(-7deg)" },
  admin: { left: "162vh", top: "38vh", width: "50vh", height: "35vh", transform: "rotate(3deg)" },
  overlay: {
    left: "230vh",
    top: "24vh",
    width: "50vh",
    height: "34vh",
    transform: "rotate(-3deg)",
  },
  public: { left: "320vh", top: "38vh", width: "85vh", height: "44vh", transform: "rotate(2deg)" },
};

export function DioramaCards(props: Props) {
  return (
    <div className="absolute inset-0">
      <article style={{ position: "absolute", ...CARD_LAYOUT.hook }}>
        <HookCard
          hookText={props.hookText}
          datestamp={props.hookStation.datestamp}
          polaroidCaption={props.hookStation.polaroidCaption ?? ""}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.what }}>
        <WhatCard label={props.whatLabel} facts={props.facts} storyParas={props.storyParas} />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.stack }}>
        <StackCard
          heading={props.stackHeading}
          rule={props.stackRule}
          intro={props.platformIntro}
          modules={props.platformModules}
          stack={props.stack}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.admin }}>
        <AdminHighlightCard
          kicker={props.adminKicker}
          title={props.adminTitle}
          lede={props.adminLede}
          features={props.adminFeatures}
          screenshotAlt={props.adminScreenshotAlt}
          datestamp={props.adminStation.datestamp}
          polaroidCaption={props.adminStation.polaroidCaption ?? ""}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.overlay }}>
        <OverlayHighlightCard
          kicker={props.overlayKicker}
          title={props.overlayTitle}
          lede={props.overlayLede}
          features={props.overlayFeatures}
          screenshotAlt={props.overlayScreenshotAlt}
          datestamp={props.overlayStation.datestamp}
          polaroidCaption={props.overlayStation.polaroidCaption ?? ""}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.public }}>
        <PublicCard
          shots={props.publicShots}
          reflectionLabel={props.reflectionLabel}
          reflectionBody={props.reflectionBody}
          footerLabel={props.footerLabel}
          footerDomain={props.footerDomain}
          footerUrl={props.footerUrl}
          footerExternal={props.footerExternal}
        />
      </article>
    </div>
  );
}
