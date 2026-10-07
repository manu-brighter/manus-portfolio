"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInkWarmup,
  DEFAULT_INK_PREFERENCE,
  INK_PREFERENCE_KEY,
  type InkPreference,
  isSlowInkWindow,
  parseInkPreference,
  resolveInkPreference,
} from "@/lib/inkPreview";
import { subscribe } from "@/lib/raf";

/** Animation is the default on every device; Simulation only runs after an
 * explicit choice. Sustained slow frames may lower Animation's own budget,
 * but nothing here ever switches the renderer on the visitor's behalf. */
export function useInkPreview(paused: boolean, rendererReady: boolean) {
  const [preference, setPreference] = useState<InkPreference>(DEFAULT_INK_PREFERENCE);
  const [ready, setReady] = useState(false);
  const temporaryOverride = useRef(false);
  const [automaticallyReduced, setAutomaticallyReduced] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("ink-preview");
    temporaryOverride.current = parseInkPreference(query) !== null;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(INK_PREFERENCE_KEY);
      // A retired value ("auto") or anything unknown is no preference. Drop
      // it so the disclosed key only ever holds an explicit choice.
      if (stored !== null && parseInkPreference(stored) === null) {
        window.localStorage.removeItem(INK_PREFERENCE_KEY);
      }
    } catch {
      // Site data may be blocked. The controls still work for this visit.
    }
    setPreference(resolveInkPreference(query, stored));
    setReady(true);
  }, []);

  const select = useCallback((next: InkPreference) => {
    setPreference(next);
    if (!temporaryOverride.current) {
      try {
        window.localStorage.setItem(INK_PREFERENCE_KEY, next);
      } catch {
        // Keep the in-memory selection when storage is unavailable.
      }
    }
  }, []);

  const light = preference === "light";

  // Keep the verdict for this provider's lifetime: a detour through
  // Simulation must not make Animation re-learn the same hardware.
  useEffect(() => {
    if (!ready || !light || paused || automaticallyReduced || !rendererReady) return;
    let last = performance.now();
    let warmedUp = createInkWarmup(last);
    let samples: number[] = [];
    let slowWindows = 0;
    const resetWindow = () => {
      last = performance.now();
      warmedUp = createInkWarmup(last, 2000);
      samples = [];
      slowWindows = 0;
    };
    document.addEventListener("visibilitychange", resetWindow);
    window.addEventListener("resize", resetWindow);
    const unsubscribe = subscribe(() => {
      const now = performance.now();
      const interval = now - last;
      last = now;
      if (
        document.hidden ||
        !warmedUp(now, document.readyState === "complete" && document.fonts.status !== "loading")
      )
        return;
      // A single large interruption never decides a window by itself.
      samples.push(interval);
      if (samples.length < 90) return;
      slowWindows = isSlowInkWindow(samples) ? slowWindows + 1 : 0;
      samples = [];
      if (slowWindows >= 2) setAutomaticallyReduced(true);
    }, 110);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", resetWindow);
      window.removeEventListener("resize", resetWindow);
    };
  }, [ready, light, paused, automaticallyReduced, rendererReady]);

  return {
    ready,
    preference,
    // Only Animation's budget is ever reduced. An explicit Simulation runs
    // at its own physics tier and never reports a reduction.
    automaticallyReduced: light && automaticallyReduced,
    light,
    select,
  };
}
