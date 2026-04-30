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
    // Calm-paper baseline so the typed word reads CLEARLY first, then
    // dissolves gently — briefing's "sanft":
    //   - velocityDissipation 0.95 → motion settles within ~1s of no
    //     input, so leftover momentum from one stamp doesn't smear
    //     the next word
    //   - dyeDissipation 0.99 → text stays at ~30% density at 2s,
    //     fades to invisible by ~5s. Readable window of ~3s.
    //   - confinement 8 → mild vorticity, doesn't tear letterforms
    // Ambient wandering points OFF — that was the source of the
    // "storm pulling to upper-left" feel; the text should sit on
    // paper, not float in turbulent ink.
    orchestrator.init(gl, {
      ...getTierConfig("medium"),
      velocityDissipation: 0.95,
      dyeDissipation: 0.99,
      confinement: 8,
    });
    orchestrator.setAmbientEnabled(false);
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
 * One clean stamp per word. The previous multi-stamp + velocity-
 * perturbation pass made the text unreadable: it landed at the same
 * tick as a turbulent shockwave and got shredded before the toon
 * shader could resolve letterforms. Now: single stamp with enough
 * strength to peg the dye field, no velocity injection. The
 * orchestrator's slow dissipation does the dissolving.
 *
 * The `_orchestrator` parameter is kept in the signature for symmetry
 * with future-me wanting to add a SOFT velocity hint (single splat
 * at canvas centre, low force) — not used yet.
 */
function stampWord(stamper: TextStamper, _orchestrator: FluidOrchestrator, word: string) {
  stamper.stampText(word, randomSpot(), 1.4, 3);
}
