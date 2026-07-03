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
  /**
   * Page-level theme coupling — applied by SimThemeSync as
   * `<html data-sim-theme>`; token overrides live in globals.css.
   * "night" flips to the dark paper set (dark dye and dark text must
   * never fight); "warm"/"wash" are light-theme paper tints so every
   * preset re-colors the page, not just the sim. Riso (undefined)
   * keeps the canonical palette.
   */
  theme?: "night" | "warm" | "wash";
  physics: SimPresetPhysics;
  visuals: Partial<FluidVisuals>;
};

// Off-palette ladder colors (normalized RGB). The four Riso spots in
// `@/lib/palette` stay canonical for DOM/UI; these exist only as dye
// ladder bands inside the sim rendering.
//
// Contrast rule for light-theme ladders: no band may approach the
// text-ink luminance — DOM text sits ON TOP of the sim, and a
// near-black pool under near-black type is a total wipeout (first
// Turbulenz/Nachtdruck cut proved it in screenshots).
const VIOLET_DEEP: RGB = [0.42, 0.3, 0.62]; // darkest light-theme band
const MINT_TINT: RGB = [0.78, 0.94, 0.88]; // washed-out mint, near paper
const ROSE_SOFT: RGB = [1.0, 0.62, 0.75]; // diluted rose
const ROSE_DEEP: RGB = [0.85, 0.25, 0.45]; // saturated print rose
const WINE: RGB = [0.45, 0.12, 0.28]; // dense over-inked band
// Sim paper MUST mirror the theme's `--color-paper` (globals.css) —
// the canvas paints the page background fullscreen, and a mismatched
// paper shows as a visible seam against DOM bg-paper surfaces.
/** Night paper — `--color-paper` of `[data-sim-theme="night"]`. */
const NIGHT_PAPER: RGB = [0.08, 0.06, 0.1];
/** Warm paper (#f6e3cc) — `[data-sim-theme="warm"]` (Turbulenz). */
const WARM_PAPER: RGB = [0.965, 0.89, 0.8];
/** Wash paper (#e9efe8) — `[data-sim-theme="wash"]` (Aquarell). */
const WASH_PAPER: RGB = [0.914, 0.937, 0.91];

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
    // High-energy, FINE-GRAINED: small hard splats + strong
    // confinement + inky Sobel contours — deliberately far from
    // Riso's broad soft blobs. The trap from the first cut was dye
    // dying before the eddies could read (dyeDis 0.94); small splats
    // stay legible as long as the dye lives (0.975) and deposits
    // punchy (dyeScale 0.22).
    id: "turbulenz",
    i18nKey: "turbulenz",
    swatch: ["amber", "violet"],
    theme: "warm",
    physics: {
      velocityDissipation: 0.99,
      dyeDissipation: 0.975,
      confinement: 26,
      splatRadiusScale: 0.55,
    },
    visuals: {
      paper: WARM_PAPER,
      // Top band stays a readable deep violet — see contrast rule.
      ladder: [SPOT_RGB.amber, SPOT_RGB.rose, SPOT_RGB.violet, VIOLET_DEEP],
      velocityScale: 15,
      dyeScale: 0.22,
      grainStrength: 0.06,
      edgeStrength: 0.7,
      ambientTimeScale: 1.6,
      ambientForceScale: 1.6,
    },
  },
  {
    // Calm watercolor: velocity dies quickly but dye lingers, broad
    // soft blooms, barely-there grain, slow gentle ambient drift.
    id: "aquarell",
    i18nKey: "aquarell",
    swatch: ["mint", "violet"],
    theme: "wash",
    physics: {
      velocityDissipation: 0.95,
      dyeDissipation: 0.985,
      confinement: 4,
      splatRadiusScale: 1.7,
    },
    visuals: {
      paper: WASH_PAPER,
      ladder: [MINT_TINT, SPOT_RGB.mint, SPOT_RGB.violet, ROSE_SOFT],
      velocityScale: 7,
      dyeScale: 0.09,
      grainStrength: 0.04,
      // Near-zero edge darkening + wide outline threshold: washes
      // blend without contour lines — true watercolor softness.
      edgeStrength: 0.1,
      outlineThreshold: 0.3,
      ambientTimeScale: 0.5,
      ambientForceScale: 0.7,
    },
  },
  {
    // Night mode: the page flips to the dark token set (theme:
    // "night" -> SimThemeSync), the sim paints near-black paper and
    // a ladder that BRIGHTENS with density — posterized neon
    // screen-print glowing out of the dark. Dark dye under dark text
    // was unreadable (screenshot-verified), hence the full theme
    // flip instead of a dark-ink-on-light-paper compromise.
    id: "nachtdruck",
    i18nKey: "nachtdruck",
    swatch: ["violet", "rose"],
    theme: "night",
    physics: {
      dyeDissipation: 0.97,
      confinement: 12,
      splatRadiusScale: 1.1,
    },
    visuals: {
      paper: NIGHT_PAPER,
      // Ascending brightness — high density GLOWS out of the dark.
      // Top band slightly deeper than spot violet so the light hero
      // text keeps reading over saturated pools.
      ladder: [WINE, VIOLET_DEEP, ROSE_DEEP, [0.65, 0.5, 0.95]],
      levels: 4,
      dyeScale: 0.16,
      grainStrength: 0.09,
      edgeStrength: 0.5,
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

/**
 * Preset-switch celebration: a radial ring of splats from screen
 * center, colored from the incoming preset's ladder, so the switch
 * itself detonates in the new palette. Queued via injectSplat — the
 * warmup gate drops queued splats while the sim hasn't started, so a
 * switch during the loader can't leak into the hero reveal. Shared by
 * the Desktop FluidSim and the MobileBackgroundSim.
 */
const BURST_COUNT = 8;
export function firePresetBurst(
  orchestrator: FluidOrchestrator,
  preset: SimPreset,
  baseRadius: number,
): void {
  const ladder = preset.visuals.ladder ?? DEFAULT_FLUID_VISUALS.ladder;
  for (let i = 0; i < BURST_COUNT; i++) {
    const angle = (i / BURST_COUNT) * Math.PI * 2;
    // Safe: `i % ladder.length` is always 0..3 (ladder has 4 entries)
    const color = ladder[i % ladder.length] as readonly [number, number, number];
    // Radius intentionally uses the tier baseline (not the preset's
    // splatRadiusScale) — the burst should feel identical regardless
    // of which preset is incoming.
    orchestrator.injectSplat(
      0.5,
      0.5,
      color,
      Math.cos(angle) * 1.2,
      Math.sin(angle) * 1.2,
      baseRadius * 2,
    );
  }
}
