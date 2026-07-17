"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePathname } from "@/i18n/navigation";
import { getSimPreset, SIM_PRESETS, type SimPreset } from "@/lib/content/simPresets";
import { isLoaderComplete, subscribeToLoaderComplete } from "@/lib/loaderSession";
import { SPOT_HEX } from "@/lib/palette";
import { useSimPresetStore } from "@/lib/simPresetStore";
import { SimPresetSwitcherHint } from "./SimPresetSwitcherHint";

/** Two-tone dot fill. `swatchHex` (Wave's blues) wins over the
 *  canonical spot pair — spot colors as fills only, decorative.
 *  Exported for the playground's inline PlaygroundPresetBar. */
export function swatchGradient(preset: SimPreset): string {
  const [c0, c1] = preset.swatchHex ?? [SPOT_HEX[preset.swatch[0]], SPOT_HEX[preset.swatch[1]]];
  return `linear-gradient(135deg, ${c0} 50%, ${c1} 50%)`;
}

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
 * Layout is breakpoint-adaptive and collapsible on BOTH sides of md:
 * below md a tap-to-expand pill in the bottom-RIGHT corner — at rest
 * a single active-swatch toggle button (the dot row eats real phone
 * estate), tap to expand UPWARD (the toggle is the column's bottom
 * child; dots stack above it), selection re-collapses; >=44px touch
 * targets throughout (the name flag is hover/focus-only, so it stays
 * Desktop-only). Upward, not sideways, because the playground routes
 * put their controls along the bottom edge — a leftward row covered
 * them (user-reported). From md up a vertical pill bottom-left that
 * rests as the active dot alone and expands upward on :hover OR
 * :focus-within — the focus trigger is what keeps the native-radio
 * arrow-key pattern working: the collapsed dots are h-0 (NOT
 * display:none), so their sr-only inputs stay focusable, and focus
 * expands the pill before the user can notice.
 *
 * Pointer-selection collapses the pill immediately: the clicked radio
 * is blurred (releases :focus-within) and hover-expansion is disarmed
 * until the pointer leaves the pill — without the disarm the still-
 * hovering cursor holds it open (user feedback: "collapse right after
 * selecting"). Keyboard selection keeps focus and stays expanded.
 *
 * Discoverability peek: when the pill first appears it unfolds the
 * full dot row for INTRO_PEEK_MS, then rests — first-time users
 * otherwise never learn the lone dot is a 5-way switcher. Any
 * selection or manual toggle ends the peek early.
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
// How long the appear-time discoverability peek holds the row open.
// Long enough for the SwitcherHint choreography (arrow draw ~0.9s +
// typewriter ~1.5s) plus reading time — the hint fades with the peek.
const INTRO_PEEK_MS = 6500;

export function SimPresetSwitcher() {
  const t = useTranslations("simPresets");
  const { config } = useScene();
  const reducedMotion = useReducedMotion();
  // Coarse pointers at md+ (touch tablets) keep the pill always
  // expanded: iOS Safari doesn't focus radios on tap, so the
  // hover/focus-within collapse mechanic has no reliable expand
  // trigger there — after one selection the pill would dead-end
  // until a stray tap elsewhere re-armed the emulated hover.
  const isCoarse = useCoarsePointer();
  // Playground experiment routes render their own docked PresetBar in
  // ExperimentChrome (all viewports), so the floating overlay pill
  // stands down there — one switcher per screen, and the docked bar
  // avoids the pill's mobile overlap with the experiments' bottom-edge
  // controls. usePathname is locale-stripped ("/playground/type-as-
  // fluid").
  const pathname = usePathname();
  const onExperimentRoute = pathname.startsWith("/playground/");
  const presetId = useSimPresetStore((s) => s.presetId);
  const setPreset = useSimPresetStore((s) => s.setPreset);

  const [visible, setVisible] = useState(false);
  // Mobile-only collapse: the 4-dot row takes real estate on a phone,
  // so below `md` the pill rests as a single active-swatch button and
  // expands leftwards on tap. From `md` up the group is always shown
  // and the toggle is display:none — `expanded` simply has no effect.
  const [expanded, setExpanded] = useState(false);
  // Appear-time discoverability peek (desktop expansion is otherwise
  // pure CSS hover/focus, so the forced unfold needs its own state).
  const [introPeek, setIntroPeek] = useState(false);
  const peekTimerRef = useRef<number | null>(null);
  // False right after a pointer-selection, re-armed on pointerleave:
  // gates the md: group-hover expansion classes so the pill can
  // collapse under a still-hovering cursor.
  const [hoverArmed, setHoverArmed] = useState(true);
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
      timer = window.setTimeout(() => {
        setVisible(true);
        // Discoverability peek — unfold the whole row for a beat
        // (`expanded` drives the mobile row, `introPeek` the md:
        // pill). Fresh loads only: replaying it on every same-session
        // return (locale switch, back-nav) is noise, not teaching.
        if (!wasComplete) {
          setExpanded(true);
          setIntroPeek(true);
          peekTimerRef.current = window.setTimeout(() => {
            setExpanded(false);
            setIntroPeek(false);
          }, INTRO_PEEK_MS);
        }
      }, delay);
    });
    return () => {
      unsub();
      if (timer !== null) window.clearTimeout(timer);
      if (peekTimerRef.current !== null) window.clearTimeout(peekTimerRef.current);
    };
  }, []);

  // A real scroll means the user has moved on — keeping the peek (and
  // its hint) pinned over mid-page content reads as clutter, not
  // teaching. Threshold beats a bare listener so Lenis' sub-pixel
  // settle can't cancel the peek on load.
  useEffect(() => {
    if (!introPeek) return;
    const onScroll = () => {
      if (window.scrollY < 160) return;
      if (peekTimerRef.current !== null) {
        window.clearTimeout(peekTimerRef.current);
        peekTimerRef.current = null;
      }
      setExpanded(false);
      setIntroPeek(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [introPeek]);

  if (!mounted || !config || reducedMotion || onExperimentRoute) return null;

  const activePreset = getSimPreset(presetId);

  // User interaction (selection or manual toggle) ends the peek early
  // — their intent wins over the timed rest.
  const endIntroPeek = () => {
    if (peekTimerRef.current !== null) {
      window.clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
    setIntroPeek(false);
  };

  return (
    <>
      {/* One-shot onboarding note — arrow + typewriter chip, alive
          exactly as long as the intro peek holds the row open. */}
      <SimPresetSwitcherHint active={introPeek} />
      <div
        data-no-splat
        onPointerLeave={() => setHoverArmed(true)}
        className={`group/pill fixed right-4 bottom-4 z-40 flex flex-col items-center gap-1 rounded-full border-2 border-paper-line bg-paper/90 px-1 py-1 backdrop-blur-sm transition-opacity duration-700 md:right-auto md:bottom-5 md:left-5 md:flex-col md:gap-0 md:px-2 md:py-2 ${
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
          className={`${expanded ? "flex" : "hidden"} flex-col items-center gap-1 md:flex md:flex-col md:gap-0`}
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
                // Desktop collapse: non-active dots rest at h-0 and fade
                // in when the pill is hovered or holds focus (hover only
                // while armed — see hoverArmed), or during the intro
                // peek. Heights are explicit (h-0 <-> h-10) so the
                // transition animates.
                className={`group relative flex size-11 cursor-pointer items-center justify-center transition-[height,opacity] duration-300 [-webkit-tap-highlight-color:transparent] md:w-7 ${
                  active || introPeek || isCoarse
                    ? "md:h-10"
                    : `md:h-0 md:overflow-hidden md:opacity-0 md:group-focus-within/pill:h-10 md:group-focus-within/pill:overflow-visible md:group-focus-within/pill:opacity-100${
                        hoverArmed
                          ? " md:group-hover/pill:h-10 md:group-hover/pill:overflow-visible md:group-hover/pill:opacity-100"
                          : ""
                      }`
                }`}
              >
                <input
                  type="radio"
                  name="sim-preset"
                  value={preset.id}
                  checked={active}
                  onChange={(e) => {
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
                    endIntroPeek();
                    const viaPointer = pointerSelectRef.current;
                    pointerSelectRef.current = false;
                    if (viaPointer) {
                      // Desktop pointer path: release :focus-within and
                      // disarm hover so the pill collapses immediately
                      // instead of waiting for an outside click /
                      // pointer exit. Keyboard keeps focus (staying
                      // expanded is correct mid-arrow-key browsing).
                      e.currentTarget.blur();
                      setHoverArmed(false);
                    } else if (
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
                  className={`absolute inset-2 size-7 rounded-full border-2 transition-[border-color,transform] duration-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring) md:inset-auto ${
                    active ? "scale-100 border-ink" : "scale-75 border-transparent"
                  }`}
                />
                {/* Two-tone preset swatch — spot colors as fills only */}
                <span
                  aria-hidden="true"
                  className={`size-3.5 rounded-full transition-transform duration-300 ${
                    active ? "scale-110" : "scale-100 opacity-70"
                  }`}
                  style={{ background: swatchGradient(preset) }}
                />
                {/* Hover/focus name flag — ink on paper, decorative only
                (the sr-only text above carries the accessible name).
                Desktop-only: touch has no hover, and in the mobile
                vertical column `left-full` would jut off the edge. */}
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
          onClick={() => {
            endIntroPeek();
            setExpanded((v) => !v);
          }}
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
            style={{ background: swatchGradient(activePreset) }}
          />
        </button>
      </div>
    </>
  );
}
