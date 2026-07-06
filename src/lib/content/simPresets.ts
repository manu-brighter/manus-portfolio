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

export type SimPresetId = "riso" | "wave" | "turbulenz" | "aquarell" | "nachtdruck";

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
   * Custom dot colors for the switcher when the preset's character
   * sits outside the four canonical spots (Wave is blue — no blue
   * spot exists). Fills only, decorative. Overrides `swatch`.
   */
  swatchHex?: readonly [string, string];
  /**
   * Page-level theme coupling — applied by SimThemeSync as
   * `<html data-sim-theme>`; token overrides live in globals.css.
   * "night" flips to the dark paper set (dark dye and dark text must
   * never fight); "warm"/"wash" are light-theme paper tints; "wave"
   * re-inks the whole page cool blue (paper AND ink family) so every
   * preset re-colors the page, not just the sim. Riso (undefined)
   * keeps the canonical palette.
   */
  theme?: "night" | "warm" | "wash" | "wave";
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
/** Wave paper (#e6edf4) — `[data-sim-theme="wave"]`. */
const WAVE_PAPER: RGB = [0.902, 0.929, 0.957];
// Wave plate inks (multiply-overprint transmittances, low -> high).
const WAVE_SKY: RGB = [0.55, 0.83, 0.94]; // pale sky-cyan
const WAVE_ULTRA: RGB = [0.3, 0.45, 0.9]; // ultramarine

export const SIM_PRESETS: readonly SimPreset[] = [
  {
    // The original shipped look (render-riso.frag.glsl): soft
    // overlapping ladder + Sobel ink pooling. Deliberately the
    // quietest of the five — it's the default under the hero text.
    // The louder overprint rework moved to Wave.
    id: "riso",
    i18nKey: "riso",
    swatch: ["mint", "rose"],
    physics: {},
    visuals: {},
  },
  {
    // Overprint-plate print (render-wave.frag.glsl): four
    // misregistered drum passes with ink bleed + needle speckle, in a
    // cool blue plate ladder. Full page theme — cool blue-white paper
    // AND blue-black ink family (globals.css "wave" block).
    id: "wave",
    i18nKey: "wave",
    swatch: ["mint", "violet"],
    swatchHex: ["#7cc4e8", "#3b5bd9"],
    theme: "wave",
    physics: {},
    visuals: {
      style: "wave",
      paper: WAVE_PAPER,
      ladder: [WAVE_SKY, SPOT_RGB.mint, WAVE_ULTRA, SPOT_RGB.violet],
      ambientPointCount: 6,
      ambientChurn: 0.7,
    },
  },
  {
    // Screenprint comic (render-turbulenz.frag.glsl): hard bands,
    // halftone ramps, true ink contour lines. Feel-side it throws a
    // SWARM — 7 tiny scattered droplets per pointer frame instead of
    // one stroke (splatCount/splatScatter), radius well below every
    // other preset. dye/velocityScale are per-droplet, hence far
    // lower than the old single-splat 0.22/15.
    id: "turbulenz",
    i18nKey: "turbulenz",
    swatch: ["amber", "violet"],
    theme: "warm",
    physics: {
      velocityDissipation: 0.99,
      dyeDissipation: 0.975,
      confinement: 26,
      splatRadiusScale: 0.3,
    },
    visuals: {
      style: "turbulenz",
      paper: WARM_PAPER,
      // Top band stays a readable deep violet — see contrast rule.
      ladder: [SPOT_RGB.amber, SPOT_RGB.rose, SPOT_RGB.violet, VIOLET_DEEP],
      velocityScale: 8,
      dyeScale: 0.08,
      splatCount: 7,
      splatScatter: 0.035,
      grainStrength: 0.07,
      // Ink contour-line strength (per-style meaning of edgeStrength).
      edgeStrength: 0.7,
      // The swarm persists while idle: 8 ambient points with full
      // spawn/despawn churn (~5-8 alive at any moment). Force scale
      // dropped from the 3-point era's 1.6 — 8 sources at 1.6 over-
      // energize the field.
      ambientPointCount: 8,
      ambientChurn: 1,
      ambientTimeScale: 1.6,
      ambientForceScale: 1.3,
    },
  },
  {
    // Wet watercolor (render-aquarell.frag.glsl): the dye field is
    // read through a wide blur with granulation and wet-edge rims —
    // by far the softest of the four styles. Single HUGE blooms
    // (radius 2.6x tier baseline), velocity dies fast, dye lingers.
    id: "aquarell",
    i18nKey: "aquarell",
    swatch: ["mint", "violet"],
    theme: "wash",
    physics: {
      velocityDissipation: 0.95,
      // 0.985 saturated the whole viewport into one flat pool under
      // sustained pointer input (screenshot-verified) — washes must
      // dry out while the huge blooms spread.
      dyeDissipation: 0.978,
      confinement: 4,
      splatRadiusScale: 4.5,
    },
    visuals: {
      style: "aquarell",
      paper: WASH_PAPER,
      ladder: [MINT_TINT, SPOT_RGB.mint, SPOT_RGB.violet, ROSE_SOFT],
      velocityScale: 7,
      dyeScale: 0.045,
      grainStrength: 0.04,
      // Wet-edge rim darkening (per-style meaning of edgeStrength).
      edgeStrength: 0.3,
      ambientTimeScale: 0.5,
      ambientForceScale: 0.7,
    },
  },
  {
    // Neon print (render-nachtdruck.frag.glsl): the page flips to the
    // dark token set (theme: "night" -> SimThemeSync), the sim paints
    // near-black paper with hard ascending-brightness bands, additive
    // glow halos and chromatic misreg fringes. Dark dye under dark
    // text was unreadable (screenshot-verified), hence the full theme
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
      style: "nachtdruck",
      paper: NIGHT_PAPER,
      // Ascending brightness — high density GLOWS out of the dark.
      // Top band slightly deeper than spot violet so the light hero
      // text keeps reading over saturated pools.
      ladder: [WINE, VIOLET_DEEP, ROSE_DEEP, [0.65, 0.5, 0.95]],
      dyeScale: 0.16,
      grainStrength: 0.09,
      // Glow-halo gain (per-style meaning of edgeStrength).
      edgeStrength: 0.85,
      // Neon terraces breathe: 6 points, most cycling in and out.
      ambientPointCount: 6,
      ambientChurn: 0.8,
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
