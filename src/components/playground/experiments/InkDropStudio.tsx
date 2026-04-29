"use client";

import { Leva, useControls } from "leva";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { FluidOrchestrator, type PointerState } from "@/components/scene/FluidOrchestrator";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { INK_DROP_STUDIO_DEFAULTS, type SpotColor } from "@/lib/content/playground";
import { getTierConfig } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";
import { ExperimentChrome } from "../ExperimentChrome";

/**
 * Ink Drop Studio — Phase 10 Sprint 2.
 *
 * Sandbox over the full Navier–Stokes solver from FluidOrchestrator,
 * exposed live through Leva sliders + a Riso-stamped button row.
 *
 * Differences vs. the hero rig:
 *   - Ambient wandering points OFF (clean paper canvas to fill)
 *   - Splat colour is the user's pick (not the rotating Riso cycle)
 *   - Bomb / Freeze / Reset buttons drive `injectBomb` / `pause+resume`
 *     / `reset` on the orchestrator
 *
 * The persistent root SceneCanvas is unmounted while we're on this
 * route (see SceneVisibilityGate in the playground layout), so this
 * component owns the GPU exclusively.
 */

// gpu.ts ships splatRadius=0.015 for medium tier. Leva's slider value
// is a 0.3..4.0 multiplier on top of that — keeps the user-facing
// number scale-readable while leaving the tier baseline intact.
const BASE_SPLAT_RADIUS = 0.015;

const SPOT_COLOR_OPTIONS = [
  "rose",
  "amber",
  "mint",
  "violet",
] as const satisfies readonly SpotColor[];

export function InkDropStudio() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <ReducedMotionFallback />;
  return <InkDropStudioCanvas />;
}

function ReducedMotionFallback() {
  const t = useTranslations("playground.experiments.inkDropStudio");
  return (
    <ExperimentChrome i18nKey="inkDropStudio">
      <div className="absolute inset-0 grid place-items-center px-8">
        <p className="type-body-lg max-w-[55ch] text-center text-ink-soft">
          {t("reducedMotionNote")}
        </p>
      </div>
    </ExperimentChrome>
  );
}

function InkDropStudioCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0.5,
    y: 0.5,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
  });
  // Last position the pointer was over the canvas (not over a button or
  // the Leva panel). Bomb fires here so clicking the BOMB button
  // doesn't detonate at the button's own location.
  const lastCanvasPointerRef = useRef({ x: 0.5, y: 0.5 });
  // Mirrors the live `Ink` Leva value into a ref so pointer event
  // handlers (set up once at mount) always read the current colour.
  const inkColorRef = useRef<SpotColor>(INK_DROP_STUDIO_DEFAULTS.inkColor);
  const [paused, setPaused] = useState(false);

  // Leva controls — values reactive, Leva re-renders the component on
  // each slider change. Defaults pulled from the experiment registry
  // so the home-card preview (Sprint 4) and this route start aligned.
  const params = useControls({
    "Velocity Dissipation": {
      value: INK_DROP_STUDIO_DEFAULTS.velocityDissipation,
      min: 0.85,
      max: 1.0,
      step: 0.005,
    },
    "Dye Dissipation": {
      value: INK_DROP_STUDIO_DEFAULTS.dyeDissipation,
      min: 0.85,
      max: 1.0,
      step: 0.005,
    },
    Vorticity: {
      value: INK_DROP_STUDIO_DEFAULTS.vorticity,
      min: 0,
      max: 60,
      step: 1,
    },
    "Pressure Iters": {
      value: INK_DROP_STUDIO_DEFAULTS.pressureIterations,
      min: 5,
      max: 50,
      step: 1,
    },
    "Splat Radius": {
      value: INK_DROP_STUDIO_DEFAULTS.splatRadius,
      min: 0.3,
      max: 4.0,
      step: 0.1,
    },
    Ink: {
      value: INK_DROP_STUDIO_DEFAULTS.inkColor,
      options: SPOT_COLOR_OPTIONS as unknown as string[],
    },
  });

  // Mount: build orchestrator once, hand off to RAF + pointer effects.
  // We read params at mount only; live updates flow through the
  // dedicated sync effect below. Depending on params here would tear
  // down the orchestrator on every slider tick.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);

    // Start at medium tier; the studio is interactive so we don't bias
    // for power efficiency. The Leva sliders dominate from here.
    const baseConfig = getTierConfig("medium");
    const orchestrator = new FluidOrchestrator();
    orchestrator.init(gl, {
      ...baseConfig,
      velocityDissipation: params["Velocity Dissipation"],
      dyeDissipation: params["Dye Dissipation"],
      confinement: params.Vorticity,
      pressureIterations: params["Pressure Iters"],
      splatRadius: params["Splat Radius"] * BASE_SPLAT_RADIUS,
    });
    orchestrator.setAmbientEnabled(false);
    // Studio drives splats manually so click-burst and drag-trail can
    // diverge — the orchestrator's auto-pointer-splat block would
    // otherwise also fire continuous splats and steal control of the
    // colour rotation.
    orchestrator.setPointerSplatEnabled(false);
    orchestratorRef.current = orchestrator;

    const onResize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * ratio);
      const h = Math.floor(window.innerHeight * ratio);
      canvas.width = w;
      canvas.height = h;
      orchestrator.resize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, []);

  // Live param sync — re-runs on every Leva change, mutates config.
  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;
    orchestrator.setParams({
      velocityDissipation: params["Velocity Dissipation"],
      dyeDissipation: params["Dye Dissipation"],
      confinement: params.Vorticity,
      pressureIterations: params["Pressure Iters"],
      splatRadius: params["Splat Radius"] * BASE_SPLAT_RADIUS,
    });
    // Mirror the picked colour into a ref so the pointer handlers
    // below (mounted once with [] deps) read the live value each event.
    inkColorRef.current = params.Ink as SpotColor;
  }, [params]);

  // RAF loop — drives the orchestrator step and injects the drag-trail
  // splat each frame (one splat at the cursor with motion velocity)
  // when the pointer is held down and moving over the canvas. The
  // click-burst is fired in the pointerdown handler below, not here.
  useEffect(() => {
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;

      const p = pointerRef.current;
      // Drag trail: continuous splats with motion velocity. dx/dy are
      // scaled up to give a visible flow direction; matches the hero
      // rig's auto-pointer scale (×10 inside runSplat). Only fires
      // while the pointer is actually moving — holding still doesn't
      // re-stamp the same point.
      if (p.down && p.moved) {
        orchestrator.injectSplat(p.x, p.y, inkColorRef.current, p.dx * 6, p.dy * 6);
      }

      const dt = Math.min(deltaMs * 0.001, 0.033);
      orchestrator.step(dt, elapsedMs, p);
      p.dx = 0;
      p.dy = 0;
      p.moved = false;
    }, 15);
  }, []);

  // Pointer events at document level — the canvas is full-screen so
  // any pointermove maps to sim coordinates. Click bursts fire on
  // pointerdown over the canvas; drag-trail is handled in the RAF
  // loop above.
  useEffect(() => {
    const isOverChrome = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest("[data-no-splat]");

    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const p = pointerRef.current;
      p.dx = x - p.x;
      p.dy = y - p.y;
      p.x = x;
      p.y = y;
      p.moved = true;
      // Only update the bomb-target ref when the pointer is over the
      // canvas — moving the mouse onto the BOMB button must not move
      // the bomb's detonation site.
      if (!isOverChrome(e.target)) {
        lastCanvasPointerRef.current.x = x;
        lastCanvasPointerRef.current.y = y;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (isOverChrome(e.target)) return;
      pointerRef.current.down = true;
      // Click burst — small radial splash at the click point. 6 satellites
      // with random angle jitter + outward velocity, plus a centred dump
      // so the impact has both a core and a spread. Reads as "ink hits
      // paper" rather than the trail's "ink dragged across paper".
      const o = orchestratorRef.current;
      if (!o) return;
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const color = inkColorRef.current;
      const RING = 6;
      const baseAngle = Math.random() * Math.PI * 2;
      for (let i = 0; i < RING; i++) {
        const angle = baseAngle + (i / RING) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const speed = 0.7 + Math.random() * 0.6;
        const offset = 0.006 + Math.random() * 0.012;
        o.injectSplat(
          x + Math.cos(angle) * offset,
          y + Math.sin(angle) * offset,
          color,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
        );
      }
      o.injectSplat(x, y, color, 0, 0);
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
  }, []);

  const onBomb = () => {
    const o = orchestratorRef.current;
    if (!o) return;
    // Fire at the last position where the pointer was OVER the canvas
    // (not over the bomb button itself). Without this, hovering the
    // bomb button would move the detonation site to the button's own
    // location and the explosion would be invisible behind the chrome.
    const t = lastCanvasPointerRef.current;
    o.injectBomb(t.x, t.y, inkColorRef.current);
  };
  const onFreezeToggle = () => {
    const o = orchestratorRef.current;
    if (!o) return;
    if (o.isPaused()) {
      o.resume();
      setPaused(false);
    } else {
      o.pause();
      setPaused(true);
    }
  };
  const onReset = () => {
    orchestratorRef.current?.reset();
  };

  return (
    <ExperimentChrome i18nKey="inkDropStudio">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "none" }}
      />
      <ButtonRow
        paused={paused}
        onBomb={onBomb}
        onFreezeToggle={onFreezeToggle}
        onReset={onReset}
      />
      {/* Leva panel — paper-themed, mounted via portal by the lib.
          The `data-no-splat` guard on the wrapper isn't enough because
          Leva renders elsewhere; we instead key the canvas pointerdown
          off `e.target.closest("[data-no-splat]")`, and the Leva root
          element gets that attribute via the LevaPaperTheme below. */}
      <LevaPaperTheme />
    </ExperimentChrome>
  );
}

