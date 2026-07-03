"use client";

import { useEffect } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useLenis } from "@/hooks/useLenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dispatchSplat } from "@/lib/fluidBus";
import { subscribe } from "@/lib/raf";
import { useSceneVisibilityStore } from "@/lib/sceneVisibilityStore";

/**
 * ScrollInkCoupling — fast scrolling drags the existing ink along.
 *
 * Watches Lenis velocity on the shared RAF (priority 10, post-Lenis).
 * On fast flicks it dispatches an INVISIBLE whole-canvas force splat:
 * color [0,0,0] deposits zero dye (the dye pass adds nothing), while
 * the velocity pass pushes the ink already on screen in the scroll
 * direction — the ink feels attached to the page. No dots, no new
 * color, no edge artefacts (the first cut injected visible splats at
 * the scroll edge and read as noise).
 *
 * Safety properties:
 *   - `useLenis()` returns null under reduced motion → effect no-ops.
 *   - Splats go through fluidBus → the orchestrator's pending queue,
 *     which is drained-and-dropped while the warmup gate is closed,
 *     so loader-window scrolling can't leak into the hero reveal.
 *   - Throttled to one force splat per MIN_INTERVAL_MS (~8/s worst
 *     case, 2 draw passes each) — negligible.
 *   - Gated to the live desktop sim path; renders nothing, listeners
 *     never attach on mobile/static/video paths.
 */

/** |lenis.velocity| (px/frame-ish) below this never fires. */
const VELOCITY_THRESHOLD = 14;
/** Min gap between injections. */
const MIN_INTERVAL_MS = 120;
/** Velocity → drift force conversion (velocityScale multiplies ~10x
 *  in the splat shader, so this stays small). */
const VELOCITY_TO_FORCE = 0.008;
/** Drift force cap. */
const MAX_FORCE = 0.5;
/** Whole-canvas soft force field. */
const FORCE_RADIUS = 1.2;
/** Zero dye — pure velocity injection. */
const NO_DYE: readonly [number, number, number] = [0, 0, 0];

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
        x: 0.5,
        y: 0.5,
        color: NO_DYE,
        dx: 0,
        // y origin is canvas-bottom: scroll-down (v > 0) moves content
        // up, so the ink drifts up with it; scroll-up mirrors.
        dy: velocity > 0 ? force : -force,
        radius: FORCE_RADIUS,
      });
    }, 10);

    return unsubscribe;
  }, [lenis, config, reducedMotion, coarsePointer, sceneHidden]);

  return null;
}
