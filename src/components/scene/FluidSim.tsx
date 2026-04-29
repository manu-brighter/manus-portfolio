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
  const prevConfigRef = useRef<TierConfig | null>(null);

  // Frametime watchdog state — runs every frame, computes a rolling
  // average over the last 60 samples (~1s at 60fps). If the avg
  // exceeds the 22ms (45fps) floor for 2s straight, perfMode latches
  // on and the IO further down throttles the sim to the priority
  // sections only. Sticky for the session — we don't oscillate.
  const perfModeRef = useRef(false);
  const ftSamplesRef = useRef<number[]>([]);
  const ftOverBudgetMsRef = useRef(0);

  useEffect(() => {
    const context = gl.getContext() as WebGL2RenderingContext;
    if (!context || !(context instanceof WebGL2RenderingContext)) return;

    onGLReady(context);

    const orchestrator = new FluidOrchestrator();
    orchestrator.init(context, config);
    orchestratorRef.current = orchestrator;
    prevConfigRef.current = config;

    return () => {
      orchestrator.dispose();
      orchestratorRef.current = null;
      prevConfigRef.current = null;
    };
  }, [gl, onGLReady, config]);

  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator || config === prevConfigRef.current) return;

    const context = gl.getContext() as WebGL2RenderingContext;
    orchestrator.dispose();
    orchestrator.init(context, config);
    prevConfigRef.current = config;
  }, [config, gl]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    orchestratorRef.current?.resize(Math.floor(size.width * dpr), Math.floor(size.height * dpr));
  }, [size, gl]);

  // RAF loop: run sim + render to screen, and feed the perf-mode
  // watchdog with a cheap frametime estimate (no gl.finish() — that
  // would itself cost frames; the deltaMs from gsap.ticker is the
  // pragmatic signal).
  useEffect(() => {
    const samples = ftSamplesRef.current;
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

      // Watchdog: track recent deltaMs (which is wall-clock between
      // ticks — drops indicate the page can't sustain 60fps).
      if (!perfModeRef.current && deltaMs > 0) {
        samples.push(deltaMs);
        if (samples.length > 60) samples.shift();
        if (samples.length === 60) {
          const avg = samples.reduce((s, v) => s + v, 0) / 60;
          if (avg > 22) {
            ftOverBudgetMsRef.current += deltaMs;
            if (ftOverBudgetMsRef.current > 2000) perfModeRef.current = true;
          } else {
            ftOverBudgetMsRef.current = Math.max(0, ftOverBudgetMsRef.current - deltaMs);
          }
        }
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

  // Kick ambient motion the moment the loader finishes.
  // Guard against race: if the loader already fired before this
  // component mounted, trigger immediately.
  useEffect(() => {
    if (isLoaderComplete()) {
      orchestratorRef.current?.triggerAmbient();
      return;
    }
    const onLoaderComplete = () => {
      orchestratorRef.current?.triggerAmbient();
    };
    window.addEventListener("loader-complete", onLoaderComplete, { once: true });
    return () => window.removeEventListener("loader-complete", onLoaderComplete);
  }, []);

  // External splat bus — Work-cards (and future callers) dispatch
  // colored bursts via `dispatchSplat()` from src/lib/fluidBus.ts.
  // Splats land in FluidOrchestrator's queue and are drained next step.
  useEffect(() => {
    return subscribeToSplats((req) => {
      orchestratorRef.current?.injectSplat(req.x, req.y, req.color, req.dx ?? 0, req.dy ?? 0);
    });
  }, []);

  // Adaptive sim lifecycle (Phase 9 rework — see CLAUDE.md "Phase 9
  // deviations"). Default behaviour: sim runs everywhere, no IO pause.
  // A frametime watchdog samples the RAF loop's GPU work and only
  // engages a "perf-mode" pause if the device is genuinely struggling
  // (rolling avg > 22ms over a 2s window). Once perf-mode is on for
  // the session, the sim pauses while no priority section is in
  // viewport (hero or photography — both consume the fluid visually).
  useEffect(() => {
    const PRIORITY_IDS = ["hero", "photography"];
    const observer = new IntersectionObserver(
      () => {
        if (!perfModeRef.current) return; // not gating the sim yet
        const anyVisible = PRIORITY_IDS.some((id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight;
        });
        if (anyVisible) orchestratorRef.current?.resume();
        else orchestratorRef.current?.pause();
      },
      { threshold: 0 },
    );

    for (const id of PRIORITY_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
