"use client";

import { useEffect, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSimPresetStore } from "@/lib/simPresetStore";

/**
 * True when the page is actually in Nachtdruck night mode — i.e. a
 * live sim is running (WebGL tier resolved, motion allowed) AND the
 * night preset is selected. Mirrors SimThemeSync's gating so the
 * StaticFallback and reduced-motion paths stay on the canonical light
 * treatment even when a night preset persists in the store.
 *
 * Lives in components/scene/ (not hooks/) on purpose: it consumes the
 * shared `useScene` context so every caller reads the SAME resolved
 * capability instead of re-probing the GPU — and hooks/ may not import
 * from components/ (check-layering.mjs). Components composing this is
 * exactly the intended direction.
 *
 * `mounted` starts false so the first client render matches the
 * server's light-theme markup; the swap lands in the effect pass
 * (no hydration mismatch). Consumers that swap an <img src> re-fetch
 * lazily on the flip — fine for the infrequent, deliberate act of
 * switching presets.
 */
export function useNightTheme(): boolean {
  const presetId = useSimPresetStore((s) => s.presetId);
  const { config } = useScene();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return mounted && Boolean(config) && !reducedMotion && presetId === "nachtdruck";
}
