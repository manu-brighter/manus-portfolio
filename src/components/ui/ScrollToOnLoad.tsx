"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import { SCROLL_TO_ON_LOAD_KEY } from "@/lib/homeSection";

/**
 * Post-mount anchor scroll for sub-route → home navigation.
 *
 * When the user clicks a hash-anchor in the navbar from a sub-route
 * (e.g. /playground/<slug>), the click handler in Nav stores the
 * target section id in sessionStorage instead of letting the browser
 * resolve the hash on its own. Reason: by the time the home page
 * hydrates, GSAP ScrollTrigger has not yet pinned the case-study
 * section. The browser scrolls to the element's CURRENT position;
 * the pin then inserts its spacer and every later section shifts
 * down, so the visitor lands one section off.
 *
 * The jump is instant and repeats until the target has stayed in view
 * through WATCH_MS. The pin can still change the page height after the
 * first jump. WebKit drops a smooth scroll once the navigation gesture
 * has ended, so the correction cannot be a glide. Wheel, touch, keys
 * and pointer input end the correction: a visitor who scrolls on is
 * not pulled back.
 *
 * The stash is consumed when the jump finishes, or on a real unmount.
 * React 19 StrictMode double-invokes effects: removing the key in
 * cleanup meant the second mount found an empty stash and never
 * scrolled. Cleanup only schedules the removal; the remount cancels it.
 */

/** Keep correcting at least this long, so a late pin still lands. */
const WATCH_MS = 1500;
/** Stop even if the target never arrives. Also the rAF backup. */
const GIVE_UP_MS = 4000;

const INTENT_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

let dropStashTimer: number | null = null;

function cancelScheduledStashDrop() {
  if (dropStashTimer === null) return;
  window.clearTimeout(dropStashTimer);
  dropStashTimer = null;
}

function scheduleStashDrop() {
  cancelScheduledStashDrop();
  dropStashTimer = window.setTimeout(() => {
    dropStashTimer = null;
    try {
      sessionStorage.removeItem(SCROLL_TO_ON_LOAD_KEY);
    } catch {
      // The key is already gone, or site storage is blocked.
    }
  }, 0);
}

function readTarget(): string {
  let target = window.location.hash.slice(1);
  try {
    target = decodeURIComponent(target);
  } catch {
    // A malformed incoming fragment should not prevent page hydration.
  }
  if (target) return target;
  try {
    return sessionStorage.getItem(SCROLL_TO_ON_LOAD_KEY) ?? "";
  } catch {
    return "";
  }
}

function dropStashNow() {
  cancelScheduledStashDrop();
  try {
    sessionStorage.removeItem(SCROLL_TO_ON_LOAD_KEY);
  } catch {
    // The URL fallback still scrolls successfully without storage.
  }
}

export function ScrollToOnLoad() {
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    // StrictMode remounts synchronously and must still see the stash.
    cancelScheduledStashDrop();
    const target = readTarget();
    if (!target) return;

    let raf = 0;
    let backup = 0;
    let done = false;
    const watchUntil = performance.now() + WATCH_MS;
    const deadline = performance.now() + GIVE_UP_MS;

    const element = () => document.getElementById(target);

    const inView = () => {
      const el = element();
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      if (visible <= 0) return false;
      return visible >= Math.min(rect.height, window.innerHeight) * 0.3;
    };

    const jump = () => {
      const el = element();
      if (!el) return;
      const scroller = lenisRef.current;
      if (scroller) {
        // The pin changes the page height. Resize first or Lenis
        // clamps the target to the pre-pin limit.
        scroller.resize();
        scroller.scrollTo(el, { immediate: true });
        return;
      }
      el.scrollIntoView({ behavior: "instant", block: "start" });
    };

    const removeIntent = () => {
      for (const type of INTENT_EVENTS) {
        window.removeEventListener(type, finish);
      }
    };

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(backup);
      removeIntent();
      dropStashNow();
    };

    for (const type of INTENT_EVENTS) {
      window.addEventListener(type, finish, { passive: true });
    }

    // Keep aligning through the pin. A view-transition scroll restore
    // or a late spacer can move the target after the first jump.
    // rAF can stall while WebGL is busy; the timer is the backup.
    const settle = () => {
      if (done) return;
      if (!inView()) jump();
      if (performance.now() >= watchUntil && inView()) {
        finish();
        return;
      }
      if (performance.now() > deadline) {
        if (!inView()) jump();
        finish();
        return;
      }
      raf = requestAnimationFrame(settle);
    };
    backup = window.setTimeout(() => {
      if (!done && !inView()) jump();
      finish();
    }, GIVE_UP_MS);
    settle();

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(backup);
      removeIntent();
      scheduleStashDrop();
    };
  }, []);

  return null;
}
