"use client";

import { Component, createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { GPUTier, TierConfig } from "@/lib/gpu";
import { useSceneVisibility } from "@/lib/sceneVisibility";
import { isLoaderComplete } from "../ui/Loader";
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
  // Playground experiment routes flip this to true so the root Canvas
  // unmounts and a per-experiment WebGL context can own the screen
  // without competing for GPU time. Stays false on the home long-scroll.
  const sceneHidden = useSceneVisibility((s) => s.hidden);

  // Universal SceneCanvas defer: the WebGL2 context creation, 9 shader
  // program compilations, FBO allocation, and the first per-frame
  // render-toon dispatch all compete with the loader animation + hero
  // reveal for GPU time on every device — mobile especially, but also
  // measurable on mid-range desktop GPUs. The body bg is already
  // `--color-paper`, identical to what render-toon paints with empty
  // dye, so deferring the mount has zero visual cost: no flash when
  // the canvas appears later.
  //
  // Two defer windows:
  //   • FRESH_LOAD_DEFER (1700ms) — loader played, ambient should land
  //     after the OverprintReveal hero choreography completes
  //   • RETURNING_DEFER (200ms) — loader skipped (sessionStorage flag
  //     fires loader-complete immediately on locale-switch / repeat
  //     visit). Just enough time for hydration to settle.
  const [canvasMounted, setCanvasMounted] = useState(false);

  useEffect(() => {
    if (canvasMounted) return;
    const FRESH_LOAD_DEFER = 1700;
    const RETURNING_DEFER = 200;
    let timer: number | null = null;

    if (isLoaderComplete()) {
      timer = window.setTimeout(() => setCanvasMounted(true), RETURNING_DEFER);
      return () => {
        if (timer !== null) window.clearTimeout(timer);
      };
    }

    const onLoaderComplete = () => {
      timer = window.setTimeout(() => setCanvasMounted(true), FRESH_LOAD_DEFER);
    };
    window.addEventListener("loader-complete", onLoaderComplete, { once: true });
    return () => {
      window.removeEventListener("loader-complete", onLoaderComplete);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [canvasMounted]);

  const isStatic = reducedMotion || capability.tier === "static" || !webgl2;
  const config = capability.config;

  return (
    <SceneContext.Provider value={{ tier: capability.tier, config }}>
      {sceneHidden ? null : isStatic || !config ? (
        // Static fallback (reduced-motion / static tier / no-WebGL2) renders
        // immediately — no GPU cost to defer. Only the WebGL Canvas path
        // is gated on `canvasMounted` to skip mobile first-paint contention.
        <StaticFallback />
      ) : !canvasMounted ? null : (
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
