"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { subscribeToLoaderComplete } from "@/lib/loaderSession";
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
  /** Vertical entrance offset in px — the element settles up (positive
   * value = starts below). 0 keeps the pure opacity fade. */
  y?: number;
  /** Entrance scale — the element grows/shrinks to 1. 1 keeps the pure
   * opacity fade. Used by stamp-style pops (StampDivider). */
  scale?: number;
  /** Rendered element. Default `span` (inline, safe inside <p>); use
   * `div` when wrapping block content — a span around blocks is
   * invalid HTML and trips hydration. */
  as?: "span" | "div";
};

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = dur.medium,
  threshold = 0.35,
  waitForLoader = false,
  ariaHidden,
  y = 0,
  scale = 1,
  as: Tag = "span",
}: FadeInProps) {
  // Intersection covers both render tags (structurally identical —
  // both are bare HTMLElement extensions).
  const ref = useRef<HTMLSpanElement & HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    // display:inline can't carry transforms — promote plain-inline
    // elements to inline-block when a transform entrance is requested.
    // Decided from COMPUTED display, not tag name: a span the caller
    // styled inline-flex/inline-block is already an atomic inline box
    // (transformable) and overriding it would clobber flex layout
    // (gap/align) — bit the SectionHeader eyebrow in review.
    const hasTransform = y !== 0 || scale !== 1;
    const needsInlineBlock = hasTransform && getComputedStyle(el).display === "inline";
    gsap.set(el, {
      opacity: 0,
      ...(hasTransform ? { y, scale } : {}),
      ...(needsInlineBlock ? { display: "inline-block" } : {}),
    });

    let fired = false;
    let tween: gsap.core.Tween | null = null;
    let settleTimer: number | null = null;
    let unsubLoader: (() => void) | null = null;

    const start = () => {
      tween = gsap.to(el, {
        opacity: 1,
        ...(hasTransform ? { y: 0, scale: 1 } : {}),
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
      // subscribeToLoaderComplete fires synchronously if the loader
      // already finished, otherwise queues until markLoaderComplete().
      unsubLoader = subscribeToLoaderComplete(() => {
        settleTimer = window.setTimeout(start, LOADER_SETTLE_MS);
      });
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
      unsubLoader?.();
      // Clear primed inline styles so a mid-session reduced-motion
      // flip (which reuses the same node in the static branch) can't
      // strand the content at opacity 0.
      gsap.set(el, { clearProps: "opacity,transform,display" });
    };
  }, [reducedMotion, delay, duration, threshold, waitForLoader, y, scale]);

  if (reducedMotion) {
    return (
      <Tag className={className} aria-hidden={ariaHidden}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={className} aria-hidden={ariaHidden}>
      {children}
    </Tag>
  );
}
