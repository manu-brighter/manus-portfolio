"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { capDPR } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";

/**
 * InkCursor — the cursor IS an ink stroke.
 *
 * The native cursor is hidden site-wide while this is active
 * (`html[data-ink-cursor] * { cursor: none }` in globals.css — user
 * decision: only the ink cursor should be visible), replaced by a
 * head dot that hugs the pointer tightly plus a continuous tapering
 * trail.
 *
 * Trail rendering: a single FILLED variable-width polygon around the
 * smoothed pointer history — per-point normals offset by half the
 * tapered width, one `fill()` per frame. One fill means no
 * overlapping segment caps, which is what made the v2 stroke-per-
 * segment approach read as "dots connected by lines" (user feedback).
 * Coordinates are canvas-rect-relative (not raw client coords), which
 * kills the offset users saw when the fixed canvas didn't sit exactly
 * at the viewport origin.
 *
 * Color comes from the canvas' computed `color` (text-ink class) so
 * it follows the sim theme; `.ink-cursor-layer` flips multiply ->
 * screen blending in night mode (light ink would multiply to black).
 *
 * Trail sampling rides the shared RAF (`subscribe`), the head dot
 * rides gsap.quickTo on gsap.ticker — same frame, one clock.
 *
 * Not mounted on coarse pointers or under reduced motion (both also
 * skip the cursor-hiding attribute, so the native cursor stays).
 */

const DOT_SIZE_PX = 10;
const DOWN_SCALE = 1.6;
/** Over interactive elements the head swells and thins — ink
 *  spreading toward the thing you can press. */
const HOVER_SCALE = 2.4;
const HOVER_OPACITY = 0.35;
const INTERACTIVE_SELECTOR = "a, button, label, input, textarea, select, [role='button']";

/** Trail history length (samples at ~60Hz ≈ 400ms of movement). */
const TRAIL_SAMPLES = 26;
/** Stroke width at the head end (tapers to 0 at the tail). */
const TRAIL_WIDTH_PX = 8;
/** Fill alpha — single fill, so this is the exact on-screen alpha. */
const TRAIL_ALPHA = 0.5;
/** Pointer-chase smoothing factor per 16ms frame. */
const CHASE = 0.35;
/** Head dot lag — near-instant since it replaces the native cursor. */
const HEAD_LAG_S = 0.08;

type Point = { x: number; y: number };

export function InkCursor() {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const dotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Guard inside the effect (not only via the null render) so a
    // mid-session preference flip re-runs cleanup, detaches the
    // document listeners and restores the native cursor.
    if (reducedMotion || coarsePointer) return;
    const dot = dotRef.current;
    const canvas = canvasRef.current;
    if (!dot || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Hide the native cursor while the ink cursor is alive.
    document.documentElement.setAttribute("data-ink-cursor", "");

    // --- canvas sizing -------------------------------------------------
    const dpr = capDPR(1.5);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      // Explicit CSS size so backing-store scale is exactly `dpr`
      // regardless of how inset-0 resolves.
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    const xTo = gsap.quickTo(dot, "x", { duration: HEAD_LAG_S, ease: "power2.out" });
    const yTo = gsap.quickTo(dot, "y", { duration: HEAD_LAG_S, ease: "power2.out" });

    let shown = false;
    let overInteractive = false;
    const restScale = () => (overInteractive ? HOVER_SCALE : 1);
    const restOpacity = () => (overInteractive ? HOVER_OPACITY : 1);

    // --- trail state ---------------------------------------------------
    const target: Point = { x: -100, y: -100 };
    const smooth: Point = { x: -100, y: -100 };
    const trail: Point[] = [];

    const onMove = (event: PointerEvent) => {
      // Rect-relative coordinates: immune to any offset between the
      // fixed canvas box and the viewport origin.
      const rect = canvas.getBoundingClientRect();
      target.x = event.clientX - rect.left;
      target.y = event.clientY - rect.top;
      if (!shown) {
        // First move: snap everything to position before fading in so
        // nothing streaks across from the parking spot.
        shown = true;
        smooth.x = target.x;
        smooth.y = target.y;
        trail.length = 0;
        gsap.set(dot, { x: event.clientX, y: event.clientY });
        gsap.to(dot, { opacity: restOpacity(), duration: 0.3, ease: "power2.out" });
      }
      xTo(event.clientX);
      yTo(event.clientY);
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

      const n = trail.length;
      if (n < 3) return;

      // Variable-width ribbon: offset each point along its local
      // normal by half the tapered width, walk the left edge tail ->
      // head, then the right edge head -> tail, single fill.
      const left: Point[] = [];
      const right: Point[] = [];
      for (let i = 0; i < n; i++) {
        // Safe: indices are clamped into 0..n-1
        const point = trail[i] as Point;
        const prev = trail[Math.max(0, i - 1)] as Point;
        const next = trail[Math.min(n - 1, i + 1)] as Point;
        let dx = next.x - prev.x;
        let dy = next.y - prev.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.0001) {
          dx = 1;
          dy = 0;
        } else {
          dx /= len;
          dy /= len;
        }
        const t = i / (n - 1);
        const half = (TRAIL_WIDTH_PX * t * t) / 2 + 0.2;
        left.push({ x: point.x - dy * half, y: point.y + dx * half });
        right.push({ x: point.x + dy * half, y: point.y - dx * half });
      }

      ctx.fillStyle = getComputedStyle(canvas).color;
      ctx.globalAlpha = TRAIL_ALPHA;
      ctx.beginPath();
      const start = left[0] as Point;
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < n; i++) {
        const p = left[i] as Point;
        ctx.lineTo(p.x, p.y);
      }
      for (let i = n - 1; i >= 0; i--) {
        const p = right[i] as Point;
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }, 40);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      document.documentElement.removeAttribute("data-ink-cursor");
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
      {/* z-[10001]: above EVERYTHING incl. Nav (50), Loader (9999) and
          InkWipeOverlay (10000) — the native cursor is hidden, so this
          IS the cursor and must never disappear behind chrome.
          pointer-events-none + multiply/screen blend keep it from
          obscuring anything meaningfully. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        tabIndex={-1}
        className="ink-cursor-layer pointer-events-none fixed top-0 left-0 z-[10001] hidden text-ink mix-blend-multiply md:block"
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="ink-cursor-layer pointer-events-none fixed top-0 left-0 z-[10001] hidden rounded-full bg-ink mix-blend-multiply md:block"
        style={{ width: DOT_SIZE_PX, height: DOT_SIZE_PX }}
      />
    </>
  );
}
