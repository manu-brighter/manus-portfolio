"use client";

import { Component, createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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

function probeWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    return gl !== null;
  } catch {
    return false;
  }
}

function useWebGL2(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(probeWebGL2());
  }, []);
  return supported;
}

type EBProps = { fallback: ReactNode; children: ReactNode };
type EBState = { hasError: boolean };

class SceneErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

type SceneProviderProps = {
  children: ReactNode;
};

export function SceneProvider({ children }: SceneProviderProps) {
  const reducedMotion = useReducedMotion();
  const { capability, initProbe, recordFrametime } = useGPUCapability();
  const webgl2 = useWebGL2();

  const isStatic = reducedMotion || capability.tier === "static" || !webgl2;
  const config = capability.config;

  return (
    <SceneContext.Provider value={{ tier: capability.tier, config }}>
      {isStatic || !config ? (
        <StaticFallback />
      ) : (
        <SceneErrorBoundary fallback={<StaticFallback />}>
          <SceneCanvas>
            <FluidSim
              config={config}
              measuring={capability.measuring}
              onGLReady={initProbe}
              onFrametime={recordFrametime}
            />
          </SceneCanvas>
        </SceneErrorBoundary>
      )}
      {children}
    </SceneContext.Provider>
  );
}
