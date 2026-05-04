"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useRef } from "react";
import { isLoaderComplete } from "@/components/ui/Loader";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dur } from "@/lib/motion/tokens";

/**
 * Minimal opacity fade-in primitive.
 *
 * The companion to `OverprintReveal` for elements that should appear
 * with the same scroll/loader cadence but don't need the per-char Riso
 * misregistration treatment (decorative slashes, divider glyphs,
 * caption blocks, pull-quote captions, etc.).
 *
 * Mirrors `OverprintReveal`'s loader-gate semantics so a Hero-adjacent
 * fade can sync with the surname/given-name reveals — see the hero
 * `<FadeIn waitForLoader>` slash for the canonical use.
 *
 * Reduced-motion: renders the children straight through, no animation.
 */

const LOADER_SETTLE_MS = 350;

type FadeInProps = {
  children: ReactNode;
  className?: string;
  /** Delay before the tween starts once the trigger fires (seconds). */
  delay?: number;
  /** Tween duration (seconds). Defaults to `dur.medium`. */
  duration?: number;
  /** IO threshold for the scroll trigger. Defaults to 0.35 to match
   * the project's other reveal primitives. */
  threshold?: number;
  /** Defer the tween until the Loader fires `loader-complete` AND a
   * post-paint settle window has elapsed. Set true for Hero-adjacent
   * elements; leave false for scroll-into-view consumers. */
  waitForLoader?: boolean;
  /** Pass-through to the rendered span — for `aria-hidden="true"` on
   * decorative glyphs, etc. */
  ariaHidden?: boolean;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = dur.medium,
  threshold = 0.35,
  waitForLoader = false,
  ariaHidden,
}: FadeInProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0 });

    let fired = false;
    let tween: gsap.core.Tween | null = null;
    let settleTimer: number | null = null;
    let pendingLoaderListener: (() => void) | null = null;

    const start = () => {
      tween = gsap.to(el, {
        opacity: 1,
        duration,
        delay,
        ease: "power2.out",
      });
    };

    const fireWhenReady = () => {
      if (!waitForLoader) {
        start();
        return;
      }
      const launch = () => {
        settleTimer = window.setTimeout(start, LOADER_SETTLE_MS);
      };
      if (isLoaderComplete()) {
        launch();
      } else {
        pendingLoaderListener = () => {
          pendingLoaderListener = null;
          launch();
        };
        window.addEventListener("loader-complete", pendingLoaderListener, { once: true });
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired) continue;
          fired = true;
          io.disconnect();
          fireWhenReady();
        }
      },
      { threshold },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      tween?.kill();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (pendingLoaderListener)
        window.removeEventListener("loader-complete", pendingLoaderListener);
    };
  }, [reducedMotion, delay, duration, threshold, waitForLoader]);

  if (reducedMotion) {
    return (
      <span className={className} aria-hidden={ariaHidden}>
        {children}
      </span>
    );
  }

  return (
    <span ref={ref} className={className} aria-hidden={ariaHidden}>
      {children}
    </span>
  );
}
