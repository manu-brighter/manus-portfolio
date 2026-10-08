"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getSimPreset } from "@/lib/content/simPresets";
import { subscribeToSplats } from "@/lib/fluidBus";
import { compileShader } from "@/lib/gl/compileShader";
import { createProgram } from "@/lib/gl/createProgram";
import { DEFAULT_FLUID_VISUALS, injectIncludes } from "@/lib/gl/fluidOrchestrator";
import { createInkImpulses, pushSplatImpulse } from "@/lib/gl/inkImpulses";
import { inkSheetSpeed, inkSheetStyleIndex } from "@/lib/gl/inkSheet";
import { createInkScrollTracker } from "@/lib/inkScroll";
import { subscribe } from "@/lib/raf";
import { useSimPresetStore } from "@/lib/simPresetStore";
import inkSheetSource from "@/shaders/common/ink-sheet.glsl";
import quadSource from "@/shaders/common/quad.vert.glsl";
import fragmentSource from "@/shaders/ink-lite/render.frag.glsl";
import { StaticFallback } from "./StaticFallback";

const FRAME_MS = 1000 / 60;

/** Single-pass analytic ink with section choreography and bounded resolution. */
export function LiteInkScene({
  onUnavailable,
  onReady,
  reducedQuality = false,
}: {
  onUnavailable: () => void;
  onReady: (ready: boolean) => void;
  reducedQuality?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const qualityRef = useRef(reducedQuality);
  qualityRef.current = reducedQuality;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const pathname = usePathname();
  const refreshSectionsRef = useRef<(() => void) | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies(pathname): rediscover sections after client navigation replaces the page
  useEffect(() => {
    refreshSectionsRef.current?.();
  }, [pathname]);

  useEffect(() => {
    if (failed) onUnavailable();
  }, [failed, onUnavailable]);

  useEffect(() => {
    if (reducedMotion || failed || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      setFailed(true);
      return;
    }
    let vertex: WebGLShader | undefined;
    let fragment: WebGLShader | undefined;
    let program: WebGLProgram | undefined;
    let vao: WebGLVertexArrayObject | null = null;
    try {
      vertex = compileShader(gl, gl.VERTEX_SHADER, quadSource, "lite-ink.vert");
      fragment = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        injectIncludes(fragmentSource, { "ink-sheet": inkSheetSource }),
        "lite-ink.frag",
      );
      program = createProgram(gl, vertex, fragment, "lite-ink");
      vao = gl.createVertexArray();
      if (!vao) throw new Error("lite-ink: createVertexArray failed");
    } catch {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      if (vao) gl.deleteVertexArray(vao);
      setFailed(true);
      return;
    }
    const activeProgram = program;
    const uniform = (name: string) => gl.getUniformLocation(activeProgram, name);
    const uniforms = {
      resolution: uniform("uResolution"),
      time: uniform("uTime"),
      scroll: uniform("uScroll"),
      trail: uniform("uTrail[0]"),
      paper: uniform("uPaper"),
      ladder: uniform("uLadder[0]"),
      style: uniform("uStyle"),
      grain: uniform("uGrain"),
      edge: uniform("uEdge"),
      section: uniform("uSection"),
      impulseCount: uniform("uImpulseCount"),
      impulseShape: uniform("uImpulseShape[0]"),
      impulseDrive: uniform("uImpulseDrive[0]"),
    };
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API method, not a React hook
    gl.useProgram(activeProgram);
    gl.bindVertexArray(vao);
    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const budget = qualityRef.current ? 450000 : 900000;
      const scale = Math.min(1, window.devicePixelRatio || 1, Math.sqrt(budget / (width * height)));
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    };
    let speed = 1;
    let splatRadiusScale = 1;
    let currentQuality = qualityRef.current;
    const ladder = new Float32Array(12);
    const targetLadder = new Float32Array(12);
    let initialized = false;
    const applyPreset = () => {
      const preset = getSimPreset(useSimPresetStore.getState().presetId);
      const visuals = { ...DEFAULT_FLUID_VISUALS, ...preset.visuals };
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API method, not a React hook
      gl.useProgram(activeProgram);
      gl.uniform3fv(uniforms.paper, visuals.paper);
      targetLadder.set(visuals.ladder.flat());
      if (!initialized) ladder.set(targetLadder);
      initialized = true;
      gl.uniform3fv(uniforms.ladder, ladder);
      gl.uniform1i(uniforms.style, inkSheetStyleIndex(visuals.style));
      gl.uniform1f(uniforms.grain, visuals.grainStrength);
      gl.uniform1f(uniforms.edge, visuals.edgeStrength);
      // Shared with the Full renderer's sheet clock (inkSheetSpeed), so
      // both modes run each theme at the same tempo.
      speed = inkSheetSpeed(visuals);
      splatRadiusScale = preset.physics.splatRadiusScale ?? 1;
    };
    resize();
    applyPreset();
    // fluidBus splats (Work cards, object tiles, console burst, Fehldruck)
    // become short ink blooms in the sheet. They anchor at the smoothed
    // scroll the next draw uses, so a bloom lands under its pointer/tile
    // and then rides the sheet's parallax drift, as Full carries its dye.
    const impulses = createInkImpulses();
    let lastScroll = window.scrollY / Math.max(1, window.innerHeight);
    const unsubscribeSplats = subscribeToSplats((req) => {
      pushSplatImpulse(impulses, req, lastScroll, splatRadiusScale);
    });
    const unsubscribePreset = useSimPresetStore.subscribe((current, previous) => {
      if (current.presetId === previous.presetId) return;
      applyPreset();
    });
    // Section quieting + smoothed scroll, shared with the Full renderers.
    const scrollTracker = createInkScrollTracker((id) => {
      if (id === null) delete canvas.dataset.inkSection;
      else canvas.dataset.inkSection = id;
    });
    refreshSectionsRef.current = scrollTracker.refresh;
    const trail = new Float32Array(18);
    let pointerX = 0.5;
    let pointerY = 0.5;
    let energy = 0;
    let pointerKnown = false;
    let lastClientX = 0;
    let lastClientY = 0;
    let movedDistance = 0;
    for (let i = 0; i < 6; i++) {
      trail[i * 3] = pointerX;
      trail[i * 3 + 1] = pointerY;
    }
    // Paint immediately, before the first ticker callback can expose the
    // opaque canvas's default black backing store.
    gl.uniform3fv(uniforms.trail, trail);
    gl.uniform1f(uniforms.section, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    onReadyRef.current(true);
    const pointerMove = (event: PointerEvent) => {
      const distance = pointerKnown
        ? Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY)
        : 0;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      pointerKnown = true;
      // Controls do not stir the background. Keep the last input coordinate
      // current so leaving their edge cannot inject the whole skipped path.
      if (event.target instanceof Element && event.target.closest("[data-no-splat]")) return;
      pointerX = event.clientX / Math.max(1, window.innerWidth);
      pointerY = 1 - event.clientY / Math.max(1, window.innerHeight);
      // Integrate distance, not event count: a 1000Hz mouse must impart the
      // same motion as a 60Hz mouse travelling along the same path.
      movedDistance += distance / Math.max(1, Math.min(window.innerWidth, window.innerHeight));
    };
    let accumulated = FRAME_MS;
    let sinceDraw = 0;
    let lastDrawAt = performance.now();
    let time = 0;
    const visibility = () => {
      accumulated = 0;
      sinceDraw = 0;
      lastDrawAt = performance.now();
      movedDistance = 0;
      pointerKnown = false;
      // A bloom frozen behind a hidden tab would replay stale on return.
      impulses.clear();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    const unsubscribeTick = subscribe((deltaMs) => {
      if (document.hidden || gl.isContextLost()) return;
      if (currentQuality !== qualityRef.current) {
        currentQuality = qualityRef.current;
        resize();
        accumulated = FRAME_MS * 2;
      }
      const frameMs = currentQuality ? FRAME_MS * 2 : FRAME_MS;
      const elapsed = Math.min(Math.max(deltaMs, 0), 50);
      accumulated += elapsed;
      sinceDraw += elapsed;
      if (accumulated + 0.1 < frameMs) return;
      const dt = Math.min(sinceDraw / 1000, 0.05);
      const now = performance.now();
      // Pointer response follows visible wall time, not the capped ambient
      // animation step. At low FPS a 50ms cap otherwise holds a wake alive
      // for many real seconds and exaggerates velocity from the same path.
      const responseDt = Math.max(0, (now - lastDrawAt) / 1000);
      lastDrawAt = now;
      sinceDraw = 0;
      accumulated %= frameMs;
      const { scroll, quiet } = scrollTracker.update(dt);
      lastScroll = scroll;
      for (let i = 0; i < ladder.length; i++) {
        const color = ladder[i] ?? 0;
        ladder[i] = color + ((targetLadder[i] ?? color) - color) * (1 - Math.exp(-dt * 5));
      }
      time += dt * speed;
      const velocity = movedDistance / Math.max(responseDt, 0.001);
      const targetEnergy = 1 - Math.exp(-velocity * 3.5);
      energy +=
        (targetEnergy - energy) * (1 - Math.exp(-responseDt * (targetEnergy > energy ? 9 : 2.4)));
      movedDistance = 0;
      for (let i = 0; i < 6; i++) {
        const offset = i * 3;
        const targetX = i === 0 ? pointerX : (trail[offset - 3] ?? pointerX);
        const targetY = i === 0 ? pointerY : (trail[offset - 2] ?? pointerY);
        const follow = 1 - Math.exp(-responseDt * (i === 0 ? 16 : 8));
        const x = trail[offset] ?? pointerX;
        const y = trail[offset + 1] ?? pointerY;
        trail[offset] = x + (targetX - x) * follow;
        trail[offset + 1] = y + (targetY - y) * follow;
        trail[offset + 2] = energy * (1 - i * 0.12);
      }
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API method, not a React hook
      gl.useProgram(activeProgram);
      gl.bindVertexArray(vao);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.scroll, scroll);
      gl.uniform3fv(uniforms.trail, trail);
      gl.uniform3fv(uniforms.ladder, ladder);
      gl.uniform1f(uniforms.section, quiet);
      // Blooms age on visible wall time (like the pointer response), so the
      // slow-frame throttle keeps their duration; idle frames upload nothing.
      if (impulses.advance(Math.min(responseDt, 0.25))) {
        const count = impulses.count;
        gl.uniform1i(uniforms.impulseCount, count);
        if (count > 0) {
          gl.uniform4fv(uniforms.impulseShape, impulses.shape, 0, count * 4);
          gl.uniform4fv(uniforms.impulseDrive, impulses.drive, 0, count * 4);
        }
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, 25);
    return () => {
      unsubscribeTick();
      unsubscribeSplats();
      unsubscribePreset();
      scrollTracker.dispose();
      refreshSectionsRef.current = null;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(activeProgram);
      onReadyRef.current(false);
    };
  }, [reducedMotion, failed]);

  if (failed || reducedMotion) return <StaticFallback />;
  return (
    <canvas
      ref={canvasRef}
      data-testid="lite-ink-canvas"
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
