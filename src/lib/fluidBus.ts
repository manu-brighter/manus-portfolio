/**
 * Fluid-bus — typed dispatcher for external splat injection.
 *
 * Cards (e.g. Work-section) need to nudge the global FluidSim without
 * holding a reference to its orchestrator instance (the sim lives in
 * a persistent R3F Canvas at root layout, the cards live deep in
 * page.tsx). This module provides a tiny pub/sub so the dispatch
 * site stays component-local.
 *
 * Coordinates are normalised 0..1, with `y` measured from the bottom
 * of the canvas (the same convention FluidOrchestrator already uses
 * for pointer state). For viewport-relative dispatch helpers see
 * `splatAtViewport()` below.
 */

export type SplatColorName = "rose" | "amber" | "mint" | "violet";

export type SplatRequest = {
  /** 0..1 normalised, origin at canvas bottom-left. */
  x: number;
  /** 0..1 normalised, origin at canvas bottom-left. */
  y: number;
  /** Riso spot-color name OR raw normalised RGB tuple. */
  color: SplatColorName | readonly [number, number, number];
  /** Velocity-x injected into the splat (default 0 = stationary dye dump). */
  dx?: number;
  /** Velocity-y injected into the splat (default 0). */
  dy?: number;
};

type Listener = (req: SplatRequest) => void;

const listeners = new Set<Listener>();

export function subscribeToSplats(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function dispatchSplat(req: SplatRequest): void {
  for (const l of listeners) l(req);
}

/**
 * Convenience wrapper — dispatches a splat at viewport coordinates
 * (CSS pixels, origin top-left), converting to the canvas's normalised
 * space. Use from event handlers where you have `clientX/clientY`.
 */
export function splatAtViewport(
  clientX: number,
  clientY: number,
  color: SplatRequest["color"],
  velocity?: { dx?: number; dy?: number },
): void {
  if (typeof window === "undefined") return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w === 0 || h === 0) return;
  dispatchSplat({
    x: clientX / w,
    y: 1 - clientY / h,
    color,
    dx: velocity?.dx ?? 0,
    dy: velocity?.dy ?? 0,
  });
}
