import type { ReactNode } from "react";
import { SceneVisibilityGate } from "@/components/playground/SceneVisibilityGate";

/**
 * Playground experiment layout.
 *
 * Mounts a client-only gate that flips the scene-visibility store on
 * mount → SceneProvider unmounts the root <SceneCanvas> for the
 * duration of the experiment route, freeing the GPU for the
 * experiment's dedicated WebGL context. On unmount (back-nav to
 * home), the flag clears and the persistent canvas remounts.
 *
 * The chrome (back-link, title bar, Leva mount) lives in each
 * experiment's own component, not here — different experiments may
 * want different chrome density (Type-as-Fluid has an input bar; Ink
 * Drop Studio has a full Leva panel).
 */
export default function PlaygroundExperimentLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SceneVisibilityGate />
      {children}
    </>
  );
}
