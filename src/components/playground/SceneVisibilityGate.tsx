"use client";

import { useEffect } from "react";
import { useSceneVisibility } from "@/lib/sceneVisibility";

/**
 * Hides the persistent root <SceneCanvas> while mounted.
 *
 * Used inside `[locale]/playground/[slug]/layout.tsx`. Pure side-effect
 * — renders nothing. Cleanup restores the flag so the home long-scroll
 * gets its hero sim back on back-nav.
 *
 * Why the rAF deferral: this gate mounts inside the SAME React commit
 * that swaps the route from home → /playground/[slug]. Flipping
 * `setHidden(true)` synchronously inside that commit forces
 * `<SceneProvider>` to also unmount the root `<SceneCanvas>` (R3F
 * Canvas + three.js renderer + DOM canvas) in that same commit, on
 * top of the home page tree being deleted. React 19's reconciler
 * walks the deletion tree and R3F's renderer cleanup races with the
 * outer DOM removals — the symptom is `removeChild: The node to be
 * removed is not a child of this node` followed by
 * `THREE.WebGLRenderer: Context Lost` spam in the dev console.
 *
 * Deferring the store flip by one rAF tick splits this into two
 * commits: commit 1 swaps the route (SceneCanvas still mounted), then
 * the rAF callback fires `setHidden(true)` → commit 2 unmounts
 * SceneCanvas alone. Same UX (SceneCanvas is invisible behind the
 * full-screen experiment and all under the still-animating ink-wipe
 * overlay during this ~16ms window), no race.
 *
 * Mirror-fix on cleanup so back-nav (experiment → home) doesn't
 * re-introduce the same race in the opposite direction.
 */
export function SceneVisibilityGate() {
  const setHidden = useSceneVisibility((s) => s.setHidden);

  useEffect(() => {
    const showHandle = window.requestAnimationFrame(() => {
      setHidden(true);
    });
    return () => {
      window.cancelAnimationFrame(showHandle);
      window.requestAnimationFrame(() => {
        setHidden(false);
      });
    };
  }, [setHidden]);

  return null;
}
