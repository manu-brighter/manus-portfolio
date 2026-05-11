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

  // Active stamp-reveal timers. `stampWord` schedules ~23 setTimeouts
  // per call (20 strips + 3 wave bursts); each registers its ID here
  // so cleanup can clear them and stop them firing against a disposed
  // GL context. Also doubles as an in-flight count for the idle-
  // rotation race-prevention check below.
  const stampTimersRef = useRef<Set<number>>(new Set<number>());
  const disposedRef = useRef(false);

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
      // velocity lingers ~2× longer than the prior 0.95 (~565ms
      // half-life vs ~225ms) so the post-write swirl doesn't settle
      // before the second turbulence wave lands.
      velocityDissipation: 0.975,
      // text-density slow-fade: ~70% at 1s, ~40% at 3s, gone by ~10s.
      dyeDissipation: 0.995,
      // Bumped 18 → 25: more pronounced curl/vorticity so the typed
      // word develops big swirling motion as it dissipates outward.
      // Approaching the "tears letterforms" ceiling (~30) but staying
      // under so the word is still readable during the reveal.
      confinement: 25,
      // Smaller hover-trail splats. Medium tier's 0.015 was tuned
      // for the home page hero where cursor ink is a feature; in
      // type-as-fluid the typed word is the star and the cursor
      // should be a delicate accent rather than competing with it.
      splatRadius: 0.005,
    });
    orchestrator.setAmbientEnabled(false);
    // Open the warmup gate so step() runs the full sim pipeline
    // (advect, vorticity, pressure-solve, etc.). Without this the
    // gate stays closed and step() short-circuits to render-toon
    // only — text gets stamped directly into the dye FBO via
    // injectDensityTexture but never advects or dissipates.
    // InkDropStudio + TypeAsFluidMiniSim already call start() at
    // their init sites; this was the missing-case after the warmup
    // gate landed.
    orchestrator.start();
    orchestratorRef.current = orchestrator;

    stamperRef.current = new TextStamper(gl, orchestrator);

    // Stamp an initial default word so the canvas isn't empty on first
    // paint. Picks a random one each mount so the experience varies.
    const initial =
      TYPE_AS_FLUID_DEFAULTS.defaultWords[
        Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
      ] ?? "MANUEL";
    stampWord(stamperRef.current, orchestrator, initial, stampTimersRef.current, disposedRef);

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
      // Flip disposed flag FIRST so any callback that's already
      // executing (race between clear + fire) early-returns instead
      // of touching disposed GL handles.
      disposedRef.current = true;
      for (const id of stampTimersRef.current) {
        window.clearTimeout(id);
      }
      stampTimersRef.current.clear();
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
      stampWord(stamper, orchestrator, text, stampTimersRef.current, disposedRef);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [text]);

  // ---- Idle re-stamp: every 5s after the last keystroke, refresh
  // whichever word is currently most relevant. If the user has typed
  // something into the input, the rotation re-stamps THAT word (in a
  // fresh random Riso ink each time); otherwise pulls the next default
  // from TYPE_AS_FLUID_DEFAULTS.
  //
  // Race protection: skip if a stamp-reveal is already in flight
  // (stampTimersRef non-empty). Without this, the 5s interval could
  // fire 4.75s into a typing-debounce reveal that itself runs ~2.45s,
  // producing two overlapping 23-timer animations with cross-color
  // bleed. The size check is cheap and exact.
  useEffect(() => {
    const handle = window.setInterval(() => {
      const sinceTyped = performance.now() - lastTypedAtRef.current;
      if (lastTypedAtRef.current !== 0 && sinceTyped < 3000) return;
      if (stampTimersRef.current.size > 0) return;
      const stamper = stamperRef.current;
      const orchestrator = orchestratorRef.current;
      if (!stamper || !orchestrator) return;
      const word =
        textRef.current.length > 0
          ? textRef.current
          : (TYPE_AS_FLUID_DEFAULTS.defaultWords[
              Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
            ] ?? "MANUEL");
      stampWord(stamper, orchestrator, word, stampTimersRef.current, disposedRef);
    }, 5000);
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
        <div className="flex items-stretch gap-2">
          <input
            id="type-as-fluid-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 24))}
            placeholder={t("inputPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            maxLength={24}
            className="type-h2 flex-1 border-[1.5px] border-ink bg-paper px-4 py-3 text-center text-ink placeholder:text-ink-faint focus:outline-none focus:shadow-[3px_3px_0_var(--color-ink)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-[transform,box-shadow]"
            style={{ fontStyle: "italic", letterSpacing: "0.05em" }}
          />
          <button
            type="button"
            aria-label={t("triggerLabel")}
            onClick={() => {
              const stamper = stamperRef.current;
              const orchestrator = orchestratorRef.current;
              if (!stamper || !orchestrator) return;
              const word =
                textRef.current.length > 0
                  ? textRef.current
                  : (TYPE_AS_FLUID_DEFAULTS.defaultWords[
                      Math.floor(Math.random() * TYPE_AS_FLUID_DEFAULTS.defaultWords.length)
                    ] ?? "MANUEL");
              stampWord(stamper, orchestrator, word, stampTimersRef.current, disposedRef);
            }}
            className="grid aspect-square shrink-0 min-w-[4.5rem] place-items-center border-[1.5px] border-ink bg-paper text-ink text-2xl leading-none shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      </div>
    </ExperimentChrome>
  );
}

function randomSpot(): "rose" | "amber" | "mint" | "violet" {
  return SPOT_KEYS[Math.floor(Math.random() * SPOT_KEYS.length)] ?? "rose";
}

// Stamp-pipeline tunables — module-level so they're shared across all
// calls instead of allocated per-invocation. The values fit a hot loop
// (5s idle re-stamp × overlapping typing debounce) without churn.
const STAMP_STRIPS = 20;
const STAMP_TOTAL_MS = 1200;
// Ease-in-out cubic: pen accelerates from a soft start, races through
// the middle of the word, decelerates into a calm finish. Classic
// handwriting motion feel — slow → fast → slow.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// Per-splat radius overrides — global splatRadius (0.005) is tuned
// for the delicate cursor trail; word-bloom velocity injections need
// far bigger spatial extent to actually sweep the dye field around
// instead of poking pinpoint holes that the sim shrugs off.
const RADIUS_WET_PEN = 0.018;
const RADIUS_BLOOM = 0.055;
const RADIUS_STIR = 0.04;

const TRANSPARENT = [0, 0, 0] as const;

/**
 * Stamp a word calligraphy-style: progressive left→right strip-reveal,
 * then nudge gently into motion.
 *
 * Pipeline per call:
 *   - Pick one Riso ink for the whole word (random spot). All strips
 *     paint the same color so the result reads as "one continuous
 *     stroke" rather than rainbow letters.
 *   - Schedule 20 strips over 1200ms. Each strip stamps only the
 *     `[clipFrom..clipTo]` slice of the word's bounding box — the
 *     freshly-revealed slice, never the part that's already inked.
 *   - Clip range advances on ease-in-out cubic so the visual "pen tip"
 *     starts slow, races through the middle, and decelerates at the
 *     end — classic handwriting cadence.
 *   - Strip stamps run with strength 1.4 + 1 blur iter, same as the
 *     prior instant stamp — each slice is a small area so it doesn't
 *     compound.
 *   - 3 post-write waves nudge the now-finished word into motion:
 *     radial bloom at +60ms, turbulence stir at +550ms, late swirl
 *     at +1250ms. With confinement: 25 + velocity dissipation 0.975
 *     these carry for ~2s before the slow-fade takes over.
 *
 * Timer discipline: every setTimeout registers its ID in `timers` so
 * the component's unmount cleanup can clear them and short-circuit
 * the disposed-flag check inside each callback. Without this, a fast
 * unmount (route change while a stamp is running) would fire the
 * remaining timers ~2.5s later against a disposed GL context.
 */
function stampWord(
  stamper: TextStamper,
  orchestrator: FluidOrchestrator,
  word: string,
  timers: Set<number>,
  disposedRef: { current: boolean },
) {
  const color = randomSpot();

  const schedule = (fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (disposedRef.current) return;
      fn();
    }, delayMs);
    timers.add(id);
  };

  for (let i = 1; i <= STAMP_STRIPS; i++) {
    const clipFrom = easeInOutCubic((i - 1) / STAMP_STRIPS);
    const clipTo = easeInOutCubic(i / STAMP_STRIPS);
    const at = (i / STAMP_STRIPS) * STAMP_TOTAL_MS;
    schedule(() => {
      stamper.stampText(word, color, 1.4, 1, clipFrom, clipTo);

      // Wet-pen-tip nudge — velocity splat trailing the freshly inked
      // strip, angled down + outward, so the ink drips behind the
      // moving pen instead of sitting frozen.
      const stripCenter = (clipFrom + clipTo) * 0.5;
      const x = 0.15 + stripCenter * 0.7;
      const y = 0.5 + (Math.random() - 0.5) * 0.08;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 0.15 + Math.random() * 0.15;
      orchestrator.injectSplat(
        x,
        y,
        TRANSPARENT,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        RADIUS_WET_PEN,
      );
    }, at);
  }

  // Wave 1: radial bloom — 16 large velocity splats on a ring around
  // the word's center pushing outward. RADIUS_BLOOM ~ 11× global
  // splatRadius creates real sweeping currents that pull the dye into
  // long tendrils, not pinpoint dimples.
  schedule(() => {
    const N = 16;
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const radius = 0.1 + Math.random() * 0.15;
      const x = 0.5 + Math.cos(angle) * radius * 1.2;
      const y = 0.5 + Math.sin(angle) * radius * 0.9;
      const speed = 0.7 + Math.random() * 0.6;
      orchestrator.injectSplat(
        x,
        y,
        TRANSPARENT,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        RADIUS_BLOOM,
      );
    }
  }, STAMP_TOTAL_MS + 60);

  // Wave 2: secondary turbulence ~500ms after the bloom — keeps the
  // dye moving organically instead of coasting back to rest. Sized
  // between wet-pen and bloom so it stirs without re-exploding.
  schedule(() => {
    for (let i = 0; i < 14; i++) {
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.2 + Math.random() * 0.6;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.35 + Math.random() * 0.35;
      orchestrator.injectSplat(
        x,
        y,
        TRANSPARENT,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        RADIUS_STIR,
      );
    }
  }, STAMP_TOTAL_MS + 550);

  // Wave 3: late slow swirl ~1200ms after Wave 1 — tiny pull/push so
  // the dye keeps drifting into the tail of the dissipation window.
  schedule(() => {
    for (let i = 0; i < 8; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.25 + Math.random() * 0.5;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.18 + Math.random() * 0.18;
      orchestrator.injectSplat(
        x,
        y,
        TRANSPARENT,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        RADIUS_STIR,
      );
    }
  }, STAMP_TOTAL_MS + 1250);
}
