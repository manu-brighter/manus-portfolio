"use client";

import { useCallback } from "react";

/**
 * View Transitions API hook — wraps a navigation callback in
 * `document.startViewTransition()` if supported. Falls back to
 * synchronous navigation in browsers without support (Safari < 18,
 * Firefox without flag). Cross-document navigation in the App Router
 * uses the v5+ cross-document mode where supported.
 *
 * Used for locale-switching: gives a smooth crossfade between
 * de → en → fr → it instead of a hard cut.
 */
export function useViewTransition() {
  return useCallback((callback: () => void) => {
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(callback);
    } else {
      callback();
    }
  }, []);
}
