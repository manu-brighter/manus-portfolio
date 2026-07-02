// src/lib/content/simPresets.ts

import {
  DEFAULT_FLUID_VISUALS,
  type FluidOrchestrator,
  type FluidVisuals,
  type RGB,
} from "@/lib/gl/fluidOrchestrator";
import type { TierConfig } from "@/lib/gpu";
import { SPOT_RGB, type SpotColor } from "@/lib/palette";

/**
 * User-switchable visual presets for the hero fluid sim.
 *
 * A preset is pure data: a tier-safe physics subset applied via
 * `setParams()` plus a look override applied via `setVisuals()`. The
 * cost-bearing tier params (gridSize, halfRate, pressureIterations)
 * are deliberately NOT part of the preset surface, so switching
 * presets can never regress frame budget on weak GPUs.
 *
 * Tuned-object convention follows INK_DROP_STUDIO_DEFAULTS in
 * `@/lib/content/playground.ts`.
 */

export type SimPresetId = "riso" | "turbulenz" | "aquarell" | "nachtdruck";

export type SimPresetPhysics = {
  velocityDissipation?: number;
  dyeDissipation?: number;
  confinement?: number;
  /**
   * Multiplier on the tier baseline's splatRadius — NOT an absolute
   * value. Tier configs already scale the radius inversely with grid
   * resolution (0.012 at 512^2 up to 0.022 at 96^2); an absolute preset
   * radius would look right on one tier and wrong on the others.
   */
  splatRadiusScale?: number;
};

export type SimPreset = {
  id: SimPresetId;
  /** Key under the `simPresets` namespace in messages/{locale}/common.json. */
  i18nKey: string;
  /** Two spot colors for the switcher's two-tone dot (fills only). */
  swatch: readonly [SpotColor, SpotColor];
  physics: SimPresetPhysics;
  visuals: Partial<FluidVisuals>;
};

// Off-palette ladder colors (normalized RGB). The four Riso spots in
// `@/lib/palette` stay canonical for DOM/UI; these exist only as dye
// ladder bands inside the sim rendering.
const INK_DEEP: RGB = [0.16, 0.1, 0.2]; // deep violet-ink top band
const MINT_TINT: RGB = [0.78, 0.94, 0.88]; // washed-out mint, near paper
const ROSE_SOFT: RGB = [1.0, 0.62, 0.75]; // diluted rose
const ROSE_DEEP: RGB = [0.85, 0.25, 0.45]; // saturated print rose
const WINE: RGB = [0.45, 0.12, 0.28]; // dense over-inked band
const NEAR_INK: RGB = [0.12, 0.05, 0.1]; // almost solid ink

export const SIM_PRESETS: readonly SimPreset[] = [
  {
    // Today's shipped look, verbatim — DEFAULT_FLUID_VISUALS + tier
    // baseline physics. Empty overrides keep it byte-identical.
    id: "riso",
    i18nKey: "riso",
    swatch: ["mint", "rose"],
    physics: {},
    visuals: {},
  },
  {
    // High-energy: long-lived velocity + strong vorticity confinement
    // produce fine fingering eddies; smaller, harder splats; ambient
    // rig wanders fast and pushes hard.
    id: "turbulenz",
    i18nKey: "turbulenz",
    swatch: ["amber", "violet"],
    physics: {
      velocityDissipation: 0.99,
      dyeDissipation: 0.94,
      confinement: 30,
      splatRadiusScale: 0.65,
    },
    visuals: {
      ladder: [SPOT_RGB.amber, SPOT_RGB.rose, SPOT_RGB.violet, INK_DEEP],
      velocityScale: 14,
      dyeScale: 0.18,
      grainStrength: 0.06,
      ambientTimeScale: 1.8,
      ambientForceScale: 1.5,
    },
  },
  {
    // Calm watercolor: velocity dies quickly but dye lingers, broad
    // soft blooms, barely-there grain, slow gentle ambient drift.
    id: "aquarell",
    i18nKey: "aquarell",
    swatch: ["mint", "violet"],
    physics: {
      velocityDissipation: 0.95,
      dyeDissipation: 0.985,
      confinement: 4,
      splatRadiusScale: 1.7,
    },
    visuals: {
      ladder: [MINT_TINT, SPOT_RGB.mint, SPOT_RGB.violet, ROSE_SOFT],
      velocityScale: 7,
      dyeScale: 0.09,
      grainStrength: 0.04,
      ambientTimeScale: 0.5,
      ambientForceScale: 0.7,
    },
  },
  {
    // Dense posterized print: hard band separations (levels > 0),
    // deep wine-dark ladder, heavy ink deposit. Paper stays light on
    // purpose — the canvas paints paper fullscreen behind all DOM
    // content, so a dark paper would break AA contrast site-wide.
    id: "nachtdruck",
    i18nKey: "nachtdruck",
    swatch: ["violet", "rose"],
    physics: {
      dyeDissipation: 0.97,
      confinement: 12,
      splatRadiusScale: 1.1,
    },
    visuals: {
      ladder: [SPOT_RGB.violet, ROSE_DEEP, WINE, NEAR_INK],
      levels: 4,
      dyeScale: 0.24,
      grainStrength: 0.09,
    },
  },
];

export const DEFAULT_PRESET_ID: SimPresetId = "riso";

export function isSimPresetId(value: unknown): value is SimPresetId {
  return typeof value === "string" && SIM_PRESETS.some((preset) => preset.id === value);
}

export function getSimPreset(id: SimPresetId): SimPreset {
  // isSimPresetId guarantees membership; fall back to index 0 (riso)
  // defensively for exhaustiveness.
  return SIM_PRESETS.find((preset) => preset.id === id) ?? (SIM_PRESETS[0] as SimPreset);
}

/**
 * Apply a preset to a live orchestrator. Physics fields reset to the
 * tier baseline before the preset's overrides land, and visuals reset
 * to DEFAULT_FLUID_VISUALS — both setters merge rather than replace,
 * so without the reset a switch A -> B -> A would keep B's leftovers.
 */
export function applySimPreset(
  orchestrator: FluidOrchestrator,
  preset: SimPreset,
  tierBaseline: TierConfig,
): void {
  const { splatRadiusScale = 1, ...absolute } = preset.physics;
  // Dissipation is applied per SIM frame (advect shader multiplies
  // directly, not dt-normalized), so half-rate tiers decay half as
  // often -- a 0.99 velocityDissipation carries ~2x the steady-state
  // energy at 30Hz vs 60Hz. Clamp on half-rate tiers so a preset's
  // character stays comparable across tiers.
  const HALF_RATE_VEL_DISSIPATION_MAX = 0.985;
  if (
    tierBaseline.halfRate &&
    absolute.velocityDissipation !== undefined &&
    absolute.velocityDissipation > HALF_RATE_VEL_DISSIPATION_MAX
  ) {
    absolute.velocityDissipation = HALF_RATE_VEL_DISSIPATION_MAX;
  }
  orchestrator.setParams({
    velocityDissipation: tierBaseline.velocityDissipation,
    dyeDissipation: tierBaseline.dyeDissipation,
    confinement: tierBaseline.confinement,
    ...absolute,
    splatRadius: tierBaseline.splatRadius * splatRadiusScale,
  });
  orchestrator.setVisuals({ ...DEFAULT_FLUID_VISUALS, ...preset.visuals });
}
