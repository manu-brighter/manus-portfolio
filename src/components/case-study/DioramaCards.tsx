import type { CSSProperties } from "react";
import { HighlightCard } from "@/components/case-study/cards/HighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";
import type { DateCaption, Fact, Feature, StackRow } from "@/components/case-study/types";

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  alt: string;
  datestamp: string;
  caption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate: number;
};

/**
 * Grouped per-station config. The Diorama has 4 narrative stations
 * (hook / what+stack / 2 highlights / public); collapsing the
 * previous 28-prop flat surface into one object per station keeps
 * `CaseStudy.tsx`'s call site scannable. Each station's content
 * (text + media + click) is co-located instead of scattered across
 * 4 prop groups by index.
 */

type HookConfig = {
  hookText: string;
  station: DateCaption;
  onClick?: () => void;
};

type ContextConfig = {
  whatLabel: string;
  facts: Fact[];
  storyParas: string[];
  stackHeading: string;
  stack: StackRow[];
};

type HighlightConfig = {
  kicker: string;
  title: string;
  lede: string;
  features: Feature[];
  screenshotAlt: string;
  station: DateCaption;
  onClick?: () => void;
};

type PublicConfig = {
  shots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
  onShotClick?: (shotIndex: number) => void;
};

type Props = {
  hook: HookConfig;
  context: ContextConfig;
  admin: HighlightConfig;
  overlay: HighlightConfig;
  public: PublicConfig;
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

export function DioramaCards({ hook, context, admin, overlay, public: pub }: Props) {
  return (
    <div className="absolute inset-0">
      <article style={{ position: "absolute", ...CARD_LAYOUT.hook }}>
        <HookCard
          hookText={hook.hookText}
          datestamp={hook.station.datestamp}
          polaroidCaption={hook.station.polaroidCaption ?? ""}
          lightboxIndex={0}
          onPolaroidClick={hook.onClick}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.what }}>
        <WhatCard label={context.whatLabel} facts={context.facts} storyParas={context.storyParas} />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.stack }}>
        <StackCard heading={context.stackHeading} stack={context.stack} />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.admin }}>
        <HighlightCard
          slug="admin"
          spot="rose"
          kicker={admin.kicker}
          title={admin.title}
          lede={admin.lede}
          features={admin.features}
          screenshotAlt={admin.screenshotAlt}
          datestamp={admin.station.datestamp}
          polaroidCaption={admin.station.polaroidCaption ?? ""}
          lightboxIndex={1}
          onPolaroidClick={admin.onClick}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.overlay }}>
        <HighlightCard
          slug="twitchoverlay"
          spot="amber"
          kicker={overlay.kicker}
          title={overlay.title}
          lede={overlay.lede}
          features={overlay.features}
          screenshotAlt={overlay.screenshotAlt}
          datestamp={overlay.station.datestamp}
          polaroidCaption={overlay.station.polaroidCaption ?? ""}
          lightboxIndex={2}
          onPolaroidClick={overlay.onClick}
        />
      </article>
      <article style={{ position: "absolute", ...CARD_LAYOUT.public }}>
        <PublicCard
          shots={pub.shots}
          reflectionLabel={pub.reflectionLabel}
          reflectionBody={pub.reflectionBody}
          footerLabel={pub.footerLabel}
          footerDomain={pub.footerDomain}
          footerUrl={pub.footerUrl}
          footerExternal={pub.footerExternal}
          lightboxBaseIndex={3}
          onShotClick={pub.onShotClick}
        />
      </article>
    </div>
  );
}
