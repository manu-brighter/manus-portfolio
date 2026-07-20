"use client";

import { useEffect } from "react";
import { useSimThemePreset } from "@/components/cv/cvTheme";
import { getSimPreset } from "@/lib/content/simPresets";

/**
 * CvDyeSync — publishes the ACTIVE preset's dye ladder to the sheet as
 * `--cv-dye-1..4`.
 *
 * Why this exists: the still frame first painted the four canonical
 * Riso spots, which barely move between presets. So the CV looked
 * essentially identical in every theme even though the sim behind it
 * runs blue-green under Wave and violet/pink/wine under Nachtdruck
 * (user feedback: "die Sim selbst ... ist nirgends vertreten auf dem
 * CV"). The dye ladder in `simPresets.ts` IS that colour, so the sheet
 * reads it straight from the source of truth instead of restating it —
 * no hex table to drift out of sync when a preset gets retuned.
 *
 * Riso's `visuals.ladder` is undefined (it ships the orchestrator
 * default, which is exactly the four spots), so on Riso the variables
 * are cleared and the CSS falls back to the spot tokens.
 *
 * Written on `<html>` so both the sheet and anything else that wants
 * the dye can inherit; the values survive into print because they are
 * plain custom properties.
 */

const VAR_NAMES = ["--cv-dye-1", "--cv-dye-2", "--cv-dye-3", "--cv-dye-4"] as const;

function toCss(rgb: readonly [number, number, number]): string {
  const [r, g, b] = rgb;
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

export function CvDyeSync() {
  const presetId = useSimThemePreset();

  useEffect(() => {
    const root = document.documentElement;
    const ladder = getSimPreset(presetId).visuals.ladder;

    if (!ladder) {
      for (const name of VAR_NAMES) root.style.removeProperty(name);
      return;
    }
    VAR_NAMES.forEach((name, i) => {
      const band = ladder[i % ladder.length];
      if (band) root.style.setProperty(name, toCss(band));
    });

    return () => {
      for (const name of VAR_NAMES) root.style.removeProperty(name);
    };
  }, [presetId]);

  return null;
}
