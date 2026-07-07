"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Pane } from "tweakpane";
import { useOrchestratorRAF } from "@/hooks/useOrchestratorRAF";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { INK_DROP_STUDIO_DEFAULTS } from "@/lib/content/playground";
import { getSimPreset, type SimPresetId } from "@/lib/content/simPresets";
import { FluidOrchestrator, type PointerState } from "@/lib/gl/fluidOrchestrator";
import { capDPR, DPR_FULL, getTierConfig } from "@/lib/gpu";
import { randomSpot } from "@/lib/palette";
import { syncPresetVisuals, useSimPresetStore } from "@/lib/simPresetStore";
import { ExperimentChrome } from "../ExperimentChrome";

/**
 * Ink Drop Studio — Phase 10 Sprint 2.
 *
 * Sandbox over the full Navier–Stokes solver from FluidOrchestrator,
 * exposed live through Tweakpane sliders + a Riso-stamped button row.
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

// gpu.ts ships splatRadius=0.015 for medium tier. The slider value
// is a 0.3..4.0 multiplier on top of that — keeps the user-facing
// number scale-readable while leaving the tier baseline intact.
const BASE_SPLAT_RADIUS = 0.015;

// The preset render shaders (render-*.frag.glsl) map dye *magnitude*
// to a fixed mint→amber→rose→violet ladder rather than reading the
// dye RGB itself — so a single-colour override can't show through the
// layered Riso look. Studio embraces that: every splat picks a random
// Riso spot via the shared `randomSpot()` helper and the visual feel
// is layered ink, just like the hero.

type StudioParams = {
  velocityDissipation: number;
  dyeDissipation: number;
  vorticity: number;
  pressureIterations: number;
  splatRadius: number;
};

const INITIAL_PARAMS: StudioParams = {
  velocityDissipation: INK_DROP_STUDIO_DEFAULTS.velocityDissipation,
  dyeDissipation: INK_DROP_STUDIO_DEFAULTS.dyeDissipation,
  vorticity: INK_DROP_STUDIO_DEFAULTS.vorticity,
  pressureIterations: INK_DROP_STUDIO_DEFAULTS.pressureIterations,
  splatRadius: INK_DROP_STUDIO_DEFAULTS.splatRadius,
};

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
  const paneContainerRef = useRef<HTMLDivElement | null>(null);
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
  // Per-frame sustain timers for the bomb splats — tracked so unmount
  // can clear any in-flight ones before the GL context is disposed.
  const bombSustainTimersRef = useRef<Set<number>>(new Set<number>());
  const [paused, setPaused] = useState(false);

  // Tweakpane mutates this object directly. No React state — slider
  // drags don't trigger re-renders; the change-handler below pushes
  // updates straight to the orchestrator. Stable ref shared between
  // the orchestrator-mount effect (reads initial values) and the
  // pane-mount effect (writes new values via Tweakpane bindings).
  const paramsRef = useRef<StudioParams>({ ...INITIAL_PARAMS });

  // Mount: build orchestrator once, hand off to RAF + pointer effects.
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

    const dpr = capDPR(DPR_FULL);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);

    // Start at medium tier; the studio is interactive so we don't bias
    // for power efficiency. The Tweakpane sliders dominate from here.
    const baseConfig = getTierConfig("medium");
    const orchestrator = new FluidOrchestrator();
    const p = paramsRef.current;
    orchestrator.init(gl, {
      ...baseConfig,
      velocityDissipation: p.velocityDissipation,
      dyeDissipation: p.dyeDissipation,
      confinement: p.vorticity,
      pressureIterations: p.pressureIterations,
      splatRadius: p.splatRadius * BASE_SPLAT_RADIUS,
    });
    orchestrator.setAmbientEnabled(false);
    // Studio doesn't trigger ambient (it's an interactive canvas) but
    // still needs the warmup gate open so step() runs.
    orchestrator.start();
    // Hover-trail uses the orchestrator's built-in auto-pointer-splat
    // with the rotating Riso-spot cycle (override stays null). Click-
    // burst + bomb layer additional splats on top via injectSplat().
    orchestratorRef.current = orchestrator;
    // Active preset's look carries into the studio (visuals only —
    // the Tweakpane physics sliders stay authoritative).
    const unsubPreset = syncPresetVisuals(orchestrator);

    const onResize = () => {
      const ratio = capDPR(DPR_FULL);
      const w = Math.floor(window.innerWidth * ratio);
      const h = Math.floor(window.innerHeight * ratio);
      canvas.width = w;
      canvas.height = h;
      orchestrator.resize(w, h);
    };
    // ResizeObserver on the canvas's parent so the sim adapts to
    // container reflow (e.g. ExperimentChrome density change) rather
    // than only viewport changes.
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement ?? canvas);

    return () => {
      ro.disconnect();
      unsubPreset();
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, []);

  // Tweakpane mount — pane container is part of our DOM tree (vs. Leva's
  // portal-to-body), so positioning/data-no-splat live on the wrapper div.
  // The pane writes back into `paramsRef.current` on every change and
  // fires 'change'; we forward to the orchestrator without re-rendering.
  useEffect(() => {
    const container = paneContainerRef.current;
    if (!container) return;
    const params = paramsRef.current;
    const pane = new Pane({
      container,
      // "SIM-PARAMETER", not a second "INK DROP STUDIO" — the card is a
      // labeled control panel, not a duplicate of the page title (which
      // read as thrown-in). Matches the caption's "Slider = Sim-Parameter".
      title: "SIM-PARAMETER",
    });
    pane.addBinding(params, "velocityDissipation", {
      label: "Velocity Dissipation",
      min: 0.85,
      max: 1.0,
      step: 0.005,
    });
    pane.addBinding(params, "dyeDissipation", {
      label: "Dye Dissipation",
      min: 0.85,
      max: 1.0,
      step: 0.005,
    });
    pane.addBinding(params, "vorticity", {
      label: "Vorticity",
      min: 0,
      max: 60,
      step: 1,
    });
    pane.addBinding(params, "pressureIterations", {
      label: "Pressure Iters",
      min: 5,
      max: 50,
      step: 1,
    });
    pane.addBinding(params, "splatRadius", {
      label: "Splat Radius",
      min: 0.3,
      max: 4.0,
      step: 0.1,
    });
    const pushParams = () => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      orchestrator.setParams({
        velocityDissipation: params.velocityDissipation,
        dyeDissipation: params.dyeDissipation,
        confinement: params.vorticity,
        pressureIterations: params.pressureIterations,
        splatRadius: params.splatRadius * BASE_SPLAT_RADIUS,
      });
    };
    pane.on("change", pushParams);

    // Preset physics flow INTO the sliders: switching the preset pill
    // loads that preset's physics as the new slider values (visible
    // via pane.refresh — Tweakpane reads params by reference) and
    // pushes them to the orchestrator. "riso" restores the studio's
    // own tuned defaults. The user keeps full slider freedom after.
    const applyPresetPhysics = (id: SimPresetId) => {
      const preset = getSimPreset(id);
      if (preset.id === "riso") {
        Object.assign(params, INK_DROP_STUDIO_DEFAULTS);
      } else {
        const base = getTierConfig("medium");
        params.velocityDissipation = preset.physics.velocityDissipation ?? base.velocityDissipation;
        params.dyeDissipation = preset.physics.dyeDissipation ?? base.dyeDissipation;
        params.vorticity = preset.physics.confinement ?? base.confinement;
        params.splatRadius = preset.physics.splatRadiusScale ?? 1;
      }
      pane.refresh();
      pushParams();
    };
    const initialPresetId = useSimPresetStore.getState().presetId;
    if (initialPresetId !== "riso") applyPresetPhysics(initialPresetId);
    const unsubPresetPane = useSimPresetStore.subscribe((current, previous) => {
      if (current.presetId !== previous.presetId) applyPresetPhysics(current.presetId);
    });

    return () => {
      unsubPresetPane();
      pane.dispose();
    };
  }, []);

  // RAF loop — drives orchestrator.step. The orchestrator's auto-
  // pointer-splat handles the hover trail (and any click-and-drag
  // sustain) since `pointer.moved || pointer.down` covers both cases.
  // The click-burst is fired in the pointerdown handler below.
  useOrchestratorRAF(orchestratorRef, pointerRef, 15);

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
   *
   * Each point is SUSTAINED over ~8 frames instead of a single-frame
   * poke: the first frame lands the full velocity impulse (the
   * shockwave), the following frames keep depositing dye with a gentle
   * push at the same spot, so the splat visibly BUILDS UP into a solid
   * ink pool rather than flashing once and vanishing (user feedback).
   */
  const fireBombWave = () => {
    const o = orchestratorRef.current;
    if (!o) return;
    const COUNT = 4 + Math.floor(Math.random() * 5);
    const points = Array.from({ length: COUNT }, () => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      angle: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 1.5,
      color: randomSpot(),
      crossColor: randomSpot(),
    }));
    const injectFrame = (frame: number) => {
      const orch = orchestratorRef.current;
      if (!orch) return;
      // Full impulse on frame 0; gentle push after so later frames add
      // dye without re-exploding the velocity field.
      const vScale = frame === 0 ? 1 : 0.2;
      for (const p of points) {
        orch.injectSplat(
          p.x,
          p.y,
          p.color,
          Math.cos(p.angle) * p.speed * vScale,
          Math.sin(p.angle) * p.speed * vScale,
        );
        orch.injectSplat(
          p.x,
          p.y,
          p.crossColor,
          Math.cos(p.angle + Math.PI / 2) * p.speed * 0.6 * vScale,
          Math.sin(p.angle + Math.PI / 2) * p.speed * 0.6 * vScale,
        );
      }
    };
    const SUSTAIN_FRAMES = 8;
    injectFrame(0);
    const timers = bombSustainTimersRef.current;
    for (let f = 1; f < SUSTAIN_FRAMES; f++) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        injectFrame(f);
      }, f * 16);
      timers.add(id);
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

  // Safety: clear the interval + any in-flight bomb-sustain timers if
  // the component unmounts while held (they'd otherwise fire injectSplat
  // against a disposed GL context ~130ms after route change).
  useEffect(() => {
    return () => {
      if (bombIntervalRef.current !== null) {
        window.clearInterval(bombIntervalRef.current);
        bombIntervalRef.current = null;
      }
      for (const id of bombSustainTimersRef.current) window.clearTimeout(id);
      bombSustainTimersRef.current.clear();
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
      {/* Tweakpane mount target.
          Riso theme is inlined via --tp-* CSS variables (Tweakpane reads
          them at first paint). Mounted in our DOM tree so `data-no-splat`
          stops pointer events here from triggering ink splats underneath
          (vs. Leva which portaled-to-body and needed CSS-selector hacks).
          Positioning: clearly below the sticky navbar (the old md:top-6
          tucked it half-under the nav and read as broken), dressed as a
          Riso card (ink border + offset shadow) like the toolbar
          buttons so it belongs to the composition. */}
      {/* Pane docks to the BOTTOM on mobile (centered, above the button
          row) — the sliders join the buttons in the thumb zone, leaving
          the top clear for the title/caption/preset-bar column. Desktop
          keeps it top-right below the nav, forming a control column with
          the preset bar. Narrower on mobile so it doesn't span the
          phone. */}
      <div
        ref={paneContainerRef}
        data-no-splat
        className="riso-tweakpane pointer-events-auto absolute bottom-24 left-1/2 z-20 w-[min(300px,72vw)] -translate-x-1/2 border-[1.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)] md:top-24 md:right-6 md:bottom-auto md:left-auto md:w-[300px] md:translate-x-0"
      />
    </ExperimentChrome>
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
