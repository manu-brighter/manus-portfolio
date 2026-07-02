"use client";

import { useEffect } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getSimPreset } from "@/lib/content/simPresets";
import { useSimPresetStore } from "@/lib/simPresetStore";

/**
 * SimThemeSync — mirrors the active sim preset's `theme` onto
 * `<html data-sim-theme>` so the CSS token overrides in globals.css
 * re-skin the page (Nachtdruck -> night mode).
 *
 * Gated to the live desktop sim (fine pointer, motion allowed, WebGL
 * tier resolved) — the same cohort that can see and operate the
 * preset switcher. Static/video/mobile fallbacks keep the light
 * theme so their pre-rendered assets stay coherent. Unlike the
 * switcher this is NOT gated on sceneVisibility: the theme persists
 * on playground routes.
 *
 * Timing note: the attribute lands client-side after hydration. On
 * fresh loads the Loader overlay covers the swap entirely; returning
 * visitors with a persisted night preset see a brief light flash —
 * accepted v1 trade-off (avoiding it would need an inline pre-React
 * script that duplicates the gating logic).
 */
export function SimThemeSync() {
  const presetId = useSimPresetStore((s) => s.presetId);
  const { config } = useScene();
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();

  useEffect(() => {
    const live = Boolean(config) && !reducedMotion && !coarsePointer;
    const theme = live ? getSimPreset(presetId).theme : undefined;
    const root = document.documentElement;
    if (theme) {
      root.dataset.simTheme = theme;
    } else {
      delete root.dataset.simTheme;
    }
    return () => {
      delete root.dataset.simTheme;
    };
  }, [presetId, config, reducedMotion, coarsePointer]);

  return null;
}
