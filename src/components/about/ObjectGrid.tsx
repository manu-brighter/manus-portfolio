"use client";

import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { PlateCornerMarks } from "@/components/ui/PlateCornerMarks";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { GROW_MS, useInkWipeStore } from "@/lib/inkWipeStore";
import { AudiStamp } from "./stamps/AudiStamp";
import { CameraStamp } from "./stamps/CameraStamp";
import { JoggediballaStamp } from "./stamps/JoggediballaStamp";
import { PingPongStamp } from "./stamps/PingPongStamp";
import { SchneeStamp } from "./stamps/SchneeStamp";
import { TauchenStamp } from "./stamps/TauchenStamp";
import { TileFigure } from "./TileFigure";
import { TileRevealOverlay } from "./TileRevealOverlay";
import { hasTileReveal, type RevealTileKey, type StampKey } from "./tileReveals";

/**
 * ObjectGrid — Block 06 of the rewritten About. Replaces the old
 * Briefing § 2.5 Currently block + Briefing § 2.2 part 5 prose.
 *
 * Six riso-stamp tiles in a 3×2 grid (desktop) / 2×3 (mobile). Each
 * tile has its own spot-color rotation; on hover (or viewport-center
 * on coarse pointers, via TileFigure) the tile rotates ~2°, a soft
 * spot-color flood washes from one corner, and the caption shifts
 * +2px (live Riso-misregistration).
 *
 * Creative-pass upgrade: tiles with a reveal manifest entry (see
 * tileReveals.ts) carry a stretched button — clicking fires the
 * site's ink-wipe (same primitive as the playground transition, no
 * route change), mounts TileRevealOverlay under full ink cover, and
 * the retract unveils the tile's real photo (orientation-aware crop).
 * The corner "+" chip is the standing affordance; it rotates with the
 * hover choreography. Tiles without assets (pingpong) stay decorative
 * figures until their masters land.
 *
 * Reduced-motion: no wipe — the overlay opens directly.
 *
 * The former `mobile-strip` horizontal swiper variant was retired in
 * the mobile wow-pass (Manuel: too many side-swipe carousels) — the
 * responsive 2-column grid reads naturally in the vertical scroll.
 *
 * The "Currently learning" residue (the only Currently-line without
 * a physical-object equivalent) survives as a mono sub-band under
 * the grid header.
 */

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

export function ObjectGrid() {
  const t = useTranslations("about.objectGrid");
  const reducedMotion = useReducedMotion();
  const startGrow = useInkWipeStore((s) => s.startGrow);

  const [openTile, setOpenTile] = useState<RevealTileKey | null>(null);
  // Open-delay timer (wipe cover window) — tracked per the project's
  // setTimeout discipline and cleared on unmount.
  const openTimerRef = useRef<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(
    () => () => {
      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
    },
    [],
  );

  const openReveal = (tile: Tile, key: RevealTileKey, e: ReactMouseEvent<HTMLButtonElement>) => {
    openerRef.current = e.currentTarget;
    if (reducedMotion) {
      setOpenTile(key);
      return;
    }
    // Keyboard activations report detail 0 (and clientX/Y 0,0) — grow
    // the wipe from the tile centre instead of the corner then.
    let x = e.clientX;
    let y = e.clientY;
    if (e.detail === 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    startGrow({ x: x / window.innerWidth, y: y / window.innerHeight, color: tile.spot });
    // Mount the overlay just before the grow completes so the photo
    // settles during the covered window — the retract then unveils it
    // (same timing pattern as PlaygroundCard's route swap).
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setOpenTile(key);
    }, GROW_MS - 60);
  };

  const closeReveal = () => {
    setOpenTile(null);
    openerRef.current?.focus();
    openerRef.current = null;
  };

  const openSpot = TILES.find((tile) => tile.key === openTile)?.spot ?? "rose";

  return (
    <section
      id="about-objects"
      aria-labelledby="about-objects-heading"
      className="plate-corners relative container-page-wide my-20 md:my-28"
    >
      <PlateCornerMarks />
      <header className="mb-10 md:mb-14">
        <p className="type-label text-ink-muted">{t("sectionLabel")}</p>
        <h3 id="about-objects-heading" className="type-h2 mt-2 italic text-ink">
          {t("headline")}
        </h3>
        <p className="mt-3 type-label-stamp hidden md:inline-flex">{t("currentlyBand")}</p>
        <p className="mt-3 type-label-stamp md:hidden">{t("currentlyBandShort")}</p>
      </header>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {TILES.map((tile) => {
          const cssVars = { "--tile-spot": SPOT_VAR[tile.spot] } as CSSProperties;
          const interactive = hasTileReveal(tile.key);
          return (
            <li key={tile.key} className="list-none">
              <TileFigure
                className="group relative flex h-full flex-col gap-3 border-[1.5px] border-ink bg-paper-tint p-4 transition-transform duration-[280ms] ease-out hover:rotate-[-1.5deg] data-[active=true]:rotate-[-1.5deg] md:p-5"
                style={cssVars}
              >
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
                {interactive ? (
                  <>
                    {/* Stretched action — the whole tile opens the
                        plate pull. Sits above the decorative layers;
                        the sr-only text names the action + subject. */}
                    <button
                      type="button"
                      onClick={(e) => openReveal(tile, tile.key as RevealTileKey, e)}
                      className="absolute inset-0 z-10 cursor-pointer [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                    >
                      <span className="sr-only">
                        {t("revealCta")} — {t(`tiles.${tile.i18nKey}.name`)}
                      </span>
                    </button>
                    {/* Corner affordance chip — rotates with the hover
                        choreography so interactive tiles read as
                        openable, not just decorated. */}
                    <span
                      aria-hidden="true"
                      className="absolute top-3 right-3 grid size-7 place-items-center border-[1.5px] border-ink bg-paper font-mono text-ink text-sm transition-transform duration-[280ms] ease-out group-hover:rotate-90 group-data-[active=true]:rotate-90"
                    >
                      +
                    </span>
                  </>
                ) : null}
              </TileFigure>
            </li>
          );
        })}
      </ul>

      {openTile ? (
        <TileRevealOverlay tile={openTile} spot={openSpot} onClose={closeReveal} />
      ) : null}
    </section>
  );
}
