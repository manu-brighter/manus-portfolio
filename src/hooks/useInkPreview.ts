"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INK_PREFERENCE_KEY,
  type InkPreference,
  isSlowInkWindow,
  parseInkPreference,
  resolveInkPreference,
} from "@/lib/inkPreview";
import { subscribe } from "@/lib/raf";

/** Auto always starts light; sustained slow frames only reduce its rendering budget. */
export function useInkPreview(paused: boolean) {
  const [preference, setPreference] = useState<InkPreference>("auto");
  const [ready, setReady] = useState(false);
  const temporaryOverride = useRef(false);
  const [automaticallyReduced, setAutomaticallyReduced] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("ink-preview");
    temporaryOverride.current = parseInkPreference(query) !== null;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(INK_PREFERENCE_KEY);
    } catch {
      // Site data may be blocked. The controls still work for this visit.
    }
    setPreference(resolveInkPreference(query, stored));
    setReady(true);
  }, []);

  const select = useCallback((next: InkPreference) => {
    setPreference(next);
    setAutomaticallyReduced(false);
    setRevision((value) => value + 1);
    if (!temporaryOverride.current) {
      try {
        window.localStorage.setItem(INK_PREFERENCE_KEY, next);
      } catch {
        // Keep the in-memory selection when storage is unavailable.
      }
    }
  }, []);

  // Revision deliberately restarts the measurement when Auto is chosen twice.
  // biome-ignore lint/correctness/useExhaustiveDependencies(revision): restarting Auto clears the measurement windows even if the preference did not change
  useEffect(() => {
    if (!ready || preference !== "auto" || paused || automaticallyReduced) return;
    let last = performance.now();
    let warmUntil = last + 6000;
    let samples: number[] = [];
    let slowWindows = 0;
    const resetWindow = () => {
      last = performance.now();
      warmUntil = last + 2000;
      samples = [];
      slowWindows = 0;
    };
    document.addEventListener("visibilitychange", resetWindow);
    window.addEventListener("resize", resetWindow);
    const unsubscribe = subscribe(() => {
      const now = performance.now();
      const interval = now - last;
      last = now;
      if (document.hidden || now < warmUntil) return;
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
  }, [ready, preference, paused, automaticallyReduced, revision]);

  return {
    ready,
    preference,
    automaticallyReduced,
    light: preference !== "full",
    select,
  };
}
