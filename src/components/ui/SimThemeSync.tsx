"use client";

import { useEffect } from "react";
import { getSimPreset } from "@/lib/content/simPresets";
import { useSimPresetStore } from "@/lib/simPresetStore";

/**
 * SimThemeSync — mirrors the active sim preset's `theme` onto
 * `<html data-sim-theme>` so the CSS token overrides in globals.css
 * re-skin the page (Nachtdruck -> night mode).
 *
 * Colour remains a visitor preference even when motion is reduced or
 * graphics are unavailable. The studio and CSS theme share this contract.
 * The attribute lands after hydration, including on experiment routes.
 */
export function SimThemeSync() {
  const presetId = useSimPresetStore((s) => s.presetId);

  useEffect(() => {
    const theme = getSimPreset(presetId).theme;
    const root = document.documentElement;
    if (theme) {
      root.dataset.simTheme = theme;
    } else {
      delete root.dataset.simTheme;
    }
    return () => {
      delete root.dataset.simTheme;
    };
  }, [presetId]);

  return null;
}
