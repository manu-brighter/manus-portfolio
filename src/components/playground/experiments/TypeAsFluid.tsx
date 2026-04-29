"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { FluidOrchestrator, type PointerState } from "@/components/scene/FluidOrchestrator";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TYPE_AS_FLUID_DEFAULTS } from "@/lib/content/playground";
import { getTierConfig } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";
import { TextStamper } from "@/lib/textStamp";
import { ExperimentChrome } from "../ExperimentChrome";

/**
 * Type-as-Fluid — Phase 10 Sprint 3.
 *
 * Type a word; it gets rasterised, blurred to a soft SDF-like density
 * stamp, and injected into the running fluid sim. The Riso-toon render
 * pass then advects + dissipates the stamp so the word reads as
 * "freshly printed, then absorbed by ink".
 *
 * UX:
 *   - Bottom input field (mono, generous letter-spacing). Each keystroke
 *     triggers a ~250ms-debounced re-stamp so live typing reads as a
 *     continuously-printing-and-dissolving inscription rather than a
 *     stutter on every character.
 *   - When idle (no typing for 4s), a default-word rotation kicks in —
 *     pulls the next word from TYPE_AS_FLUID_DEFAULTS and stamps it
 *     every 5s. Typing resumes overrides the rotation.
 *
 * Reduced motion: instant-fade replacement (no sim, no stamp pipeline).
 */

const SPOT_KEYS = ["rose", "amber", "mint", "violet"] as const;

export function TypeAsFluid() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <ReducedMotionFallback />;
  return <TypeAsFluidCanvas />;
}

function ReducedMotionFallback() {
  const t = useTranslations("playground.experiments.typeAsFluid");
  return (
    <ExperimentChrome i18nKey="typeAsFluid">
      <div className="absolute inset-0 grid place-items-center px-8">
        <p className="type-body-lg max-w-[55ch] text-center text-ink-soft">
          {t("reducedMotionNote")}
        </p>
      </div>
    </ExperimentChrome>
  );
}