/** Riso-themed Leva panel. Paper backing, ink text, spot-rose accent.
 *  Mounted as a sibling of the canvas; Leva positions itself fixed
 *  top-right via its own internal store. */
function LevaPaperTheme() {
  return (
    <Leva
      collapsed={false}
      hideCopyButton
      titleBar={{ drag: true, filter: false, title: "INK DROP STUDIO" }}
      theme={{
        colors: {
          elevation1: "#f0e8dc",
          elevation2: "#fef2e2",
          elevation3: "#e4dbcd",
          accent1: "#ff6ba0",
          accent2: "#ffc474",
          accent3: "#7ce8c4",
          highlight1: "#0a0608",
          highlight2: "#1a0e12",
          highlight3: "#0a0608",
          folderTextColor: "#0a0608",
          folderWidgetColor: "#0a0608",
        },
        sizes: {
          rootWidth: "300px",
          controlWidth: "120px",
        },
        fontSizes: {
          root: "11px",
        },
        radii: {
          xs: "0",
          sm: "0",
          lg: "0",
        },
      }}
    />
  );
}

type ButtonRowProps = {
  paused: boolean;
  onBomb: () => void;
  onFreezeToggle: () => void;
  onReset: () => void;
};

function ButtonRow({ paused, onBomb, onFreezeToggle, onReset }: ButtonRowProps) {
  const t = useTranslations("playground.experiments.inkDropStudio");
  return (
    <div
      data-no-splat
      className="-translate-x-1/2 pointer-events-auto absolute bottom-8 left-1/2 z-20 flex items-stretch gap-2"
    >
      <ToolbarButton onClick={onBomb} label={t("buttonBomb")} />
      <ToolbarButton
        onClick={onFreezeToggle}
        label={paused ? t("buttonResume") : t("buttonFreeze")}
      />
      <ToolbarButton onClick={onReset} label={t("buttonReset")} />
    </div>
  );
}

function ToolbarButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-no-splat
      className="type-label-stamp border-[1.5px] border-ink bg-paper px-4 py-2 text-ink shadow-[2px_2px_0_var(--color-ink)] transition-[transform,box-shadow] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--color-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
    >
      {label}
    </button>
  );
}
