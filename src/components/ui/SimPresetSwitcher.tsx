"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getSimPreset, SIM_PRESETS } from "@/lib/content/simPresets";
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
 * Layout is breakpoint-adaptive: below md a COLLAPSIBLE pill in the
 * bottom-RIGHT corner — at rest a single active-swatch toggle button
 * (the 4-dot row eats real phone estate), tap to expand the row
 * leftwards, selection re-collapses; >=44px touch targets throughout
 * (the name flag is hover/focus-only, so it stays Desktop-only).
 * From md up the original always-open vertical dot pill bottom-left.
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
  // Mobile-only collapse: the 4-dot row takes real estate on a phone,
  // so below `md` the pill rests as a single active-swatch button and
  // expands leftwards on tap. From `md` up the group is always shown
  // and the toggle is display:none — `expanded` simply has no effect.
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Set on pointerdown, consumed in onChange: distinguishes tap/click
  // selection from keyboard (arrow-key) selection. Only keyboard
  // selection restores focus to the toggle — a programmatic .focus()
  // after a TAP makes iOS Safari paint the :focus-visible ring as a
  // persistent teal rectangle on the collapsed pill (real-device bug).
  const pointerSelectRef = useRef(false);
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

  const activePreset = getSimPreset(presetId);

  return (
    <div
      data-no-splat
      className={`fixed right-4 bottom-4 z-40 flex flex-row items-center gap-1 rounded-full border-2 border-paper-line bg-paper/90 px-1 py-1 backdrop-blur-sm transition-opacity duration-700 md:right-auto md:bottom-5 md:left-5 md:flex-col md:gap-3 md:px-2 md:py-3 ${
        // `invisible` keeps the not-yet-appeared pill out of the tab
        // order too (visibility transitions cleanly alongside opacity).
        visible ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
      }`}
    >
      <div
        role="radiogroup"
        aria-label={t("label")}
        // Any keydown re-arms the keyboard path: a tap on the ALREADY
        // active preset fires no onChange, so pointerSelectRef would
        // stay stale-true and misclassify the next arrow-key selection
        // (skipping its focus restore).
        onKeyDown={() => {
          pointerSelectRef.current = false;
        }}
        className={`${expanded ? "flex" : "hidden"} flex-row items-center gap-1 md:flex md:flex-col md:gap-3`}
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
              onPointerDown={() => {
                pointerSelectRef.current = true;
              }}
              className="group relative flex size-11 cursor-pointer items-center justify-center [-webkit-tap-highlight-color:transparent] md:size-7"
            >
              <input
                type="radio"
                name="sim-preset"
                value={preset.id}
                checked={active}
                onChange={() => {
                  setPreset(preset.id);
                  // Mobile: selection collapses the row again. KEYBOARD
                  // selection restores focus to the toggle so users
                  // don't drop to <body> when the focused radio turns
                  // display:none; tap/click skips the restore (see
                  // pointerSelectRef — iOS paints a persistent
                  // focus-visible rectangle otherwise). No-op from `md`
                  // up (toggle is display:none there and the group
                  // ignores `expanded`).
                  setExpanded(false);
                  const viaPointer = pointerSelectRef.current;
                  pointerSelectRef.current = false;
                  if (
                    !viaPointer &&
                    toggleRef.current &&
                    getComputedStyle(toggleRef.current).display !== "none"
                  ) {
                    toggleRef.current.focus();
                  }
                }}
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

      {/* Mobile collapse toggle — display:none from `md` up. Shows the
          active preset's two-tone swatch so the collapsed pill still
          communicates the current character. aria-expanded carries the
          state; the sr-only text names the control. */}
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) md:hidden"
      >
        <span className="sr-only">{t("label")}</span>
        <span
          aria-hidden="true"
          className={`absolute inset-2 rounded-full border-2 border-ink transition-transform duration-300 ${
            expanded ? "scale-100" : "scale-90"
          }`}
        />
        <span
          aria-hidden="true"
          className="size-3.5 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${SPOT_HEX[activePreset.swatch[0]]} 50%, ${
              SPOT_HEX[activePreset.swatch[1]]
            } 50%)`,
          }}
        />
      </button>
    </div>
  );
}
