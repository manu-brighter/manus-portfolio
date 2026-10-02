"use client";

/**
 * MotionProvider — single mount point for RAF + Lenis + reduced-motion.
 *
 * Plan §8 / §13 Phase 3:
 *   - Bootstraps the shared gsap.ticker-based RAF loop once.
 *   - Instantiates Lenis with `autoRaf: false` and feeds it from the
 *     shared ticker at priority 0 (scroll position must settle before
 *     anything scroll-dependent ticks).
 *   - Respects prefers-reduced-motion: when true, Lenis is not mounted
 *     and native scrolling is used (which honors OS momentum, iOS pull-
 *     to-refresh, and all reduced-motion CSS overrides).
 *   - Re-runs the Lenis lifecycle when the user toggles reduced-motion
 *     at runtime (destroy → null | recreate).
 *
 * Wheel, trackpad and touch input stay native. Lenis still animates explicit
 * anchor navigation, but continuous input does not wait for the JS ticker
 * or add a second easing curve to the operating system's momentum.
 */

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { type ReactNode, useEffect, useState } from "react";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MotionContext } from "@/lib/motion/context";
import { bootstrap, subscribe, teardown } from "@/lib/raf";

type MotionProviderProps = {
  children: ReactNode;
};

export function MotionProvider({ children }: MotionProviderProps) {
  const reducedMotion = useReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    document.documentElement.dataset.motionReady = "true";
    bootstrap();
    return teardown;
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setLenis(null);
      return;
    }

    const instance = new Lenis({
      autoRaf: false,
      syncTouch: false,
      smoothWheel: false,
    });

    const unsubscribe = subscribe((_delta, elapsed) => {
      instance.raf(elapsed);
    }, 0);

    setLenis(instance);

    return () => {
      unsubscribe();
      instance.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  return <MotionContext.Provider value={{ lenis }}>{children}</MotionContext.Provider>;
}
