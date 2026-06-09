"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { PlateCornerMarks } from "@/components/ui/PlateCornerMarks";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AudiStamp } from "./stamps/AudiStamp";
import { CameraStamp } from "./stamps/CameraStamp";
import { JoggediballaStamp } from "./stamps/JoggediballaStamp";
import { PingPongStamp } from "./stamps/PingPongStamp";
import { SchneeStamp } from "./stamps/SchneeStamp";
import { TauchenStamp } from "./stamps/TauchenStamp";
import { TileFigure } from "./TileFigure";

/**
 * ObjectGrid — Block 06 of the rewritten About. Replaces the old
 * Briefing § 2.5 Currently block + Briefing § 2.2 part 5 prose.
 *
 * Six riso-stamp tiles in a 3×2 grid (desktop) / 2×3 (mobile). Each
 * tile has its own spot-color rotation; on hover the tile rotates
 * ~2°, a soft spot-color flood washes from one corner, and the
 * caption shifts +2px (live Riso-misregistration). Tiles are not
 * interactive — hover effects are decorative.
 *
 * The "Currently learning" residue (the only Currently-line without
 * a physical-object equivalent) survives as a mono sub-band under
 * the grid header.
 */

type StampKey = "camera" | "audi" | "joggediballa" | "schnee" | "tauchen" | "pingpong";

type Tile = {
  key: StampKey;
  spot: "rose" | "amber" | "mint" | "violet";
  i18nKey: StampKey;
};

const TILES: readonly Tile[] = [
  { key: "camera", spot: "rose", i18nKey: "camera" },
  { key: "audi", spot: "amber", i18nKey: "audi" },
  { key: "joggediballa", spot: "mint", i18nKey: "joggediballa" },
  { key: "schnee", spot: "violet", i18nKey: "schnee" },
  { key: "tauchen", spot: "rose", i18nKey: "tauchen" },
  { key: "pingpong", spot: "amber", i18nKey: "pingpong" },
];

const SPOT_VAR: Record<Tile["spot"], string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
};

function TileStamp({ k, spotVar }: { k: StampKey; spotVar: string }) {
  switch (k) {
    case "camera":
      return <CameraStamp spotVar={spotVar} />;
    case "audi":
      return <AudiStamp spotVar={spotVar} />;
    case "joggediballa":
      return <JoggediballaStamp spotVar={spotVar} />;
    case "schnee":
      return <SchneeStamp spotVar={spotVar} />;
    case "tauchen":
      return <TauchenStamp spotVar={spotVar} />;
    case "pingpong":
      return <PingPongStamp spotVar={spotVar} />;
  }
}

type ObjectGridProps = {
  /**
   * Layout variant.
   * - `grid` (default) — original 2-col / 3-col responsive grid for Desktop + Tablet.
   * - `mobile-strip` — horizontal scroll-snap row for Mobile-Rework Phase 6.
   *   Tiles align to viewport with one fully-visible tile per snap.
   */
  variant?: "grid" | "mobile-strip";
};

