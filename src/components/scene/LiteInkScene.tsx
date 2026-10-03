"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SECTIONS } from "@/lib/content/sections";
import { getSimPreset } from "@/lib/content/simPresets";
import { compileShader } from "@/lib/gl/compileShader";
import { createProgram } from "@/lib/gl/createProgram";
import { DEFAULT_FLUID_VISUALS } from "@/lib/gl/fluidOrchestrator";
import { subscribe } from "@/lib/raf";
import { useSimPresetStore } from "@/lib/simPresetStore";
import quadSource from "@/shaders/common/quad.vert.glsl";
import fragmentSource from "@/shaders/ink-lite/render.frag.glsl";
import { StaticFallback } from "./StaticFallback";

const STYLES = ["riso", "wave", "turbulenz", "aquarell", "nachtdruck"];
const FRAME_MS = 1000 / 60;
const SECTION_SELECTOR = SECTIONS.map(({ id }) => `#${id}`).join(", ");

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
      fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, "lite-ink.frag");
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
    };
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API method, not a React hook
    gl.useProgram(activeProgram);
    gl.bindVertexArray(vao);
    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      // clientHeight = 100lvh, which reaches under the iOS toolbar.
      const height = Math.max(1, canvas.clientHeight || window.innerHeight);
      const budget = qualityRef.current ? 450000 : 900000;
      const scale = Math.min(1, window.devicePixelRatio || 1, Math.sqrt(budget / (width * height)));
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    };
    let speed = 1;
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
      gl.uniform1i(uniforms.style, STYLES.indexOf(visuals.style));
      gl.uniform1f(uniforms.grain, visuals.grainStrength);
      gl.uniform1f(uniforms.edge, visuals.edgeStrength);
      // Analytic washes need a livelier clock than the fluid solver.
      // Tempo changes keep the same single draw and work on every viewport.
      const animationTempo = visuals.style === "wave" ? 2 : visuals.style === "aquarell" ? 4 : 1;
      speed = visuals.ambientTimeScale * animationTempo;
    };
    resize();
    applyPreset();
    const unsubscribePreset = useSimPresetStore.subscribe(applyPreset);
    // Observe a narrow viewport band, independent of each section's height.
    // No layout queries are needed in the render loop.
    let targetQuiet = 0;
    let quiet = 0;
    const onSections: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.id;
        targetQuiet =
          id === "hero" || id === "contact"
            ? 0
            : id === "work" || id === "case-study" || id === "photography"
              ? 1
              : 0.55;
        canvas.dataset.inkSection = id;
      }
    };
    let sectionObserver: IntersectionObserver;
    const observeSections = () => {
      sectionObserver?.disconnect();
      targetQuiet = 0.55;
      delete canvas.dataset.inkSection;
      const margin = Math.round(window.innerHeight * 0.45);
      sectionObserver = new IntersectionObserver(onSections, {
        rootMargin: `-${margin}px 0px -${margin}px 0px`,
        threshold: 0,
      });
      for (const section of document.querySelectorAll(SECTION_SELECTOR)) {
        sectionObserver.observe(section);
      }
    };
    refreshSectionsRef.current = observeSections;
    observeSections();
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
    gl.uniform1f(uniforms.section, quiet);
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
      pointerY = 1 - event.clientY / Math.max(1, canvas.clientHeight || window.innerHeight);
      // Integrate distance, not event count: a 1000Hz mouse must impart the
      // same motion as a 60Hz mouse travelling along the same path.
      movedDistance += distance / Math.max(1, Math.min(window.innerWidth, window.innerHeight));
    };
    let accumulated = FRAME_MS;
    let sinceDraw = 0;
    let lastDrawAt = performance.now();
    let time = 0;
    let scroll = window.scrollY / Math.max(1, window.innerHeight);
    const visibility = () => {
      accumulated = 0;
      sinceDraw = 0;
      lastDrawAt = performance.now();
      movedDistance = 0;
      pointerKnown = false;
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    window.addEventListener("resize", resize);
    window.addEventListener("resize", observeSections);
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
      quiet += (targetQuiet - quiet) * (1 - Math.exp(-dt * 2.4));
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
      scroll +=
        (window.scrollY / Math.max(1, window.innerHeight) - scroll) * (1 - Math.exp(-dt * 3));
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API method, not a React hook
      gl.useProgram(activeProgram);
      gl.bindVertexArray(vao);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.scroll, scroll);
      gl.uniform3fv(uniforms.trail, trail);
      gl.uniform3fv(uniforms.ladder, ladder);
      gl.uniform1f(uniforms.section, quiet);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, 25);
    return () => {
      unsubscribeTick();
      unsubscribePreset();
      sectionObserver.disconnect();
      refreshSectionsRef.current = null;
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", observeSections);
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
      className="pointer-events-none fixed top-0 left-0 z-0 h-lvh w-full"
    />
  );
}
