import { create } from "zustand";

/**
 * Persistent root <SceneCanvas> visibility toggle.
 *
 * The hero fluid sim's R3F Canvas is mounted in `[locale]/layout.tsx`
 * and runs across every page (Phase 9 — sim runs everywhere, no IO
 * pause). Playground experiment routes (`/playground/[slug]`) need
 * a clean stage for their own dedicated WebGL contexts, so each
 * experiment route's layout flips this flag on mount → SceneProvider
 * removes the root Canvas from the DOM tree (display:none would still
 * burn GPU on the orchestrator's RAF tick; we full-unmount instead).
 *
 * Why a store and not React context: the Canvas lives several layers
 * up the tree from the route segment that wants to hide it, and
 * passing a setter through context across the locale → playground →
 * slug layout boundary forces every intermediate to be a client
 * component. A 12-line store is cheaper.
 */
type SceneVisibilityStore = {
  hidden: boolean;
  setHidden: (next: boolean) => void;
};

export const useSceneVisibility = create<SceneVisibilityStore>((set) => ({
  hidden: false,
  setHidden: (next) => set({ hidden: next }),
}));
