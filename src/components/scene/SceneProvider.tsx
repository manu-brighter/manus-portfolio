"use client";

import dynamic from "next/dynamic";
import { Component, createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { GPUTier, TierConfig } from "@/lib/gpu";
import { isLoaderComplete, subscribeToLoaderComplete } from "@/lib/loaderSession";
import { useSceneVisibilityStore } from "@/lib/sceneVisibilityStore";
import { FluidSim } from "./FluidSim";
import { SceneCanvas } from "./SceneCanvas";
import { StaticFallback } from "./StaticFallback";

// Mobile-phone background sim — dynamic + ssr:false so the Desktop bundle
// stays free of the orchestrator wiring (Desktop uses SceneCanvas + FluidSim).
const MobileBackgroundSim = dynamic(
  () => import("./MobileBackgroundSim").then((m) => m.MobileBackgroundSim),
  { ssr: false },
);

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
  // The detached probe canvas is GC'd naturally once `supported` is
  // recorded. Don't call `WEBGL_lose_context.loseContext()` here — the
  // documented StrictMode trap (see `.claude/CLAUDE.md` "Never do")
  // is that a lost-context canvas surfaces a dead context on the next
  // `getContext()`, which silently fails every shader compile from
  // the React re-mount onward.
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
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
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // biome-ignore lint/suspicious/noConsole: boundary catch is a real-user signal
    console.error("[SceneErrorBoundary]", error, info);
    // When Sentry is wired up: Sentry.captureException(error, { extra: info });
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
  const sceneHidden = useSceneVisibilityStore((s) => s.hidden);

  // Universal SceneCanvas defer: the WebGL2 context creation, 9 shader
  // program compilations, FBO allocation, and the first per-frame
  // render-pass dispatch all compete with the loader animation + hero
  // reveal for GPU time on every device — mobile especially, but also
  // measurable on mid-range desktop GPUs. The body bg is already
  // `--color-paper`, identical to what the render pass paints with empty
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

  // Coarse-pointer (mobile/touch) runs the live MobileBackgroundSim —
  // its scroll-drain + layer-promotion stack masks the iOS Safari
  // position:fixed WebGL momentum-scroll cull that once forced the
  // pre-recorded <video> fallback (AmbientVideo, retired: an 8MB
  // asset with none of the preset/theme coupling).
  //
  // The `?record-bg` query param (consumed by AmbientRecorder)
  // bypasses the coarse-pointer branch — recording captures the
  // Desktop SceneCanvas. Lets Manuel record at mobile-portrait
  // viewport via DevTools resize without DevTools also flipping
  // pointer:coarse and routing to the mobile sim.
  const rawCoarsePointer = useCoarsePointer();
  const [recordOverride, setRecordOverride] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setRecordOverride(params.has("record-bg"));
  }, []);
  const isCoarsePointer = recordOverride ? false : rawCoarsePointer;

  // NOTE: useMobileLayout (coarse + < 768) is no longer consulted for
  // scene routing — every coarse-pointer device (phone AND tablet)
  // gets the same MobileBackgroundSim; fine-pointer Desktop gets the
  // live SceneCanvas + FluidSim path. Section-level layout splits
  // still use useMobileLayout independently.

  useEffect(() => {
    if (canvasMounted) return;
    const FRESH_LOAD_DEFER = 1700;
    const RETURNING_DEFER = 200;
    let timer: number | null = null;

    // Capture the loader-complete state at effect-entry so we choose
    // the right defer window. subscribeToLoaderComplete fires the
    // callback synchronously if the loader already finished — that
    // branch wants the short RETURNING_DEFER; the queued branch wants
    // the long FRESH_LOAD_DEFER that lets the hero choreography land
    // before the WebGL canvas elbows into the GPU.
    const wasComplete = isLoaderComplete();
    const unsub = subscribeToLoaderComplete(() => {
      const defer = wasComplete ? RETURNING_DEFER : FRESH_LOAD_DEFER;
      timer = window.setTimeout(() => setCanvasMounted(true), defer);
    });

    return () => {
      unsub();
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
      ) : !canvasMounted ? null : isCoarsePointer ? (
        // Coarse-pointer (phone + tablet): one full-page background sim
        // behind all content. The scroll-drain masks the iOS fixed-WebGL
        // momentum-scroll cull. Gated on `canvasMounted` like Desktop so
        // the WebGL context compiles after the loader, not during it.
        // Same error boundary as Desktop: orchestrator.init() throws on
        // shader-compile failure / missing EXT_color_buffer_float, and
        // older mobile GPUs are the most likely cohort to hit exactly
        // that — degrade to StaticFallback, not a route-level crash.
        <SceneErrorBoundary fallback={<StaticFallback />}>
          <MobileBackgroundSim />
        </SceneErrorBoundary>
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
