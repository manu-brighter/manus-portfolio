"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/**
 * SimPresetSwitcherHint — one-shot onboarding note for the preset
 * switcher.
 *
 * On fresh visits a hand-drawn ink arrow draws itself toward the pill and a
 * mono paper chip types its message like a typewriter. Reads as a
 * printer's margin annotation on a proof sheet — same visual family
 * as the stamp labels, and the ink/paper tokens make it follow the
 * active theme (Nachtdruck flips it to light-on-dark for free).
 *
 * Fully decorative: `aria-hidden`, `pointer-events-none`. The
 * switcher itself carries the accessible naming (radiogroup label +
 * per-dot sr-only names), so screen-reader users lose nothing.
 *
 * Anchored above the switcher's actual container, so its arrow clears
 * the button even when a translated label makes the pill wider. Below
 * `md` the arrow points down-right; desktop points down-left. The parent
 * suppresses this decoration for reduced motion in both rendering modes.
 *
 * Timer discipline: every timeout/interval registers in a ref-Set and
 * is cleared on unmount (project-wide setTimeout convention).
 */

type Phase = "hidden" | "shown" | "leaving";

const TYPE_START_DELAY_MS = 550; // arrow draw leads, text follows
const TYPE_INTERVAL_MS = 42;
const LEAVE_MS = 500;

export function SimPresetSwitcherHint({ active }: { active: boolean }) {
  const t = useTranslations("simPresets");
  const text = t("hint");

  const [phase, setPhase] = useState<Phase>("hidden");
  const [typedCount, setTypedCount] = useState(0);
  const timersRef = useRef<Set<number>>(new Set());
  const prevActiveRef = useRef(false);

  useEffect(() => {
    const timers = timersRef.current;
    if (active && !prevActiveRef.current) {
      prevActiveRef.current = true;
      // Cancel any pending leave timer from a previous cycle — without
      // this, `active` re-triggering within LEAVE_MS would let the old
      // timer hide the freshly shown hint (latent while introPeek is
      // one-shot, live the moment the trigger becomes re-armable).
      for (const id of timers) {
        window.clearTimeout(id);
        window.clearInterval(id);
      }
      timers.clear();
      setPhase("shown");
      setTypedCount(0);
      const startId = window.setTimeout(() => {
        timers.delete(startId);
        const intervalId = window.setInterval(() => {
          setTypedCount((count) => {
            if (count >= text.length) {
              window.clearInterval(intervalId);
              timers.delete(intervalId);
              return count;
            }
            return count + 1;
          });
        }, TYPE_INTERVAL_MS);
        timers.add(intervalId);
      }, TYPE_START_DELAY_MS);
      timers.add(startId);
    } else if (!active && prevActiveRef.current) {
      prevActiveRef.current = false;
      setPhase("leaving");
      const leaveId = window.setTimeout(() => {
        timers.delete(leaveId);
        setPhase("hidden");
      }, LEAVE_MS);
      timers.add(leaveId);
    }
  }, [active, text]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers) {
        // Timeout and interval ids share one pool in browsers — clear
        // both ways so the set can hold either kind.
        window.clearTimeout(id);
        window.clearInterval(id);
      }
      timers.clear();
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      data-testid="ink-studio-hint"
      className={`pointer-events-none absolute right-0 bottom-[calc(100%+0.75rem)] z-40 flex w-max flex-col items-end gap-1 transition-opacity duration-500 md:right-auto md:left-8 md:items-start ${
        phase === "leaving" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Rotation lives on the wrapper — the chip-in animation would
          otherwise overwrite a same-element Tailwind rotate (same
          transform-replacement trap as the print-jam stamps). */}
      <span className="block rotate-[2deg] md:rotate-[-2deg]">
        <span className="switcher-hint-chip block max-w-[min(16rem,calc(100vw-3rem))] rounded-sm border border-paper-line bg-paper/95 px-2.5 py-1.5 font-mono text-[0.625rem] text-ink uppercase tracking-[0.12em] shadow-[2px_2px_0_var(--color-ink)]">
          {text.slice(0, typedCount)}
          <span className="switcher-hint-caret">▌</span>
        </span>
      </span>
      {/* Arrow — drawn toward the pill. Base (mobile) is mirrored so
          the same path points down-right at the bottom-right column;
          md+ uses it as authored (down-left toward the left pill). */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 70"
        fill="none"
        className="-mt-1 mr-6 h-11 w-16 [transform:scaleX(-1)] md:mr-0 md:[transform:none] md:-ml-4 md:h-12 md:w-18"
      >
        <path
          d="M 92 8 C 76 30, 52 46, 14 54"
          pathLength={1}
          className="switcher-hint-stroke switcher-hint-ghost"
        />
        <path
          d="M 92 8 C 76 30, 52 46, 14 54"
          pathLength={1}
          className="switcher-hint-stroke switcher-hint-ink"
        />
        <path d="M 14 54 L 27 44 M 14 54 L 30 60" pathLength={1} className="switcher-hint-head" />
      </svg>
    </div>
  );
}
