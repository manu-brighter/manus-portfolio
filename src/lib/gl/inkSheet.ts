// src/lib/gl/inkSheet.ts

import type { FluidRenderStyle, FluidVisuals } from "@/lib/gl/fluidOrchestrator";

/**
 * Shared clock + style indexing for the analytic ink sheet
 * (`src/shaders/common/ink-sheet.glsl`). The Light renderer draws the
 * sheet directly; the Full renderer relaxes its advected dye alpha toward
 * it. Both must read the same style index and run the same clock, or the
 * two modes drift apart into different compositions per theme.
 */

/**
 * Scroll parallax in viewport heights per viewport scrolled. Must equal
 * `INK_PARALLAX` in `src/shaders/common/ink-sheet.glsl` (the GLSL side
 * cannot import it): the shaders drift the sheet by it, the Full sheet
 * pass carries the advected ink by it to stay registered.
 */
export const INK_PARALLAX = 0.075;

/** GLSL `uStyle` order -- must match the branches in ink-sheet.glsl. */
export const INK_SHEET_STYLES: readonly FluidRenderStyle[] = [
  "riso",
  "wave",
  "turbulenz",
  "aquarell",
  "nachtdruck",
];

export function inkSheetStyleIndex(style: FluidRenderStyle): number {
  return Math.max(0, INK_SHEET_STYLES.indexOf(style));
}

/**
 * Sheet clock speed (sheet seconds per real second). Analytic washes
 * need a livelier clock than the fluid solver's ambient rig: Wave rolls
 * at 2x, Aquarell drifts at 4x; the preset's ambientTimeScale scales all.
 */
export function inkSheetSpeed(visuals: Pick<FluidVisuals, "style" | "ambientTimeScale">): number {
  const tempo = visuals.style === "wave" ? 2 : visuals.style === "aquarell" ? 4 : 1;
  return visuals.ambientTimeScale * tempo;
}
