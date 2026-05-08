import type { ReactNode } from "react";
import { SceneVisibilityGate } from "@/components/playground/SceneVisibilityGate";
import { HideScrollbar } from "@/components/ui/HideScrollbar";

/**
 * Legal-page (Impressum) layout.
 *
 * Mounts SceneVisibilityGate so that:
 *   1. The persistent root FluidSim canvas is hidden while on this
 *      route (otherwise the canvas covers the legal content with
 *      its transparent surface — visible as "page is empty except
 *      for ink").
 *   2. DioramaTrack listens for sceneHidden and pre-emptively kills
 *      its ScrollTrigger before React commits the unmount, avoiding
 *      the NotFoundError: removeChild race that fires on nav from
 *      `/` to `/impressum`.
 *
 * Same pattern as `playground/[slug]/layout.tsx`.
 */
export default function ImpressumLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SceneVisibilityGate />
      <HideScrollbar />
      {children}
    </>
  );
}
