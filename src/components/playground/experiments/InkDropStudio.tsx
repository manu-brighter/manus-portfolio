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

const SPOT_COLOR_KEYS = ["rose", "amber", "mint", "violet"] as const satisfies readonly SpotColor[];

// The toon render shader (render-toon.frag.glsl) maps dye *magnitude*
// to a fixed mint→amber→rose→violet ladder rather than reading the
// dye RGB itself — so a single-colour override can't show through the
// layered Riso look. Studio embraces that: every splat picks a random
// Riso spot and the visual feel is layered ink, just like the hero.
function randomSpot(): SpotColor {
  return SPOT_COLOR_KEYS[Math.floor(Math.random() * SPOT_COLOR_KEYS.length)] ?? "rose";
}

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
  // Active interval handle while the BOMB button is being held —
  // pointerup / pointerleave clear it. Lets the user "rain bombs"
  // for as long as they hold instead of getting one short blip.
  const bombIntervalRef = useRef<number | null>(null);
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
    // Hover-trail uses the orchestrator's built-in auto-pointer-splat
    // with the rotating Riso-spot cycle (override stays null). Click-
    // burst + bomb layer additional splats on top via injectSplat().
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
  }, [params]);

  // RAF loop — drives orchestrator.step. The orchestrator's auto-
  // pointer-splat handles the hover trail (and any click-and-drag
  // sustain) since `pointer.moved || pointer.down` covers both cases.
  // The click-burst is fired in the pointerdown handler below.
  useEffect(() => {
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const dt = Math.min(deltaMs * 0.001, 0.033);
      orchestrator.step(dt, elapsedMs, pointerRef.current);
      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, 15);
  }, []);

  // Document-level pointer wiring. Hover (move without click held) is
  // the trail; click is a wavy multi-splat burst. Pointer state goes
  // dead while over chrome elements ([data-no-splat]) so dragging the
  // cursor toward a button doesn't smear ink onto the chrome path.
  useEffect(() => {
    const isOverChrome = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest("[data-no-splat]");

    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const p = pointerRef.current;

      if (isOverChrome(e.target)) {
        // Track position so re-entry into the canvas doesn't fire a
        // huge dx/dy shockwave, but suppress `moved` so the orchestrator
        // doesn't paint a trail underneath the buttons.
        p.x = x;
        p.y = y;
        p.dx = 0;
        p.dy = 0;
        p.moved = false;
        return;
      }

      p.dx = x - p.x;
      p.dy = y - p.y;
      p.x = x;
      p.y = y;
      p.moved = true;
    };

    const onDown = (e: PointerEvent) => {
      if (isOverChrome(e.target)) return;
      pointerRef.current.down = true;

      // Click burst — radial splatter from the click point. Each
      // satellite picks its own random Riso spot so the burst reads
      // as bunte "ink splash", with outward velocity to differentiate
      // it from the hover trail's "ink drag".
      const o = orchestratorRef.current;
      if (!o) return;
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const RING = 6;
      const baseAngle = Math.random() * Math.PI * 2;
      for (let i = 0; i < RING; i++) {
        const angle = baseAngle + (i / RING) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const speed = 0.7 + Math.random() * 0.6;
        const offset = 0.008 + Math.random() * 0.014;
        o.injectSplat(
          x + Math.cos(angle) * offset,
          y + Math.sin(angle) * offset,
          randomSpot(),
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
        );
      }
      o.injectSplat(x, y, randomSpot(), 0, 0);
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

  /**
   * One bomb wave — 4–8 random splats scattered across the canvas
   * with random outward velocities. Press-and-hold rains waves at
   * 110ms cadence (see onBombStart/End). Two stacked splats per
   * position with crossed velocity vectors amplify the impact and
   * give vorticity something to tear apart.
   */
  const fireBombWave = () => {
    const o = orchestratorRef.current;
    if (!o) return;
    const COUNT = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < COUNT; i++) {
      const x = 0.1 + Math.random() * 0.8;
      const y = 0.1 + Math.random() * 0.8;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 1.5;
      o.injectSplat(x, y, randomSpot(), Math.cos(angle) * speed, Math.sin(angle) * speed);
      o.injectSplat(
        x,
        y,
        randomSpot(),
        Math.cos(angle + Math.PI / 2) * speed * 0.6,
        Math.sin(angle + Math.PI / 2) * speed * 0.6,
      );
    }
  };

  const onBombStart = () => {
    fireBombWave();
    if (bombIntervalRef.current !== null) return;
    bombIntervalRef.current = window.setInterval(fireBombWave, 110);
  };
  const onBombEnd = () => {
    if (bombIntervalRef.current !== null) {
      window.clearInterval(bombIntervalRef.current);
      bombIntervalRef.current = null;
    }
  };

  // Safety: clear the interval if the component unmounts while held.
  useEffect(() => {
    return () => {
      if (bombIntervalRef.current !== null) {
        window.clearInterval(bombIntervalRef.current);
        bombIntervalRef.current = null;
      }
    };
  }, []);
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
        onBombStart={onBombStart}
        onBombEnd={onBombEnd}
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
  /** Press-and-hold: start bombing on pointerdown. */
  onBombStart: () => void;
  /** Stop bombing on pointerup / leave / cancel. */
  onBombEnd: () => void;
  onFreezeToggle: () => void;
  onReset: () => void;
};

function ButtonRow({ paused, onBombStart, onBombEnd, onFreezeToggle, onReset }: ButtonRowProps) {
  const t = useTranslations("playground.experiments.inkDropStudio");
  return (
    <div
      data-no-splat
      className="-translate-x-1/2 pointer-events-auto absolute bottom-8 left-1/2 z-20 flex items-stretch gap-2"
    >
      <HoldButton onPress={onBombStart} onRelease={onBombEnd} label={t("buttonBomb")} />
      <ToolbarButton
        onClick={onFreezeToggle}
        label={paused ? t("buttonResume") : t("buttonFreeze")}
      />
      <ToolbarButton onClick={onReset} label={t("buttonReset")} />
    </div>
  );
}

const TOOLBAR_BUTTON_CLASS =
  "type-label-stamp border-[1.5px] border-ink bg-paper px-4 py-2 text-ink shadow-[2px_2px_0_var(--color-ink)] transition-[transform,box-shadow] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--color-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none";

function ToolbarButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} data-no-splat className={TOOLBAR_BUTTON_CLASS}>
      {label}
    </button>
  );
}

/** Press-and-hold variant. Fires onPress on pointerdown and onRelease
 *  on pointerup OR pointerleave / pointercancel — the leave guard
 *  matters because if the user drags off the button while still holding,
 *  pointerup fires elsewhere and we'd otherwise leak the interval. */
function HoldButton({
  onPress,
  onRelease,
  label,
}: {
  onPress: () => void;
  onRelease: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      data-no-splat
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      className={TOOLBAR_BUTTON_CLASS}
    >
      {label}
    </button>
  );
}
