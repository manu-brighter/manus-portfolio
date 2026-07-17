import type { ReactNode } from "react";
import { SceneVisibilityGate } from "@/components/scene/SceneVisibilityGate";
import { HideScrollbar } from "@/components/ui/HideScrollbar";

/**
 * CV-page layout.
 *
 * Mounts SceneVisibilityGate so the persistent root FluidSim canvas is
 * hidden while on this route and DioramaTrack can kill its
 * ScrollTrigger before the home tree unmounts — same pattern (and same
 * rationale) as `impressum/layout.tsx`. The sheet still follows the
 * active ink character via the `data-sim-theme` token flip; only the
 * live sim stands down.
 */
export default function CvLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SceneVisibilityGate />
      <HideScrollbar />
      {children}
    </>
  );
}
