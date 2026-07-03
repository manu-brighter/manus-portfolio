"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { capDPR } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";

/**
 * InkCursor — an ink head dot with a continuous tapering trail.
 *
 * The design thesis is "the cursor IS the force source"; this makes
 * that visible in the DOM layer too. The trail is a Canvas2D polyline
 * through the last ~350ms of (smoothed) pointer positions, stroked
 * with width and alpha tapering toward the tail — a clean single
 * brush stroke, not a chain of dots (v1 used staggered follower dots
 * and read as exactly that; user feedback killed it). At rest the
 * history collapses onto one point and the stroke vanishes.
 *
 * Color comes from the canvas' computed `color` (text-ink class), so
 * it follows the sim theme; the `.ink-cursor-layer` class flips
 * multiply -> screen blending in night mode (light ink would multiply
 * to black on dark paper).
 *
 * The head dot stays a DOM element driven by gsap.quickTo: it swells
 * over interactive elements (ink spreading toward the affordance) and
 * pulses on press. Trail sampling rides the shared RAF (`subscribe`),
 * quickTo rides gsap.ticker — same frame, one clock.
 *
 * Not mounted on coarse pointers (no cursor to trail) or under
 * reduced motion. `pointer-events-none` + `aria-hidden` + z-30 (under
 * Nav z-50 / ScrollProgress z-40) — it can never intercept input or
 * cover focus rings.
 */

const DOT_SIZE_PX = 10;
const DOWN_SCALE = 1.6;
/** Over interactive elements the head swells and thins — ink
 *  spreading toward the thing you can press. */
const HOVER_SCALE = 2.4;
const HOVER_OPACITY = 0.35;
const INTERACTIVE_SELECTOR = "a, button, label, input, textarea, select, [role='button']";

/** Trail history length (samples at ~60Hz ≈ 350ms of movement). */
const TRAIL_SAMPLES = 22;
/** Max stroke width at the head end. */
const TRAIL_WIDTH_PX = 7;
/** Max stroke alpha at the head end. */
const TRAIL_ALPHA = 0.45;
/** Pointer-chase smoothing factor per 16ms frame. */
const CHASE = 0.32;

export function InkCursor() {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const dotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Guard inside the effect (not only via the null render) so a
    // mid-session preference flip re-runs cleanup and detaches the
    // document listeners.
    if (reducedMotion || coarsePointer) return;
    const dot = dotRef.current;
    const canvas = canvasRef.current;
    if (!dot || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- canvas sizing -------------------------------------------------
    const dpr = capDPR(1.5);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    resize();
    window.addEventListener("resize", resize);

    // --- head dot ------------------------------------------------------
    gsap.set(dot, {
      xPercent: -50,
      yPercent: -50,
      x: -100,
      y: -100,
      scale: 1,
      opacity: 0,
    });
    const xTo = gsap.quickTo(dot, "x", { duration: 0.18, ease: "power3.out" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.18, ease: "power3.out" });

    let shown = false;
    let overInteractive = false;
    const restScale = () => (overInteractive ? HOVER_SCALE : 1);
    const restOpacity = () => (overInteractive ? HOVER_OPACITY : 1);

    // --- trail state ---------------------------------------------------
    const target = { x: -100, y: -100 };
    const smooth = { x: -100, y: -100 };
    const trail: { x: number; y: number }[] = [];

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!shown) {
        // First move: snap everything to position before fading in so
        // nothing streaks across from the parking spot.
        shown = true;
        smooth.x = target.x;
        smooth.y = target.y;
        trail.length = 0;
        gsap.set(dot, { x: target.x, y: target.y });
        gsap.to(dot, { opacity: restOpacity(), duration: 0.3, ease: "power2.out" });
      }
      xTo(target.x);
      yTo(target.y);
    };
    // Swell + thin over anything pressable. pointerover bubbles from
    // the real target, so a closest() check per boundary-cross is
    // enough (no per-move cost).
    const onOver = (event: PointerEvent) => {
      const el = event.target instanceof Element ? event.target : null;
      const next = Boolean(el?.closest(INTERACTIVE_SELECTOR));
      if (next === overInteractive) return;
      overInteractive = next;
      gsap.to(dot, {
        scale: restScale(),
        opacity: shown ? restOpacity() : 0,
        duration: 0.25,
        ease: "power2.out",
      });
    };
    const onDown = () => {
      gsap.to(dot, { scale: DOWN_SCALE, duration: 0.18, ease: "power2.out" });
    };
    const onUp = () => {
      gsap.to(dot, { scale: restScale(), duration: 0.3, ease: "power2.out" });
    };
    const onLeave = () => {
      shown = false;
      trail.length = 0;
      gsap.to(dot, { opacity: 0, duration: 0.2, ease: "power2.out" });
    };

    // --- trail render (shared RAF) --------------------------------------
    const unsubscribe = subscribe((deltaMs) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (!shown) return;

      // Frame-rate-independent chase toward the pointer.
      const k = 1 - (1 - CHASE) ** (deltaMs / 16.67);
      smooth.x += (target.x - smooth.x) * k;
      smooth.y += (target.y - smooth.y) * k;
      trail.push({ x: smooth.x, y: smooth.y });
      if (trail.length > TRAIL_SAMPLES) trail.shift();
      if (trail.length < 2) return;

      // Computed color follows the theme (text-ink on the canvas);
      // cheap enough to read per frame and immune to theme switches.
      ctx.strokeStyle = getComputedStyle(canvas).color;

      // One segment per sample pair, width + alpha tapering toward
      // the tail. Round caps overlap into a continuous brush stroke.
      for (let i = 1; i < trail.length; i++) {
        const prev = trail[i - 1] as { x: number; y: number };
        const point = trail[i] as { x: number; y: number };
        const progress = i / (trail.length - 1);
        ctx.globalAlpha = TRAIL_ALPHA * progress;
        ctx.lineWidth = Math.max(1, TRAIL_WIDTH_PX * progress);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }, 40);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(dot);
    };
  }, [reducedMotion, coarsePointer]);

  if (reducedMotion || coarsePointer) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        tabIndex={-1}
        className="ink-cursor-layer pointer-events-none fixed inset-0 z-30 hidden text-ink mix-blend-multiply md:block"
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="ink-cursor-layer pointer-events-none fixed top-0 left-0 z-30 hidden rounded-full bg-ink mix-blend-multiply md:block"
        style={{ width: DOT_SIZE_PX, height: DOT_SIZE_PX }}
      />
    </>
  );
}
