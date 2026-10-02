"use client";

import dynamic from "next/dynamic";
import {
  Component,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useInkPreview } from "@/hooks/useInkPreview";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { type GPUTier, getTierDPR, matchRenderer, type TierConfig } from "@/lib/gpu";
import type { InkPreference } from "@/lib/inkPreview";
import { subscribeToLoaderComplete } from "@/lib/loaderSession";
import { useSceneVisibilityStore } from "@/lib/sceneVisibilityStore";
import { FluidSim } from "./FluidSim";
import { SceneCanvas } from "./SceneCanvas";
import { StaticFallback } from "./StaticFallback";

const MobileBackgroundSim = dynamic(
  () => import("./MobileBackgroundSim").then((m) => m.MobileBackgroundSim),
  { ssr: false },
);
const LiteInkScene = dynamic(() => import("./LiteInkScene").then((m) => m.LiteInkScene), {
  ssr: false,
});

type SceneContextValue = {
  tier: GPUTier;
  config: TierConfig | null;
  effectsReduced: boolean;
  inkPreference: InkPreference;
  selectInk: (preference: InkPreference) => void;
  automaticallyReduced: boolean;
  inkUnavailable: boolean;
  fullUnavailable: boolean;
  reducedMotion: boolean;
};

const SceneContext = createContext<SceneContextValue>({
  tier: "static",
  config: null,
  effectsReduced: true,
  inkPreference: "auto",
  selectInk: () => {},
  automaticallyReduced: false,
  inkUnavailable: true,
  fullUnavailable: true,
  reducedMotion: false,
});

export function useScene() {
  return useContext(SceneContext);
}

function useWebGL2(onReady: (gl: WebGL2RenderingContext) => void) {
  const [support, setSupport] = useState<{ supported: boolean; hardwareTier: GPUTier | null }>({
    supported: false,
    hardwareTier: null,
  });
  useEffect(() => {
    try {
      // A detached probe is collected naturally. Never poison contexts with loseContext.
      const gl = document.createElement("canvas").getContext("webgl2");
      let hardwareTier: GPUTier | null = null;
      if (gl) {
        const extension = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null;
        hardwareTier = typeof renderer === "string" ? matchRenderer(renderer) : null;
        onReady(gl);
      }
      // Current hardware chooses the mode; cached quality still limits the
      // physics budget. An old low tier must not hide a newly detected RTX.
      setSupport({ supported: gl !== null, hardwareTier });
    } catch {
      setSupport({ supported: false, hardwareTier: null });
    }
  }, [onReady]);
  return support;
}

type EBProps = { fallback: ReactNode; children: ReactNode; onUnavailable: () => void };
class SceneErrorBoundary extends Component<EBProps, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // biome-ignore lint/suspicious/noConsole: renderer failure is a real-user diagnostic
    console.error("[SceneErrorBoundary]", error, info);
    this.props.onUnavailable();
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const { capability, initProbe, recordFrametime } = useGPUCapability();
  const { supported: webgl2, hardwareTier } = useWebGL2(initProbe);
  const rawCoarsePointer = useCoarsePointer();
  const sceneHidden = useSceneVisibilityStore((s) => s.hidden);
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [liteUnavailable, setLiteUnavailable] = useState(false);
  const [fullFailed, setFullFailed] = useState(false);
  const fullUnavailable = reducedMotion || !webgl2 || !capability.config || fullFailed;
  const preview = useInkPreview(
    reducedMotion || sceneHidden || !webgl2 || !canvasMounted || liteUnavailable,
    !rawCoarsePointer && (hardwareTier ?? capability.tier) === "high" && !fullUnavailable,
  );
  const handleLiteUnavailable = useCallback(() => setLiteUnavailable(true), []);
  const handleFullUnavailable = useCallback(() => setFullFailed(true), []);
  const [recordOverride, setRecordOverride] = useState(false);
  useEffect(() => {
    setRecordOverride(new URLSearchParams(window.location.search).has("record-bg"));
  }, []);
  const isCoarsePointer = !recordOverride && rawCoarsePointer;

  useEffect(() => {
    if (!preview.ready || canvasMounted) return;
    let timer: number | undefined;
    const unsubscribe = subscribeToLoaderComplete(() => {
      timer = window.setTimeout(() => setCanvasMounted(true), preview.light ? 250 : 1700);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [preview.ready, preview.light, canvasMounted]);

  // A cached physics tier does not describe Lite's single-pass requirements.
  const inkUnavailable =
    reducedMotion || !webgl2 || (preview.light ? liteUnavailable : fullUnavailable);
  const config = capability.config;

  return (
    <SceneContext.Provider
      value={{
        tier: capability.tier,
        config,
        effectsReduced: preview.light || inkUnavailable,
        inkPreference: preview.preference,
        selectInk: preview.select,
        automaticallyReduced: preview.automaticallyReduced,
        inkUnavailable,
        fullUnavailable,
        reducedMotion,
      }}
    >
      {sceneHidden ? null : inkUnavailable ? (
        <StaticFallback />
      ) : !canvasMounted || !preview.ready ? null : preview.light ? (
        <SceneErrorBoundary
          key="light"
          fallback={<StaticFallback />}
          onUnavailable={handleLiteUnavailable}
        >
          <LiteInkScene
            reducedQuality={preview.automaticallyReduced}
            onUnavailable={handleLiteUnavailable}
          />
        </SceneErrorBoundary>
      ) : config && isCoarsePointer ? (
        <SceneErrorBoundary
          key="full-mobile"
          fallback={<StaticFallback />}
          onUnavailable={handleFullUnavailable}
        >
          <MobileBackgroundSim
            onUnavailable={handleFullUnavailable}
            config={config}
            measuring={capability.measuring}
            onGLReady={initProbe}
            onFrametime={recordFrametime}
          />
        </SceneErrorBoundary>
      ) : config ? (
        <SceneErrorBoundary
          key="full-desktop"
          fallback={<StaticFallback />}
          onUnavailable={handleFullUnavailable}
        >
          <SceneCanvas maxDpr={getTierDPR(capability.tier)}>
            <FluidSim
              config={config}
              measuring={capability.measuring}
              onGLReady={initProbe}
              onFrametime={recordFrametime}
            />
          </SceneCanvas>
        </SceneErrorBoundary>
      ) : (
        <StaticFallback />
      )}
      {children}
    </SceneContext.Provider>
  );
}
