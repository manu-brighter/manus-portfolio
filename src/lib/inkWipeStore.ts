import { create } from "zustand";
import type { SpotColor } from "@/lib/content/playground";

/**
 * Page-transition state machine for the Fluid-Ink-Wipe primitive.
 *
 * Lifecycle:
 *   idle → growing (~GROW_MS, ink expands from click point)
 *        → covered (~HOLD_MS, ink fully covers screen — route swap
 *                   happens during this window)
 *        → retracting (~RETRACT_MS, ink retreats to invisible)
 *        → idle
 *
 * Only home → /playground/[slug] uses this in Sprint 5; back-nav stays
 * instant (browser default). The store is also reset to idle on
 * unmount-of-overlay as a safety, so a hot-reload mid-transition can't
 * leave the app stuck in a covered state.
 *
 * Why a store and not React state in the overlay component:
 * the click handler lives in PlaygroundCard (deep in the tree) and the
 * destination route's mount-effect lives wherever ExperimentRouter
 * mounts. Lifting the state up through a context provider means
 * threading it through every intermediate; a Zustand store is one
 * import per consumer.
 */

export const GROW_MS = 420;
export const HOLD_MS = 120;
export const RETRACT_MS = 520;

export type InkWipePhase = "idle" | "growing" | "covered" | "retracting";

type InkWipeState = {
  phase: InkWipePhase;
  /** Normalised click position (0..1), origin at top-left of viewport
   *  — overlay shader flips Y as needed. */
  clickX: number;
  clickY: number;
  /** Riso spot key for the ink — typically the destination card's
   *  cardSpot so the wipe carries the destination's colour identity. */
  color: SpotColor;
  /** Wall-clock ms when the current phase started. The overlay reads
   *  this each frame to compute phase progress (0..1). */
  phaseStartedAt: number;
};

type InkWipeActions = {
  startGrow: (args: { x: number; y: number; color: SpotColor }) => void;
  markCovered: () => void;
  startRetract: () => void;
  reset: () => void;
};

const INITIAL: InkWipeState = {
  phase: "idle",
  clickX: 0.5,
  clickY: 0.5,
  color: "rose",
  phaseStartedAt: 0,
};

export const useInkWipeStore = create<InkWipeState & InkWipeActions>((set) => ({
  ...INITIAL,
  startGrow: ({ x, y, color }) =>
    set({ phase: "growing", clickX: x, clickY: y, color, phaseStartedAt: performance.now() }),
  markCovered: () => set({ phase: "covered", phaseStartedAt: performance.now() }),
  startRetract: () => set({ phase: "retracting", phaseStartedAt: performance.now() }),
  reset: () => set({ phase: "idle", phaseStartedAt: 0 }),
}));
