import type { ReactNode } from "react";
import { SceneVisibilityGate } from "@/components/playground/SceneVisibilityGate";

/**
 * Legal-page (Datenschutz) layout.
 *
 * Mirrors `impressum/layout.tsx` — mounts SceneVisibilityGate to
 * hide the persistent FluidSim canvas while on this route AND
 * trigger DioramaTrack's pre-unmount ScrollTrigger cleanup so the
 * `removeChild` race doesn't fire on nav from `/` to
 * `/datenschutz`.
 */
export default function DatenschutzLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SceneVisibilityGate />
      {children}
    </>
  );
}
