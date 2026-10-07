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
 * The jump waits until `#case-study` publishes `data-case-study-layout`
 * (the pin exists, or a fallback was chosen). A fixed delay fired
 * while the main thread was still starving rAF: the scroll landed,
 * then the pin shoved the target off screen. The scroll is instant.
 * WebKit drops `scrollIntoView({ behavior: "smooth" })` once the
 * gesture that started the navigation has ended, so that glide never
 * began there and the page stayed on the hero.
 *
 * The stash is consumed when the scroll runs, not when the effect
 * starts. React 19 StrictMode double-invokes effects: removing on
 * entry meant the second mount found an empty stash and never
 * scrolled. Cleanup only cancels a jump that has not run yet.
 */

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

function layoutReady(): boolean {
  return document.getElementById("case-study")?.hasAttribute("data-case-study-layout") ?? false;
}

export function ScrollToOnLoad() {
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    const target = readTarget();
    if (!target) return;

    let raf = 0;
    let done = false;
    const deadline = performance.now() + 2500;

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
        scroller.scrollTo(el, { immediate: true, force: true });
        return;
      }
      el.scrollIntoView({ behavior: "instant", block: "start" });
    };

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      try {
        sessionStorage.removeItem(SCROLL_TO_ON_LOAD_KEY);
      } catch {
        // The URL fallback still scrolls successfully without storage.
      }
    };

    // The pin spacer can still grow a frame after it is published.
    // One jump then lands a section high. Re-align until the target
    // stays in view for a few frames, or the window ends.
    let stable = 0;
    const settle = () => {
      if (done) return;
      if (layoutReady() && inView()) {
        stable += 1;
        if (stable >= 3) {
          finish();
          return;
        }
      } else {
        stable = 0;
        if (layoutReady()) jump();
      }
      if (performance.now() > deadline) {
        if (layoutReady() && !inView()) jump();
        finish();
        return;
      }
      raf = requestAnimationFrame(settle);
    };
    settle();

    return () => {
      done = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
