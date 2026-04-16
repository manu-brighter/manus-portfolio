"use client";

/**
 * `prefers-reduced-motion` subscription via useSyncExternalStore.
 *
 * SSR-first-render returns `false` so the server HTML matches the
 * client's initial render when reduced-motion is off (the common case).
 * If the user has reduce enabled, the post-mount render flips to `true`
 * and consumers react (e.g. MotionProvider destroys Lenis).
 *
 * Plan §7: Reduced-motion must respond to runtime toggles — listeners
 * are attached to the MediaQueryList `change` event, not just read once.
 */

import { useSyncExternalStore } from "react";

const MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

let mql: MediaQueryList | null = null;
function getMql(): MediaQueryList {
  if (!mql) mql = window.matchMedia(MEDIA_QUERY);
  return mql;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const q = getMql();
  q.addEventListener("change", callback);
  return () => q.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return getMql().matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
