"use client";

import { useEffect } from "react";

/**
 * Post-mount anchor scroll for sub-route → home navigation.
 *
 * When the user clicks a hash-anchor in the navbar from a sub-route
 * (e.g. /playground/<slug>), the click handler in Nav stores the
 * target section id in sessionStorage instead of letting the browser
 * resolve the hash on its own. Reason: by the time the home page
 * hydrates, GSAP ScrollTrigger has not yet pinned the case-study
 * section. The browser scrolls to the photography element's CURRENT
 * position; ~50ms later the pin inserts ~320vh of pin-spacer extent,
 * shifting every section after case-study downward — so the user
 * lands on the wrong section ("alle um eins verschoben").
 *
 * This component runs ~800ms after mount (loader complete + first
 * ScrollTrigger.refresh), reads the stored target, and smooth-scrolls
 * to it via scrollIntoView. Lenis listens for native scroll events
 * and rides along, so no explicit Lenis call is needed.
 *
 * NO cleanup on the timer: under React 19 strict-mode dev, useEffect
 * is double-invoked (mount → fake-unmount → remount). If we cleared
 * the timer in the cleanup, the first invocation would schedule + clear
 * before firing, and the second invocation would find sessionStorage
 * already cleared (because we read+remove on first run) → no scroll.
 * Letting the setTimeout fire unconditionally is correct: the second
 * invocation early-returns because sessionStorage is empty, and only
 * one timer ever runs.
 */

const POST_MOUNT_DELAY_MS = 800;

export function ScrollToOnLoad() {
  useEffect(() => {
    const target = sessionStorage.getItem("scrollToOnLoad");
    if (!target) return;
    sessionStorage.removeItem("scrollToOnLoad");

    window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, POST_MOUNT_DELAY_MS);
  }, []);

  return null;
}
