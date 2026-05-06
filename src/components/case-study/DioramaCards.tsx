import type { CSSProperties } from "react";
import { AdminHighlightCard } from "@/components/case-study/cards/AdminHighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { OverlayHighlightCard } from "@/components/case-study/cards/OverlayHighlightCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string };
type Feature = { title: string; body: string };
type DateCaption = { datestamp: string; polaroidCaption?: string };

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
  hookStation: DateCaption;
  storyParas: string[];
  whatLabel: string;
  facts: Fact[];
  stackHeading: string;
  stack: StackRow[];
  adminKicker: string;
  adminTitle: string;
  adminLede: string;
  adminFeatures: Feature[];
  adminScreenshotAlt: string;
  adminStation: DateCaption;
  overlayKicker: string;
  overlayTitle: string;
  overlayLede: string;
  overlayFeatures: Feature[];
  overlayScreenshotAlt: string;
  overlayStation: DateCaption;
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
 * `CARD_LAYOUT` is the source of truth for per-card position and size.
 */

type CardKey = "hook" | "what" | "stack" | "admin" | "overlay" | "public";

const CARD_LAYOUT: Record<CardKey, CSSProperties> = {
  hook: { left: "22vh", top: "30vh", width: "60vh", height: "54vh", transform: "rotate(-3deg)" },
  what: { left: "88vh", top: "18vh", width: "44vh", height: "38vh", transform: "rotate(2deg)" },
  stack: { left: "88vh", top: "66vh", width: "44vh", height: "28vh", transform: "rotate(-2deg)" },
  admin: { left: "140vh", top: "18vh", width: "72vh", height: "68vh", transform: "rotate(3deg)" },
  overlay: {
    left: "218vh",
    top: "14vh",
    width: "72vh",
    height: "64vh",
    transform: "rotate(-3deg)",
  },
  public: { left: "296vh", top: "22vh", width: "110vh", height: "62vh", transform: "rotate(2deg)" },
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
        <StackCard heading={props.stackHeading} stack={props.stack} />
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
