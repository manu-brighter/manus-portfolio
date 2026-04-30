import { useTranslations } from "next-intl";
import { InkDropCardVisual } from "@/components/playground/InkDropCardVisual";
import { InkDropMiniSim } from "@/components/playground/InkDropMiniSim";
import { PlaygroundCard } from "@/components/playground/PlaygroundCard";
import { TypeAsFluidCardVisual } from "@/components/playground/TypeAsFluidCardVisual";
import { TypeAsFluidMiniSim } from "@/components/playground/TypeAsFluidMiniSim";
import { EXPERIMENTS } from "@/lib/content/playground";

/**
 * Playground — Section 06.
 *
 * Two cards, asymmetric: ink-drop on the left rises slightly, type-
 * as-fluid on the right drops slightly. Same instinct as the Work
 * section's diagonal walk — Riso editorial layout, not a directory
 * listing. Each card is a Link to its `/playground/[slug]` route.
 *
 * The cards' static visuals are SVG placeholders for now (Sprint 4b
 * lays a hover-driven mini-sim on top of them); see
 * InkDropCardVisual / TypeAsFluidCardVisual.
 */
export function Playground() {
  const t = useTranslations("playground");

  // Lookup by slug rather than relying on registry ordering — content
  // edits in lib/content/playground.ts can't silently reorder cards.
  const inkDrop = EXPERIMENTS.find((e) => e.slug === "ink-drop-studio");
  const typeAsFluid = EXPERIMENTS.find((e) => e.slug === "type-as-fluid");

  return (
    <section
      id="playground"
      aria-labelledby="playground-heading"
      className="container-page relative py-24 md:py-32"
    >
      <header className="grid-12 mb-16 gap-y-4 md:mb-20">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <p className="type-label inline-flex items-center gap-2 text-ink">
            <span aria-hidden="true" className="inline-block size-2 bg-spot-violet" />
            {t("eyebrow")}
          </p>
          <h2
            id="playground-heading"
            className="type-h1 mt-4 text-ink"
            style={{ fontStyle: "italic" }}
          >
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-6 max-w-[55ch] text-ink-soft">{t("lede")}</p>
        </div>
      </header>

      <div className="grid-12 gap-y-20 md:gap-y-0">
        {inkDrop ? (
          <div className="col-span-12 md:col-span-6 md:pr-6">
            <PlaygroundCard
              slug={inkDrop.slug}
              i18nKey={inkDrop.i18nKey}
              cardSpot={inkDrop.cardSpot}
              visual={<InkDropCardVisual className="absolute inset-0 h-full w-full" />}
              LiveSim={InkDropMiniSim}
            />
          </div>
        ) : null}
        {typeAsFluid ? (
          <div className="col-span-12 md:col-span-6 md:col-start-7 md:mt-32 md:pl-6">
            <PlaygroundCard
              slug={typeAsFluid.slug}
              i18nKey={typeAsFluid.i18nKey}
              cardSpot={typeAsFluid.cardSpot}
              visual={<TypeAsFluidCardVisual className="absolute inset-0 h-full w-full" />}
              LiveSim={TypeAsFluidMiniSim}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
