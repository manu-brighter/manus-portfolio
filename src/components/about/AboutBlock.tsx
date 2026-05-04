import type { CSSProperties, ReactNode } from "react";
import { PlateCornerMarks } from "./PlateCornerMarks";

/**
 * AboutBlock — generic block container for the rewritten About
 * section. Sets the `--block-spot` CSS variable from the `spot`
 * prop so children (drop-cap, word-highlight, stamp-divider, etc.)
 * inherit the block's Riso-plate identity.
 *
 * Layout variants describe the column composition:
 *   - "marg-left-content-right" (Block 01): 4/12 marginalia + 8/12 content
 *   - "content-left-marg-right" (Block 02): 6/12 content + 3/12 marginalia
 *   - "loud-centered"           (Block 04): 10/12 centred (the loud block)
 *   - "short-centered"          (Block 05): 8/12 centred (atmender Pause)
 *
 * `marginalia` is the small left/right column content (block-counter,
 * year-stamps, etc.). Pass null for blocks that don't need it.
 *
 * Plate-corner-marks render at the block's 4 corners.
 *
 * Marginalia wrapper is `<div>` (not `<aside>`) — `<aside>` inside
 * the parent `<section>` triggers axe `landmark-complementary-is-
 * top-level` (same trap as Phase 6 About / Phase 9 Photography).
 */

export type Spot = "rose" | "mint" | "amber" | "violet";

export type AboutBlockLayout =
  | "marg-left-content-right"
  | "content-left-marg-right"
  | "loud-centered"
  | "short-centered";

const SPOT_VAR: Record<Spot, string> = {
  rose: "var(--color-spot-rose)",
  mint: "var(--color-spot-mint)",
  amber: "var(--color-spot-amber)",
  violet: "var(--color-spot-violet)",
};

type AboutBlockProps = {
  id: string;
  spot: Spot;
  layout: AboutBlockLayout;
  marginalia?: ReactNode;
  children: ReactNode;
};

export function AboutBlock({ id, spot, layout, marginalia, children }: AboutBlockProps) {
  const cssVars = {
    "--block-spot": SPOT_VAR[spot],
  } as CSSProperties;

  // Column class composition keyed by layout variant.
  const columns =
    layout === "marg-left-content-right"
      ? {
          marginalia: "col-span-12 md:col-span-4",
          content: "col-span-12 md:col-span-8",
          marginaliaOrder: "order-1",
          contentOrder: "order-2",
        }
      : layout === "content-left-marg-right"
        ? {
            marginalia: "col-span-12 md:col-span-3 md:col-start-10",
            content: "col-span-12 md:col-span-6 md:col-start-2",
            // Mobile: marginalia first; desktop reorder by col-start.
            marginaliaOrder: "order-1 md:order-2",
            contentOrder: "order-2 md:order-1",
          }
        : layout === "loud-centered"
          ? {
              marginalia: "hidden",
              content: "col-span-12 md:col-span-10 md:col-start-2",
              marginaliaOrder: "",
              contentOrder: "",
            }
          : {
              // short-centered
              marginalia: "hidden",
              content: "col-span-12 md:col-span-8 md:col-start-3",
              marginaliaOrder: "",
              contentOrder: "",
            };

  return (
    <article
      id={`about-${id}`}
      className="about-block plate-corners relative grid-12 container-page my-16 gap-y-6 md:my-24"
      style={cssVars}
    >
      <PlateCornerMarks />
      {marginalia ? (
        <div className={`${columns.marginalia} ${columns.marginaliaOrder}`}>{marginalia}</div>
      ) : null}
      <div className={`${columns.content} ${columns.contentOrder}`}>{children}</div>
    </article>
  );
}