function TypeAsFluidCanvas() {
  const t = useTranslations("playground.experiments.typeAsFluid");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const stamperRef = useRef<TextStamper | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0.5,
    y: 0.5,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
  });
  const [text, setText] = useState("");
  // Mirror text into a ref so the rotation timer (mounted once) can see
  // the latest user input without re-binding.
  const textRef = useRef("");
  textRef.current = text;
  // Tracks the last time the user typed; the rotation timer waits 4s
  // of idle before stamping a default word.
  const lastTypedAtRef = useRef(0);

  // ---- Mount: build orchestrator + stamper ----
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

    const orchestrator = new FluidOrchestrator();
    // Override medium-tier dissipation defaults — at the stock 0.95
    // dye dissipation a stamp fades to ~5% in one second, which reads
    // as "word flashes and vanishes". Studio mode wants a "swallowed
    // softly" feel: density survives ~10s, velocity persists ~30s so
    // the text gets time to advect into actual flow patterns.
    orchestrator.init(gl, {
      ...getTierConfig("medium"),
      velocityDissipation: 0.998,
      dyeDissipation: 0.998,
      confinement: 30,
    });
    orchestrator.setAmbientEnabled(true);
    orchestrator.triggerAmbient();
    orchestratorRef.current = orchestrator;

    stamperRef.current = new TextStamper(gl, orchestrator);

    // Stamp an initial default word so the canvas isn't empty on first
    // paint. Picks a random one each mount so the experience varies.
    const initial =
      TYPE_AS_FLUID_DEFAULTS.defaultWords[
        Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
      ] ?? "MANUEL";
    stampWord(stamperRef.current, orchestrator, initial);

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
      stamperRef.current?.dispose();
      stamperRef.current = null;
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, []);

  // ---- RAF loop ----
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

  // ---- Document pointer wiring (hover trail only — no clicks) ----
  useEffect(() => {
    const isOverChrome = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest("[data-no-splat]");

    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const p = pointerRef.current;
      if (isOverChrome(e.target)) {
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
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  // ---- Debounced re-stamp on typing ----
  useEffect(() => {
    if (text.length === 0) return;
    lastTypedAtRef.current = performance.now();
    const handle = window.setTimeout(() => {
      const stamper = stamperRef.current;
      const orchestrator = orchestratorRef.current;
      if (!stamper || !orchestrator) return;
      stampWord(stamper, orchestrator, text);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [text]);

  // ---- Idle rotation: default-word stamp every 7s when user hasn't typed ----
  useEffect(() => {
    const handle = window.setInterval(() => {
      if (textRef.current.length > 0) return;
      const sinceTyped = performance.now() - lastTypedAtRef.current;
      if (lastTypedAtRef.current !== 0 && sinceTyped < 5000) return;
      const stamper = stamperRef.current;
      const orchestrator = orchestratorRef.current;
      if (!stamper || !orchestrator) return;
      const word =
        TYPE_AS_FLUID_DEFAULTS.defaultWords[
          Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
        ] ?? "MANUEL";
      stampWord(stamper, orchestrator, word);
    }, 7000);
    return () => window.clearInterval(handle);
  }, []);

  return (
    <ExperimentChrome i18nKey="typeAsFluid">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "none" }}
      />
      <div
        data-no-splat
        className="-translate-x-1/2 pointer-events-auto absolute bottom-12 left-1/2 z-20 w-full max-w-md px-6"
      >
        <label className="type-label-stamp mb-3 block text-ink" htmlFor="type-as-fluid-input">
          {t("inputLabel")}
        </label>
        <input
          id="type-as-fluid-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 24))}
          placeholder={t("inputPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          maxLength={24}
          className="type-h2 w-full border-[1.5px] border-ink bg-paper px-4 py-3 text-center text-ink placeholder:text-ink-faint focus:outline-none focus:shadow-[3px_3px_0_var(--color-ink)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-[transform,box-shadow]"
          style={{ fontStyle: "italic", letterSpacing: "0.05em" }}
        />
      </div>
    </ExperimentChrome>
  );
}

function randomSpot(): "rose" | "amber" | "mint" | "violet" {
  return SPOT_KEYS[Math.floor(Math.random() * SPOT_KEYS.length)] ?? "rose";
}

/**
 * Stamp a word with a stronger, more-fluid presence than a single
 * inject-density call gives:
 *   - 3 stacked density stamps over ~80ms with descending strength,
 *     each picking its own Riso spot. Cumulative density + per-stamp
 *     colour gives a "soaking ink" feel rather than a flat decal.
 *   - 5 small velocity-only splats around the centre with random
 *     outward push so the just-stamped text immediately starts to
 *     swirl, instead of sitting still until the slow ambient drift
 *     catches up.
 *
 * The orchestrator's slow dye + velocity dissipation (0.998 each in
 * TypeAsFluid) keeps the result legible for ~10s while the text is
 * pulled apart by the flow.
 */
function stampWord(stamper: TextStamper, orchestrator: FluidOrchestrator, word: string) {
  const color = randomSpot();
  // Wave 0 — strongest base layer, biggest blur for soft edges.
  stamper.stampText(word, color, 1.6, 4);

  // Wave 1 + 2 — re-injections with different spots so the layered
  // toon ladder reads as multi-pass Riso, not a single flat stroke.
  window.setTimeout(() => stamper.stampText(word, randomSpot(), 1.0, 3), 40);
  window.setTimeout(() => stamper.stampText(word, randomSpot(), 0.6, 3), 90);

  // Velocity perturbation — 5 random outward pushes around the canvas
  // centre. Color = transparent so we don't add dye, only kick the
  // velocity field. The text rides this turbulence.
  const transparent = [0, 0, 0] as const;
  const PUSH = 5;
  for (let i = 0; i < PUSH; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.08 + Math.random() * 0.18;
    const x = 0.5 + Math.cos(a) * r;
    const y = 0.5 + Math.sin(a) * r;
    const speed = 0.4 + Math.random() * 0.5;
    orchestrator.injectSplat(
      x,
      y,
      transparent,
      Math.cos(a + Math.PI / 2) * speed,
      Math.sin(a + Math.PI / 2) * speed,
    );
  }
}