export function ObjectGrid({ variant = "grid" }: ObjectGridProps) {
  const t = useTranslations("about.objectGrid");
  const isStrip = variant === "mobile-strip";
  const stripRef = useRef<HTMLUListElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = useReducedMotion();

  // Track scrollLeft → compute active snap target index. Replaces the
  // viewport-IO mechanism that lit ALL tiles simultaneously when the
  // strip entered the central viewport band (Manuel: "die cards werden
  // aktuell noch von vorhin beim durchscrollen gekippt, jetzt mit der
  // neuen swipe funktion wäre es aber viel besser wenn diese
  // highlighted/gekippt werden wenn sie ins zentrum kommen").
  useEffect(() => {
    if (!isStrip) return;
    const strip = stripRef.current;
    if (!strip) return;
    const onScroll = () => {
      // 72vw tile + 16px gap (gap-4); approximate slide-width as a tile
      // pitch from the first child's offset width and the gap-4 token.
      const pitch = strip.clientWidth * 0.72 + 16;
      const i = Math.round(strip.scrollLeft / pitch);
      setActiveIndex(Math.max(0, Math.min(TILES.length - 1, i)));
    };
    onScroll();
    strip.addEventListener("scroll", onScroll, { passive: true });
    return () => strip.removeEventListener("scroll", onScroll);
  }, [isStrip]);

  // Arrow-key navigation for the focusable strip. The horizontally
  // scrollable region must be a keyboard tab stop anyway (axe
  // `scrollable-region-focusable` — keyboard users can't reach a
  // swipe-only scroller), so we wire Left/Right to the snap pitch and
  // turn that mandatory focus stop into real keyboard parity with the
  // touch-swipe. Mirrors the Photography + Case-Study mobile carousels.
  const goTo = (target: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    const clamped = Math.max(0, Math.min(TILES.length - 1, target));
    const pitch = strip.clientWidth * 0.72 + 16;
    strip.scrollTo({ left: clamped * pitch, behavior: reduced ? "auto" : "smooth" });
    setActiveIndex(clamped);
  };

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(activeIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(activeIndex - 1);
    }
  };

  return (
    <section
      id="about-objects"
      aria-labelledby="about-objects-heading"
      className={
        isStrip ? "relative my-12" : "plate-corners relative container-page-wide my-20 md:my-28"
      }
    >
      {!isStrip && <PlateCornerMarks />}
      <header className={isStrip ? "container-page mb-6" : "mb-10 md:mb-14"}>
        <p className="type-label text-ink-muted">{t("sectionLabel")}</p>
        <h3 id="about-objects-heading" className="type-h2 mt-2 italic text-ink">
          {t("headline")}
        </h3>
        <p className="mt-3 type-label-stamp hidden md:inline-flex">{t("currentlyBand")}</p>
        <p className="mt-3 type-label-stamp md:hidden">{t("currentlyBandShort")}</p>
      </header>

      {/* In strip-mode the rotated active tile (rotate -1.5deg) extends
          past its bounding box at the top-right corner — pt-4 + pr-2
          gives breathing room so that overflow isn't clipped by the
          horizontal overflow-x-auto context. */}
      <ul
        ref={stripRef}
        className={
          isStrip
            ? "flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pt-4 pr-8 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-spot-mint)] focus-visible:ring-offset-2"
            : "grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6"
        }
        style={isStrip ? { scrollbarWidth: "none" } : undefined}
        // Strip mode is a horizontally scrollable region — it must be a
        // keyboard tab stop (axe scrollable-region-focusable) with arrow-key
        // nav. Grid mode is a plain list, so these stay off there.
        aria-roledescription={isStrip ? "carousel" : undefined}
        aria-label={isStrip ? t("ariaCarouselLabel") : undefined}
        tabIndex={isStrip ? 0 : undefined}
        onKeyDown={isStrip ? onKey : undefined}
      >
        {TILES.map((tile, i) => {
          const cssVars = { "--tile-spot": SPOT_VAR[tile.spot] } as CSSProperties;
          const isActiveStripTile = isStrip && i === activeIndex;
          const tileClass = isStrip
            ? "group relative flex h-full flex-col gap-3 border-[1.5px] border-ink bg-paper-tint p-4 transition-transform duration-[280ms] ease-out data-[active=true]:rotate-[-1.5deg] md:p-5"
            : "group relative flex h-full flex-col gap-3 border-[1.5px] border-ink bg-paper-tint p-4 transition-transform duration-[280ms] ease-out hover:rotate-[-1.5deg] data-[active=true]:rotate-[-1.5deg] md:p-5";
          // Tile content is identical across both render paths — extracted
          // here so the per-mode wrapper switch (strip = plain <figure>
          // with scrollLeft-driven data-active, grid = TileFigure with
          // viewport-IO) stays clean without prop-spread type pain.
          const tileBody = (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[280ms] ease-out group-hover:opacity-30 group-data-[active=true]:opacity-30"
                style={{
                  background:
                    "radial-gradient(circle at 0% 0%, var(--tile-spot) 0%, transparent 65%)",
                }}
              />
              <div className="relative flex h-[6.25rem] items-center justify-center">
                <TileStamp k={tile.key} spotVar={SPOT_VAR[tile.spot]} />
              </div>
              <figcaption className="relative mt-1 transition-transform duration-[280ms] ease-out group-hover:translate-x-[2px] group-data-[active=true]:translate-x-[2px]">
                <p className="type-label-stamp inline-flex">{t(`tiles.${tile.i18nKey}.name`)}</p>
                <p className="mt-2 type-body-sm text-ink-soft">
                  {t(`tiles.${tile.i18nKey}.caption`)}
                </p>
              </figcaption>
            </>
          );
          return (
            <li
              key={tile.key}
              className={isStrip ? "list-none w-[72vw] shrink-0 snap-center" : "list-none"}
            >
              {isStrip ? (
                <figure
                  data-active={isActiveStripTile ? "true" : undefined}
                  className={tileClass}
                  style={cssVars}
                >
                  {tileBody}
                </figure>
              ) : (
                <TileFigure className={tileClass} style={cssVars}>
                  {tileBody}
                </TileFigure>
              )}
            </li>
          );
        })}
      </ul>

      {/* Swipe-cue dots — Manuel: "der user checkt aktuell nicht dass
          man hier durch die cards swipen kann". Below the strip, in the
          empty whitespace, a row of 6 dots matches the swipe affordance
          pattern already established by the Photography swiper. */}
      {isStrip && (
        <div
          aria-hidden="true"
          className="container-page mt-4 flex items-center justify-center gap-1.5"
        >
          {TILES.map((tile, i) => (
            <span
              key={`dot-${tile.key}`}
              className={`block h-1.5 rounded-full border border-ink/40 transition-[width,background-color] duration-200 ${
                i === activeIndex ? "w-6 bg-ink" : "w-1.5 bg-paper"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
