"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/**
 * SimPresetSwitcherHint — one-shot onboarding note for the preset
 * switcher.
 *
 * While the switcher's intro peek holds the dot row open (fresh loads
 * only), a hand-drawn ink arrow draws itself toward the pill and a
 * mono paper chip types its message like a typewriter. Reads as a
 * printer's margin annotation on a proof sheet — same visual family
 * as the stamp labels, and the ink/paper tokens make it follow the
 * active theme (Nachtdruck flips it to light-on-dark for free).
 *
 * Fully decorative: `aria-hidden`, `pointer-events-none`. The
 * switcher itself carries the accessible naming (radiogroup label +
 * per-dot sr-only names), so screen-reader users lose nothing.
 *
 * Position mirrors the pill's breakpoint split: below `md` the pill
 * sits bottom-right (hint floats left of it, arrow flipped to point
 * down-right); from `md` up the pill is bottom-left (hint floats
 * right of it, arrow points down-left). The parent only mounts this
 * on the live-sim path (config + no reduced motion), so there is no
 * reduced-motion branch here — reduced-motion users never see the
 * switcher at all.
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
      className={`pointer-events-none fixed right-20 bottom-36 z-40 flex flex-col items-end gap-1 transition-opacity duration-500 md:right-auto md:bottom-10 md:left-24 md:items-start ${
        phase === "leaving" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Rotation lives on the wrapper — the chip-in animation would
          otherwise overwrite a same-element Tailwind rotate (same
          transform-replacement trap as the print-jam stamps). */}
      <span className="block rotate-[2deg] md:rotate-[-2deg]">
        <span className="switcher-hint-chip block rounded-sm border border-paper-line bg-paper/95 px-3 py-2 font-mono text-[0.7rem] text-ink uppercase tracking-[0.18em] shadow-[2px_2px_0_var(--color-ink)]">
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
        className="-mt-1 mr-8 h-14 w-20 [transform:scaleX(-1)] md:mr-0 md:[transform:none] md:-ml-5 md:h-16 md:w-24"
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
