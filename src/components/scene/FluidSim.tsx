"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { isLoaderComplete } from "@/components/ui/Loader";
import { subscribeToSplats } from "@/lib/fluidBus";
import type { TierConfig } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";
import { FluidOrchestrator, type PointerState } from "./FluidOrchestrator";

type FluidSimProps = {
  config: TierConfig;
  measuring: boolean;
  onGLReady: (gl: WebGL2RenderingContext) => void;
  onFrametime: (ms: number) => void;
};

export function FluidSim({ config, measuring, onGLReady, onFrametime }: FluidSimProps) {
  const { gl, size } = useThree();

  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
  });
  const measuringRef = useRef(measuring);
  measuringRef.current = measuring;
  const onFrametimeRef = useRef(onFrametime);
  onFrametimeRef.current = onFrametime;

  // Mount + config-change: init orchestrator, dispose on cleanup.
  // The `config` dep handles the auto-tuner's tier swap — first effect
  // cleanup (dispose) runs before the next mount (init with new config),
  // which means a separate "if config changed" effect (previously here)
  // would always short-circuit. Single effect = single source of truth
  // for orchestrator lifecycle.
  useEffect(() => {
    const context = gl.getContext() as WebGL2RenderingContext;
    if (!context || !(context instanceof WebGL2RenderingContext)) return;

    onGLReady(context);

    const orchestrator = new FluidOrchestrator();
    orchestrator.init(context, config);
    orchestratorRef.current = orchestrator;

    return () => {
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [gl, onGLReady, config]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    orchestratorRef.current?.resize(Math.floor(size.width * dpr), Math.floor(size.height * dpr));
  }, [size, gl]);

  // RAF loop: run sim + render to screen. `measuring` triggers a
  // gl.finish() readback so SceneProvider's tier auto-tuner gets a
  // real GPU frametime sample; outside that window the loop is
  // overhead-free.
  useEffect(() => {
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;

      const dt = Math.min(deltaMs * 0.001, 0.033);
      const t0 = performance.now();

      orchestrator.step(dt, elapsedMs, pointerRef.current);

      if (measuringRef.current) {
        const gl2 = gl.getContext() as WebGL2RenderingContext;
        gl2.finish();
        onFrametimeRef.current(performance.now() - t0);
      }

      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, 15);
  }, [gl]);

  // Pointer events on document — canvas is behind HTML content,
  // so we listen globally to track the cursor everywhere.
  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;

      pointerRef.current.dx = x - pointerRef.current.x;
      pointerRef.current.dy = y - pointerRef.current.y;
      pointerRef.current.x = x;
      pointerRef.current.y = y;
      pointerRef.current.moved = true;
    };

    const onDown = () => {
      pointerRef.current.down = true;
    };
    const onUp = () => {
      pointerRef.current.down = false;
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
    };
  }, [gl]);

  // Kick ambient motion AFTER the hero reveal — the hero `OverprintReveal`
  // has a 350ms loader-settle window plus ~1.1s of reveal cadence (per-
  // char stagger + ink fade-in), so we wait ~1500ms after the loader
  // before the 3 ambient wandering points appear. That preserves the
  // start-up dramaturgy (loader → hero text settles → fluid wakes up)
  // and stops the simultaneous "everything moves at once" jank that
  // smothered the smooth open.
  //
  // Guard against race: if the loader already fired before this
  // component mounted, schedule immediately (with the same delay).
  useEffect(() => {
    const HERO_REVEAL_MS = 1500;
    let timer: number | null = null;

    const scheduleAmbient = () => {
      timer = window.setTimeout(() => {
        orchestratorRef.current?.triggerAmbient();
      }, HERO_REVEAL_MS);
    };

    if (isLoaderComplete()) {
      scheduleAmbient();
      return () => {
        if (timer !== null) window.clearTimeout(timer);
      };
    }

    const onLoaderComplete = () => {
      scheduleAmbient();
    };
    window.addEventListener("loader-complete", onLoaderComplete, { once: true });
    return () => {
      window.removeEventListener("loader-complete", onLoaderComplete);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  // External splat bus — Work-cards (and future callers) dispatch
  // colored bursts via `dispatchSplat()` from src/lib/fluidBus.ts.
  // Splats land in FluidOrchestrator's queue and are drained next step.
  useEffect(() => {
    return subscribeToSplats((req) => {
      orchestratorRef.current?.injectSplat(req.x, req.y, req.color, req.dx ?? 0, req.dy ?? 0);
    });
  }, []);

  return null;
}
