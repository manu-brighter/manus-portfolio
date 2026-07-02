"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * InkCursor — a small ink dot trailing the pointer with fluid lag.
 *
 * The design thesis is "the cursor IS the force source"; this makes
 * that visible in the DOM layer too: a ~10px `bg-ink` dot multiplies
 * over paper and spot fills and drags behind the native cursor like
 * ink residue. The native cursor is deliberately NOT hidden
 * (`cursor: none` would cost affordances — text/link/resize cursors
 * all stay).
 *
 * Implementation: two `gsap.quickTo` tweens (x/y) fed from a document
 * pointermove listener — no React state, no re-renders; quickTo rides
 * `gsap.ticker`, which MotionProvider drives from the shared RAF.
 * Pointerdown grows the dot (the splat moment), release shrinks it.
 *
 * Not mounted on coarse pointers (no cursor to trail) or under
 * reduced motion. `pointer-events-none` + `aria-hidden` + z-30 (under
 * Nav z-50 / ScrollProgress z-40) — it can never intercept input or
 * cover focus rings.
 */

const DOT_SIZE_PX = 10;
const DOWN_SCALE = 1.6;
/** Over interactive elements the dot swells and thins — ink spreading
 *  toward the thing you can press. */
const HOVER_SCALE = 2.4;
const HOVER_OPACITY = 0.35;
const INTERACTIVE_SELECTOR = "a, button, label, input, textarea, select, [role='button']";

export function InkCursor() {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Guard inside the effect (not only via the null render) so a
    // mid-session preference flip re-runs cleanup and detaches the
    // document listeners.
    if (reducedMotion || coarsePointer) return;
    const dot = dotRef.current;
    if (!dot) return;

    // Center the dot on the pointer; start off-screen + hidden until
    // the first real pointer position arrives.
    gsap.set(dot, {
      xPercent: -50,
      yPercent: -50,
      x: -100,
      y: -100,
      scale: 1,
      opacity: 0,
    });

    const xTo = gsap.quickTo(dot, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.35, ease: "power3.out" });

    let shown = false;
    let overInteractive = false;
    const restingScale = () => (overInteractive ? HOVER_SCALE : 1);
    const restingOpacity = () => (overInteractive ? HOVER_OPACITY : 1);

    const onMove = (event: PointerEvent) => {
      if (!shown) {
        // First move: snap to position before fading in so the dot
        // doesn't streak across the viewport from its parking spot.
        shown = true;
        gsap.set(dot, { x: event.clientX, y: event.clientY });
        gsap.to(dot, { opacity: restingOpacity(), duration: 0.3, ease: "power2.out" });
      }
      xTo(event.clientX);
      yTo(event.clientY);
    };
    // Swell + thin over anything pressable — the ink "spreads toward"
    // the affordance. pointerover bubbles from the real target, so a
    // closest() check per boundary-cross is enough (no per-move cost).
    const onOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const next = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      if (next === overInteractive) return;
      overInteractive = next;
      gsap.to(dot, {
        scale: restingScale(),
        opacity: shown ? restingOpacity() : 0,
        duration: 0.25,
        ease: "power2.out",
      });
    };
    const onDown = () => {
      gsap.to(dot, { scale: DOWN_SCALE, duration: 0.18, ease: "power2.out" });
    };
    const onUp = () => {
      gsap.to(dot, { scale: restingScale(), duration: 0.3, ease: "power2.out" });
    };
    const onLeave = () => {
      shown = false;
      gsap.to(dot, { opacity: 0, duration: 0.2, ease: "power2.out" });
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
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
    <div
      ref={dotRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-30 hidden rounded-full bg-ink mix-blend-multiply md:block"
      style={{ width: DOT_SIZE_PX, height: DOT_SIZE_PX }}
    />
  );
}
