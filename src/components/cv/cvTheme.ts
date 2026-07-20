"use client";

import { useEffect, useState } from "react";
import type { SimPresetId } from "@/lib/content/simPresets";

/**
 * Shared theme plumbing for the CV sheet's client islands.
 *
 * Everything here keys off `<html data-sim-theme>` (written by
 * SimThemeSync) rather than the preset store. On reduced-motion or the
 * static tier the store can hold a preset that never gets applied to
 * the page, and the sheet must describe what it actually looks like —
 * it gets printed.
 */

/** `data-sim-theme` value -> the preset that sets it. Riso is the
 *  absence of the attribute, so it is not in the map. */
export const THEME_TO_PRESET: Record<string, SimPresetId> = {
  wave: "wave",
  warm: "turbulenz",
  wash: "aquarell",
  night: "nachtdruck",
};

/** The active preset id, live across theme switches. */
export function useSimThemePreset(): SimPresetId {
  const [presetId, setPresetId] = useState<SimPresetId>("riso");

  useEffect(() => {
    const read = () => {
      const theme = document.documentElement.dataset.simTheme ?? "";
      setPresetId(THEME_TO_PRESET[theme] ?? "riso");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-sim-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return presetId;
}
