"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SIM_PRESETS } from "@/lib/content/simPresets";
import { isLoaderComplete, subscribeToLoaderComplete } from "@/lib/loaderSession";
import { SPOT_HEX } from "@/lib/palette";
import { useSceneVisibilityStore } from "@/lib/sceneVisibilityStore";
import { useSimPresetStore } from "@/lib/simPresetStore";

/**
 * Ink Character Switcher — user-facing sim preset selection.
 *
 * A paper pill fixed to the bottom-left edge (mirrors ScrollProgress's
 * right-edge placement) holding one two-tone dot per preset. Selecting
 * a dot writes the persisted `simPresetStore`; FluidSim owns the
 * orchestrator side (apply + celebration burst) so no scene refs leak
 * out here.
 *
 * Rendered only where the live desktop sim actually runs: fine
 * pointer, motion allowed, WebGL tier resolved (`config` non-null),
 * scene not hidden by a playground route. Everywhere else there is
 * nothing to switch — StaticFallback / AmbientVideo / mobile sims
 * intentionally stay on the default look.
 *
 * A11y: radiogroup pattern with roving tabindex + arrow keys.
 * Accessible names come from sr-only children (never `aria-label` on
 * a generic span — documented axe trap). Spot colors appear as fills
 * only; the hover flag uses ink-on-paper.
 */

// Appear after the canvas is up and the hero reveal has settled —
// SceneProvider defers the canvas 1700ms (fresh) / 200ms (returning)
// past loader-complete, the sim opens its warmup gate ~2400ms in.
// The switcher slots in just after so it never announces a sim that
// isn't running yet.
const FRESH_APPEAR_MS = 2800;
const RETURNING_APPEAR_MS = 600;

export function SimPresetSwitcher() {
  const t = useTranslations("simPresets");
  const { config } = useScene();
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const sceneHidden = useSceneVisibilityStore((s) => s.hidden);
  const presetId = useSimPresetStore((s) => s.presetId);
  const setPreset = useSimPresetStore((s) => s.setPreset);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    const wasComplete = isLoaderComplete();
    const unsub = subscribeToLoaderComplete(() => {
      const delay = wasComplete ? RETURNING_APPEAR_MS : FRESH_APPEAR_MS;
      timer = window.setTimeout(() => setVisible(true), delay);
    });
    return () => {
      unsub();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  if (!config || reducedMotion || coarsePointer || sceneHidden) return null;

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={`fixed bottom-5 left-5 z-40 hidden flex-col items-center gap-3 rounded-full border-2 border-paper-line bg-paper/90 px-2 py-3 backdrop-blur-sm transition-opacity duration-700 md:flex ${
        // `invisible` keeps the not-yet-appeared pill out of the tab
        // order too (visibility transitions cleanly alongside opacity).
        visible ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
      }`}
    >
      {SIM_PRESETS.map((preset) => {
        const active = preset.id === presetId;
        return (
          // Native radios: arrow-key move+select, roving tabindex, and
          // the radio semantics all come from the platform. The input
          // is visually hidden (`sr-only` + `peer`); the label draws
          // the dot and carries the accessible name via its sr-only
          // text.
          <label
            key={preset.id}
            className="group relative flex size-7 cursor-pointer items-center justify-center"
          >
            <input
              type="radio"
              name="sim-preset"
              value={preset.id}
              checked={active}
              onChange={() => setPreset(preset.id)}
              className="peer sr-only"
            />
            <span className="sr-only">{t(preset.i18nKey)}</span>
            {/* Ink ring on the active dot; mint ring on keyboard focus
                (the global :focus-visible rule can't reach the sr-only
                input, so the ring is re-drawn here via peer-*). */}
            <span
              aria-hidden="true"
              className={`absolute inset-0 rounded-full border-2 transition-[border-color,transform] duration-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring) ${
                active ? "scale-100 border-ink" : "scale-75 border-transparent"
              }`}
            />
            {/* Two-tone preset swatch — spot colors as fills only */}
            <span
              aria-hidden="true"
              className={`size-3.5 rounded-full transition-transform duration-300 ${
                active ? "scale-110" : "scale-100 opacity-70"
              }`}
              style={{
                background: `linear-gradient(135deg, ${SPOT_HEX[preset.swatch[0]]} 50%, ${
                  SPOT_HEX[preset.swatch[1]]
                } 50%)`,
              }}
            />
            {/* Hover/focus name flag — ink on paper, decorative only
                (the sr-only text above carries the accessible name) */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-sm bg-ink px-2 py-1 font-mono text-paper text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 peer-focus-visible:opacity-100"
            >
              {t(preset.i18nKey)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
