"use client";

import { Component, createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { GPUTier, TierConfig } from "@/lib/gpu";
import { isLoaderComplete, subscribeToLoaderComplete } from "@/lib/loaderSession";
import { useSceneVisibilityStore } from "@/lib/sceneVisibilityStore";
import { AmbientVideo } from "./AmbientVideo";
import { FluidSim } from "./FluidSim";
import { SceneCanvas } from "./SceneCanvas";
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

  // Coarse-pointer (mobile/touch) plays a pre-recorded loop video
  // instead of running the WebGL pipeline live. iOS Safari was
  // culling the position:fixed WebGL layer during momentum scroll
  // (visible blink); <video> elements use the platform media
  // compositor which handles scroll without cull. Trade-off is
  // mobile loses pointer-driven sim interactivity, but that was
  // already disabled on coarse-pointer per earlier UX decisions.
  // Initial state must match SSR (false — no window). The effect
  // below flips it on mount; one-frame mismatch is invisible since
  // the whole scene is gated on `canvasMounted` for the deferred
  // mount path anyway.
  //
  // The `?record-bg` query param (consumed by AmbientRecorder)
  // bypasses the coarse-pointer branch — recording requires the
  // live WebGL canvas to be present. Lets Manuel record at mobile-
  // portrait viewport via DevTools resize without DevTools also
  // flipping pointer:coarse and routing to the video path.
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("record-bg")) {
      setIsCoarsePointer(false);
      return;
    }
    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
  }, []);

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
        // Mobile / coarse-pointer: pre-recorded video loop instead of
        // live WebGL. Video element survives iOS Safari's tile-
        // compositor cull during momentum scroll where the WebGL
        // canvas does not.
        <AmbientVideo />
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
