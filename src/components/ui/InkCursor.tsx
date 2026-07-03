"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * InkCursor — an ink dot with a tapering trail chasing the pointer.
 *
 * The design thesis is "the cursor IS the force source"; this makes
 * that visible in the DOM layer too: a ~10px `bg-ink` head dot plus a
 * handful of smaller, fainter followers, each with progressively more
 * quickTo lag — moving the pointer draws a tapering ink trail that
 * collapses back into the head at rest. The native cursor is
 * deliberately NOT hidden (`cursor: none` would cost affordances —
 * text/link/resize cursors all stay).
 *
 * Implementation: per-dot `gsap.quickTo` x/y tweens fed from a single
 * document pointermove listener — no React state, no re-renders;
 * quickTo rides `gsap.ticker`, which MotionProvider drives from the
 * shared RAF. Pointerdown grows the head (the splat moment); over
 * interactive elements it swells and thins (ink spreading toward the
 * affordance).
 *
 * Not mounted on coarse pointers (no cursor to trail) or under
 * reduced motion. `pointer-events-none` + `aria-hidden` + z-30 (under
 * Nav z-50 / ScrollProgress z-40) — it can never intercept input or
 * cover focus rings.
 */

/** Head first — trail dots taper in size and opacity. */
const DOT_SIZES_PX = [10, 7, 5.5, 4.5, 3.5, 3] as const;
const DOT_OPACITIES = [1, 0.45, 0.35, 0.28, 0.2, 0.14] as const;
/** quickTo lag per dot — the stagger IS the trail. */
const DOT_LAG_S = [0.18, 0.28, 0.38, 0.48, 0.58, 0.68] as const;

const DOWN_SCALE = 1.6;
/** Over interactive elements the head swells and thins — ink
 *  spreading toward the thing you can press. */
const HOVER_SCALE = 2.4;
const HOVER_OPACITY = 0.35;
const INTERACTIVE_SELECTOR = "a, button, label, input, textarea, select, [role='button']";

export function InkCursor() {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const dotsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Guard inside the effect (not only via the null render) so a
    // mid-session preference flip re-runs cleanup and detaches the
    // document listeners.
    if (reducedMotion || coarsePointer) return;
    const dots = dotsRef.current.filter((el): el is HTMLDivElement => el !== null);
    const head = dots[0];
    if (!head || dots.length !== DOT_SIZES_PX.length) return;

    // Center each dot on the pointer; park off-screen + hidden until
    // the first real pointer position arrives.
    for (const dot of dots) {
      gsap.set(dot, {
        xPercent: -50,
        yPercent: -50,
        x: -100,
        y: -100,
        scale: 1,
        opacity: 0,
      });
    }

    const movers = dots.map((dot, i) => ({
      xTo: gsap.quickTo(dot, "x", { duration: DOT_LAG_S[i] ?? 0.7, ease: "power3.out" }),
      yTo: gsap.quickTo(dot, "y", { duration: DOT_LAG_S[i] ?? 0.7, ease: "power3.out" }),
    }));

    let shown = false;
    let overInteractive = false;
    const headRestScale = () => (overInteractive ? HOVER_SCALE : 1);
    const headRestOpacity = () => (overInteractive ? HOVER_OPACITY : DOT_OPACITIES[0]);

    const fadeAll = (visible: boolean) => {
      dots.forEach((dot, i) => {
        gsap.to(dot, {
          opacity: visible ? (i === 0 ? headRestOpacity() : (DOT_OPACITIES[i] ?? 0)) : 0,
          duration: visible ? 0.3 : 0.2,
          ease: "power2.out",
        });
      });
    };

    const onMove = (event: PointerEvent) => {
      if (!shown) {
        // First move: snap everything to position before fading in so
        // the trail doesn't streak across from the parking spot.
        shown = true;
        for (const dot of dots) gsap.set(dot, { x: event.clientX, y: event.clientY });
        fadeAll(true);
      }
      for (const mover of movers) {
        mover.xTo(event.clientX);
        mover.yTo(event.clientY);
      }
    };
    // Swell + thin over anything pressable. pointerover bubbles from
    // the real target, so a closest() check per boundary-cross is
    // enough (no per-move cost).
    const onOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const next = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      if (next === overInteractive) return;
      overInteractive = next;
      gsap.to(head, {
        scale: headRestScale(),
        opacity: shown ? headRestOpacity() : 0,
        duration: 0.25,
        ease: "power2.out",
      });
    };
    const onDown = () => {
      gsap.to(head, { scale: DOWN_SCALE, duration: 0.18, ease: "power2.out" });
    };
    const onUp = () => {
      gsap.to(head, { scale: headRestScale(), duration: 0.3, ease: "power2.out" });
    };
    const onLeave = () => {
      shown = false;
      fadeAll(false);
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
      for (const dot of dots) gsap.killTweensOf(dot);
    };
  }, [reducedMotion, coarsePointer]);

  if (reducedMotion || coarsePointer) return null;

  return (
    <>
      {DOT_SIZES_PX.map((size, i) => (
        <div
          // Static config array — index identity is stable.
          key={`ink-dot-${size}`}
          ref={(el) => {
            dotsRef.current[i] = el;
          }}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-30 hidden rounded-full bg-ink mix-blend-multiply md:block"
          style={{ width: size, height: size }}
        />
      ))}
    </>
  );
}
