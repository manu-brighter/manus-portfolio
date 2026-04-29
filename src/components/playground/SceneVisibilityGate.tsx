"use client";

import { useEffect } from "react";
import { useSceneVisibility } from "@/lib/sceneVisibility";

/**
 * Hides the persistent root <SceneCanvas> while mounted.
 *
 * Used inside `[locale]/playground/[slug]/layout.tsx`. Pure side-effect
 * — renders nothing. Cleanup restores the flag so the home long-scroll
 * gets its hero sim back on back-nav.
 */
export function SceneVisibilityGate() {
  const setHidden = useSceneVisibility((s) => s.setHidden);

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  return null;
}
