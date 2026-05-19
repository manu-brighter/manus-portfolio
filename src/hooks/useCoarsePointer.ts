"use client";

/**
 * `(pointer: coarse)` subscription via useSyncExternalStore.
 *
 * Mirrors `useReducedMotion.ts` shape: SSR first-render returns `false`
 * (the common desktop case — matches the prior inline `useState`
 * detections), then the post-mount render flips to the real value.
 * Adds a `change` listener so consumers react to runtime flips (e.g.
 * DevTools device-emulation toggle, plugging a touchscreen into a
 * desktop session).
 *
 * Replaces 7 inline `window.matchMedia("(pointer: coarse)").matches`
 * detections that each had divergent SSR-guard styles.
 */

import { useSyncExternalStore } from "react";

const MEDIA_QUERY = "(pointer: coarse)";

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

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
