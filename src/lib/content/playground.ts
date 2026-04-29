/**
 * Playground experiment registry.
 *
 * Each entry maps a URL slug to:
 *   - the i18n namespace key (titles, captions, default-word lists)
 *   - the spot-color identity used in the home-page card backing
 *   - default sim params surfaced through the Leva panel inside the
 *     experiment route
 *
 * Slugs are stable: once shipped they survive content rewrites
 * (sitemaps, OG cards, share-links).
 */

export type ExperimentSlug = "ink-drop-studio" | "type-as-fluid";

export type SpotColor = "rose" | "amber" | "mint" | "violet";

export type InkDropStudioParams = {
  /** Velocity dissipation factor (per simulation step, 0..1). Lower
   *  = ink stops sooner; higher = lingers/streaks. */
  velocityDissipation: number;
  /** Dye dissipation (color field). Same semantics, separate field. */
  dyeDissipation: number;
  /** Vorticity confinement strength — higher = more pronounced
   *  swirls on the curl-noise injection. */
  vorticity: number;
  /** Pressure solver iterations (Jacobi). More = more incompressible
   *  flow at higher GPU cost. */
  pressureIterations: number;
  /** Splat radius factor (multiplies the tier default). */
  splatRadius: number;
  /** Default ink color for click splats; user-pickable in panel. */
  inkColor: SpotColor;
};

export type TypeAsFluidParams = {
  /** Words rotated through as the demo seed. User input overrides
   *  these once they type. */
  defaultWords: readonly string[];
  /** Seconds the ink lingers before dissipating to invisible. */
  inkLingerSeconds: number;
};

export type Experiment = {
  slug: ExperimentSlug;
  /** i18n namespace under `playground.experiments.{key}`. */
  i18nKey: "inkDropStudio" | "typeAsFluid";
  /** Card backing color on the home page. Cards for each experiment
   *  pick a different spot to differentiate them visually. */
  cardSpot: SpotColor;
  /** Aspect ratio of the home-card visual (w / h). Cards are sized to
   *  this so the static screenshot + hover mini-sim crop matches. */
  cardAspect: number;
};

export const EXPERIMENTS: readonly Experiment[] = [
  {
    slug: "ink-drop-studio",
    i18nKey: "inkDropStudio",
    cardSpot: "rose",
    cardAspect: 4 / 3,
  },
  {
    slug: "type-as-fluid",
    i18nKey: "typeAsFluid",
    cardSpot: "violet",
    cardAspect: 4 / 3,
  },
] as const;

export function getExperiment(slug: string): Experiment | null {
  return EXPERIMENTS.find((e) => e.slug === slug) ?? null;
}

// ---- defaults per experiment ----------------------------------------------

export const INK_DROP_STUDIO_DEFAULTS: InkDropStudioParams = {
  velocityDissipation: 0.97,
  dyeDissipation: 0.95,
  vorticity: 18.0,
  pressureIterations: 30,
  splatRadius: 1.0,
  inkColor: "rose",
};

export const TYPE_AS_FLUID_DEFAULTS: TypeAsFluidParams = {
  defaultWords: ["MANUEL", "JOGGE DI BALLA", "TOON FLUID", "RISO INK"],
  inkLingerSeconds: 4.5,
};
