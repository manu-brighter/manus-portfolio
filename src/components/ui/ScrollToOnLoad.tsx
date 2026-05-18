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
 * Module-level `timer` (matches the `loaderFired` flag pattern):
 * survives React 19 strict-mode double-invoke. The first effect run
 * reads + removes the sessionStorage entry and schedules the scroll.
 * If the user back-navigates inside the 800ms window the cleanup
 * clears the timer so the wrong page doesn't get an unexpected scroll
 * (and on the remount the sessionStorage is already empty, so no new
 * timer schedules). The single-timer guard prevents the StrictMode
 * fake-unmount-remount cycle from doubling up.
 */

const POST_MOUNT_DELAY_MS = 800;

let timer: number | null = null;

export function ScrollToOnLoad() {
  useEffect(() => {
    const target = sessionStorage.getItem("scrollToOnLoad");
    if (!target) return;

    // sessionStorage entry is consumed by the TIMER firing, not by the
    // effect entry. React 19 StrictMode in dev double-invokes the
    // effect: removing on entry meant mount-1 read+removed → unmount-1
    // cleared the timer → mount-2 found empty sessionStorage → scroll
    // never fired. Leaving the entry until the timer actually runs
    // means the second mount picks it up fresh, schedules another
    // timer, and one of the two fires successfully. The entry is
    // removed inside the callback so a future navigation through the
    // home page doesn't re-trigger a stale scroll.
    timer = window.setTimeout(() => {
      timer = null;
      sessionStorage.removeItem("scrollToOnLoad");
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, POST_MOUNT_DELAY_MS);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
  }, []);

  return null;
}
