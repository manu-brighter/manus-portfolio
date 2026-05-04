import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { PlateCornerMarks } from "./PlateCornerMarks";
import { AudiStamp } from "./stamps/AudiStamp";
import { CameraStamp } from "./stamps/CameraStamp";
import { JoggediballaStamp } from "./stamps/JoggediballaStamp";
import { PingPongStamp } from "./stamps/PingPongStamp";
import { SchneeStamp } from "./stamps/SchneeStamp";
import { TauchenStamp } from "./stamps/TauchenStamp";

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

export function ObjectGrid() {
  const t = useTranslations("about.objectGrid");

  return (
    <section
      id="about-objects"
      aria-labelledby="about-objects-heading"
      className="plate-corners relative container-page my-20 md:my-28"
    >
      <PlateCornerMarks />
      <header className="mb-10 md:mb-14">
        <p className="type-label text-ink-muted">{t("sectionLabel")}</p>
        <h3 id="about-objects-heading" className="type-h2 mt-2 italic text-ink">
          {t("headline")}
        </h3>
        <p className="mt-3 type-label-stamp">{t("currentlyBand")}</p>
      </header>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {TILES.map((tile) => {
          const cssVars = { "--tile-spot": SPOT_VAR[tile.spot] } as CSSProperties;
          return (
            <li key={tile.key} className="list-none">
              <figure
                className="group relative flex h-full flex-col gap-3 border-[1.5px] border-ink bg-paper-tint p-4 transition-transform duration-[280ms] ease-out hover:rotate-[-1.5deg] md:p-5"
                style={cssVars}
              >
                {/* Hover-flood: spot-color sweeps from top-left corner. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[280ms] ease-out group-hover:opacity-30"
                  style={{
                    background:
                      "radial-gradient(circle at 0% 0%, var(--tile-spot) 0%, transparent 65%)",
                  }}
                />
                <div className="relative flex justify-center pt-2">
                  <TileStamp k={tile.key} spotVar={SPOT_VAR[tile.spot]} />
                </div>
                <figcaption className="relative mt-1 transition-transform duration-[280ms] ease-out group-hover:translate-x-[2px]">
                  <p className="type-label-stamp inline-flex">{t(`tiles.${tile.i18nKey}.name`)}</p>
                  <p className="mt-2 type-body-sm text-ink-soft">
                    {t(`tiles.${tile.i18nKey}.caption`)}
                  </p>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
