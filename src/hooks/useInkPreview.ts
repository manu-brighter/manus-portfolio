"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInkWarmup,
  INK_PREFERENCE_KEY,
  type InkPreference,
  isSlowInkWindow,
  parseInkPreference,
  resolveInkPreference,
} from "@/lib/inkPreview";
import { subscribe } from "@/lib/raf";

/** Auto may use simulation on a capable desktop, with a one-way fallback
 * after sustained slow frames. Explicit visitor choices always win. */
export function useInkPreview(paused: boolean, autoFull: boolean, rendererReady: boolean) {
  const [preference, setPreference] = useState<InkPreference>("auto");
  const [ready, setReady] = useState(false);
  const temporaryOverride = useRef(false);
  const [automaticallyReduced, setAutomaticallyReduced] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("ink-preview");
    temporaryOverride.current = parseInkPreference(query) !== null;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(INK_PREFERENCE_KEY);
    } catch {
      // Site data may be blocked. The controls still work for this visit.
    }
    // Touch devices start in Animation regardless of their measured GPU tier.
    // An explicit saved choice or temporary QA override still takes priority.
    const defaultPreference = window.matchMedia("(pointer: coarse)").matches ? "light" : "auto";
    setPreference(resolveInkPreference(query, stored, defaultPreference));
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

  // Keep the verdict for this provider's lifetime. Choosing a manual mode
  // must not turn returning to Auto into a different hardware assessment.
  useEffect(() => {
    if (!ready || preference !== "auto" || paused || automaticallyReduced || !rendererReady) return;
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
  }, [ready, preference, paused, automaticallyReduced, rendererReady]);

  return {
    ready,
    preference,
    automaticallyReduced: preference === "auto" && automaticallyReduced,
    light: preference === "light" || (preference === "auto" && (!autoFull || automaticallyReduced)),
    select,
  };
}
