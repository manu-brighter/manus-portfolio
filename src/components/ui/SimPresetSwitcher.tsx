"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SIM_PRESETS } from "@/lib/content/simPresets";
import { isLoaderComplete, subscribeToLoaderComplete } from "@/lib/loaderSession";
import { SPOT_HEX } from "@/lib/palette";
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
 * Rendered wherever a live sim runs: motion allowed, WebGL tier
 * resolved (`config` non-null) — Desktop FluidSim AND the coarse-
 * pointer MobileBackgroundSim (which applies presets since the
 * mobile wow-pass). Playground experiment routes keep the switcher
 * too — their orchestrators inherit the preset look via
 * syncPresetVisuals(), so the pill stays meaningful there
 * (`data-no-splat` keeps pill clicks from splatting the experiment
 * canvas underneath). Only StaticFallback stays on the default look.
 *
 * Layout is pointer-adaptive purely via breakpoint classes: below md
 * a horizontal row hugging the bottom-left with >=44px touch targets
 * (the name flag is hover/focus-only, so it stays Desktop-only);
 * from md up the original vertical dot pill.
 *
 * A11y: radiogroup pattern with roving tabindex + arrow keys.
 * Accessible names come from sr-only children (never `aria-label` on
 * a generic span — documented axe trap). Spot colors appear as fills
 * only; the hover flag uses ink-on-paper.
 */

// Appear after the canvas is up and the hero reveal has settled —
// SceneProvider defers the canvas 1700ms (fresh) / 200ms (returning)
// past loader-complete. On the fresh path the pill lands after the
// sim's warmup gate opens (~2400ms); the returning path shows it a
// beat earlier, which is fine — preset writes persist in the store
// and land at orchestrator init.
const FRESH_APPEAR_MS = 2800;
const RETURNING_APPEAR_MS = 600;

export function SimPresetSwitcher() {
  const t = useTranslations("simPresets");
  const { config } = useScene();
  const reducedMotion = useReducedMotion();
  const presetId = useSimPresetStore((s) => s.presetId);
  const setPreset = useSimPresetStore((s) => s.setPreset);

  const [visible, setVisible] = useState(false);
  // Hydration guard: `config` and the persisted presetId both read
  // localStorage synchronously on the client, so their server values
  // can differ (e.g. cached "static" tier -> config null -> element
  // vs null structural mismatch). Render nothing until mounted — the
  // pill is invisible for >=600ms after mount anyway.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!mounted || !config || reducedMotion) return null;

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      data-no-splat
      className={`fixed bottom-4 left-4 z-40 flex flex-row items-center gap-1 rounded-full border-2 border-paper-line bg-paper/90 px-2 py-1 backdrop-blur-sm transition-opacity duration-700 md:bottom-5 md:left-5 md:flex-col md:gap-3 md:px-2 md:py-3 ${
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
            className="group relative flex size-11 cursor-pointer items-center justify-center md:size-7"
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
            {/* Ring is inset on mobile so the 44px touch target doesn't
                read as a huge circle — the visible ring hugs the dot. */}
            <span
              aria-hidden="true"
              className={`absolute inset-2 rounded-full border-2 transition-[border-color,transform] duration-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring) md:inset-0 ${
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
                (the sr-only text above carries the accessible name).
                Desktop-only: touch has no hover, and in the mobile
                horizontal row `left-full` would cover the next dot. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-sm bg-ink px-2 py-1 font-mono text-paper text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 peer-focus-visible:opacity-100 md:block"
            >
              {t(preset.i18nKey)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
