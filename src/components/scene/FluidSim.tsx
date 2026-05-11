"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
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

  // Coarse-pointer (mobile/touch) disables sim interactivity. The hero
  // showcase moves to playgrounds; on the long-scroll only ambient
  // wandering points run. Pointer listeners aren't attached at all so
  // touch-scroll doesn't fight pointermove polyfills, and the orchestrator
  // is told explicitly via setPointerSplatEnabled(false) as a safety net.
  // Lazy-init useState so the value is computed synchronously during the
  // first render — must be available before the orchestrator init effect
  // reads it on the same commit.
  const [isCoarsePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  // Mount + config-change: init orchestrator, dispose on cleanup,
  // and schedule the ambient warmup-trigger inline so the trigger is
  // always tied to the orchestrator that's currently alive.
  //
  // The `config` dep handles the auto-tuner's tier swap. Previously
  // `triggerAmbient` was scheduled in a separate `[]` effect that
  // didn't re-run on config change, which created a race: if the
  // setTimeout fired between `setCapability(new tier)` and the React
  // commit that disposes the old orchestrator + creates the new one,
  // `triggerAmbient` ran on the about-to-be-disposed orchestrator
  // → new orchestrator stayed at warmup-gate-closed → sim never woke
  // → only fixed by a full page reload (cached tier, no swap, no
  // re-init). Coupling the trigger to the orchestrator's own effect
  // lifecycle means every fresh-init schedules a fresh trigger.
  useEffect(() => {
    const context = gl.getContext() as WebGL2RenderingContext;
    if (!context || !(context instanceof WebGL2RenderingContext)) return;

    onGLReady(context);

    const orchestrator = new FluidOrchestrator();
    orchestrator.init(context, config);
    if (isCoarsePointer) {
      orchestrator.setPointerSplatEnabled(false);
    }
    orchestratorRef.current = orchestrator;

    // Ambient warmup-trigger — short residual settle (~100ms) after
    // init. The long wait (matching the loader+hero-reveal cadence)
    // already lives in SceneProvider's deferred-mount path.
    const HERO_REVEAL_MS = 100;
    let ambientTimer: number | null = null;
    let ambientListener: (() => void) | null = null;
    const scheduleAmbient = () => {
      ambientTimer = window.setTimeout(() => {
        orchestratorRef.current?.triggerAmbient();
      }, HERO_REVEAL_MS);
    };
    if (isLoaderComplete()) {
      scheduleAmbient();
    } else {
      ambientListener = () => scheduleAmbient();
      window.addEventListener("loader-complete", ambientListener, { once: true });
    }

    return () => {
      if (ambientTimer !== null) window.clearTimeout(ambientTimer);
      if (ambientListener) {
        window.removeEventListener("loader-complete", ambientListener);
      }
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [gl, onGLReady, config, isCoarsePointer]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    orchestratorRef.current?.resize(Math.floor(size.width * dpr), Math.floor(size.height * dpr));
  }, [size, gl]);

  // RAF loop: run sim + render to screen. `measuring` triggers a
  // gl.finish() readback so SceneProvider's tier auto-tuner gets a
  // real GPU frametime sample; outside that window the loop is
  // overhead-free.
  //
  // step() is always called so render-toon paints paper-color + grain
  // (the orchestrator short-circuits sim passes internally while the
  // warmup gate is closed — see `step()`). The measuring path however
  // is gated on `isStarted()` because frametime samples taken during
  // the warmup window only capture render-toon (~1ms) and would
  // mis-tier first-time visitors as `high`.
  useEffect(() => {
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;

      const dt = Math.min(deltaMs * 0.001, 0.033);
      const t0 = performance.now();

      orchestrator.step(dt, elapsedMs, pointerRef.current);

      if (measuringRef.current && orchestrator.isStarted()) {
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
  // so we listen globally to track the cursor everywhere. Skipped
  // entirely on coarse-pointer: iOS Safari fires pointermove during
  // momentum scroll and each event runs getBoundingClientRect, which
  // contributed to the scroll-time stutter Manuel reported. Mobile
  // sim is ambient-only; interaction lives in the playground routes.
  useEffect(() => {
    if (isCoarsePointer) return;

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
  }, [gl, isCoarsePointer]);

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
