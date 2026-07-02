"use client";

import { useEffect } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useLenis } from "@/hooks/useLenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dispatchSplat } from "@/lib/fluidBus";
import { randomSpot } from "@/lib/palette";
import { subscribe } from "@/lib/raf";
import { useSceneVisibilityStore } from "@/lib/sceneVisibilityStore";

/**
 * ScrollInkCoupling — fast scrolling churns the background ink.
 *
 * Watches Lenis velocity on the shared RAF (priority 10, post-Lenis)
 * and injects a throttled directional splat at the scroll edge when
 * the user flicks: scrolling down streaks ink downward from the top
 * edge (opposite to content travel — the page "drags through" the
 * ink), scrolling up mirrors from the bottom. Slow reading-speed
 * scrolling stays below the threshold and never fires.
 *
 * Safety properties:
 *   - `useLenis()` returns null under reduced motion → effect no-ops.
 *   - Splats go through fluidBus → the orchestrator's pending queue,
 *     which is drained-and-dropped while the warmup gate is closed,
 *     so loader-window scrolling can't leak into the hero reveal.
 *   - Throttled to one small splat per MIN_INTERVAL_MS (~11/s worst
 *     case) — negligible against the ambient rig's per-frame splats.
 *   - Gated to the live desktop sim path (same conditions as the
 *     preset switcher); renders nothing, listeners never attach on
 *     mobile/static/video paths.
 */

/** |lenis.velocity| (px/frame-ish) below this never fires. */
const VELOCITY_THRESHOLD = 14;
/** Min gap between injections. */
const MIN_INTERVAL_MS = 90;
/** Velocity → splat force conversion. */
const VELOCITY_TO_FORCE = 0.02;
/** Force cap — matches the Work-card burst magnitude (~1.2). */
const MAX_FORCE = 1.2;

export function ScrollInkCoupling() {
  const lenis = useLenis();
  const { config } = useScene();
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const sceneHidden = useSceneVisibilityStore((s) => s.hidden);

  useEffect(() => {
    if (!lenis || !config || reducedMotion || coarsePointer || sceneHidden) return;

    let lastInjectMs = 0;
    const unsubscribe = subscribe((_deltaMs, elapsedMs) => {
      const velocity = lenis.velocity;
      if (Math.abs(velocity) < VELOCITY_THRESHOLD) return;
      if (elapsedMs - lastInjectMs < MIN_INTERVAL_MS) return;
      lastInjectMs = elapsedMs;

      const force = Math.min(Math.abs(velocity) * VELOCITY_TO_FORCE, MAX_FORCE);
      dispatchSplat({
        x: 0.15 + Math.random() * 0.7,
        // y origin is canvas-bottom: scroll-down spawns at the top
        // edge streaking down, scroll-up mirrors from the bottom.
        y: velocity > 0 ? 0.9 : 0.1,
        color: randomSpot(),
        dx: (Math.random() - 0.5) * 0.3,
        dy: velocity > 0 ? -force : force,
      });
    }, 10);

    return unsubscribe;
  }, [lenis, config, reducedMotion, coarsePointer, sceneHidden]);

  return null;
}
