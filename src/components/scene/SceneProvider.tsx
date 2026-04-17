"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import type { GPUTier, TierConfig } from "@/lib/gpu";
import { SceneCanvas } from "./Canvas";
import { FluidSim } from "./FluidSim";
import { StaticFallback } from "./StaticFallback";

type SceneContextValue = {
  tier: GPUTier;
  config: TierConfig | null;
};

const SceneContext = createContext<SceneContextValue>({
  tier: "static",
  config: null,
});

export function useScene() {
  return useContext(SceneContext);
}

type SceneProviderProps = {
  children: ReactNode;
};

export function SceneProvider({ children }: SceneProviderProps) {
  const reducedMotion = useReducedMotion();
  const { capability, initProbe, recordFrametime } = useGPUCapability();

  const isStatic = reducedMotion || capability.tier === "static";

  return (
    <SceneContext.Provider value={{ tier: capability.tier, config: capability.config }}>
      {isStatic ? (
        <StaticFallback />
      ) : (
        <SceneCanvas>
          <FluidSim
            config={capability.config!}
            measuring={capability.measuring}
            onGLReady={initProbe}
            onFrametime={recordFrametime}
          />
        </SceneCanvas>
      )}
      {children}
    </SceneContext.Provider>
  );
}
