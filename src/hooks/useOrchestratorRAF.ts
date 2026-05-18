"use client";

/**
 * Shared RAF subscriber for `FluidOrchestrator` consumers.
 *
 * Encapsulates the subscribe + dt-cap + pointer-reset block that was
 * duplicated verbatim across 4 sites (InkDropStudio, TypeAsFluid,
 * InkDropMiniSim, TypeAsFluidMiniSim). Each tick:
 *   1. read `orchestratorRef.current`; bail if null (component
 *      unmounted between subscribe and tick)
 *   2. clamp deltaMs against `MAX_DT_S` so a tab-resume doesn't smear
 *      the sim
 *   3. call `orchestrator.step(dt, elapsedMs, pointer)`
 *   4. zero out pointer.dx/dy/moved so the next tick only sees real
 *     deltas
 *
 * `FluidSim.tsx` keeps its own inline subscriber because of the tier
 * auto-tune measuring path (`gl.finish()` readback + `onFrametime`
 * callback) — generalising the hook to cover that would balloon its
 * signature for one caller.
 *
 * `enabled` defaults to true; pass false to skip subscription on
 * reduced-motion or while the orchestrator hasn't been built yet.
 */

import type { RefObject } from "react";
import { useEffect } from "react";
import type { FluidOrchestrator, PointerState } from "@/lib/gl/fluidOrchestrator";
import { MAX_DT_S, subscribe } from "@/lib/raf";

export function useOrchestratorRAF(
  // RefObject (not MutableRefObject) — React 19 deprecated the latter in
  // favour of `RefObject<T | null>` for the standard `useRef<T>(null)`
  // pattern. Both are mutable at runtime; the new type just better
  // reflects that initialisation via `useRef<T>(null)` is the canonical
  // shape and the .current slot is freely assignable.
  orchestratorRef: RefObject<FluidOrchestrator | null>,
  pointerRef: RefObject<PointerState>,
  priority = 50,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const dt = Math.min(deltaMs * 0.001, MAX_DT_S);
      orchestrator.step(dt, elapsedMs, pointerRef.current);
      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, priority);
  }, [orchestratorRef, pointerRef, priority, enabled]);
}
