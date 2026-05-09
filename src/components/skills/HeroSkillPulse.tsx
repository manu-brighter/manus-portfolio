"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * HeroSkillPulse — ambient peripheral-vision marker behind the Skills
 * section's XXL "AI-Workflow & Vibecoding" hero block.
 *
 * Earlier versions ran a GSAP timeline that cycled through the four
 * Riso spot colours on a 0 → 0.55 → 0 opacity pulse. Manuel found the
 * fade-in/out reading as a colour blink — distracting in peripheral
 * vision rather than ambient. Replaced with a single conic-gradient
 * halo that holds a constant low opacity and slowly rotates +
 * breathes via a CSS keyframe (`hero-skill-aura-drift` in globals.css).
 *
 * The conic gradient cycles through all four Riso inks in one full
 * loop, so the dominant colour at any given point in the rotation
 * shifts gradually rather than stepping. 28s per turn is slow enough
 * that the motion reads as "alive" without ever pulling the eye to
 * it. Pure CSS — no JS, no GSAP timeline, no cleanup races.
 *
 * Reduced-motion: render nothing (component returns null).
 *
 * Place inside the hero-skill container (parent must provide
 * `position: relative isolate` for proper stacking context).
 */

export function HeroSkillPulse() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="hero-skill-aura pointer-events-none absolute"
      style={{
        top: "10%",
        left: "-10%",
        width: "120%",
        height: "80%",
        borderRadius: "50%",
        filter: "blur(56px)",
        opacity: 0.22,
        background:
          "conic-gradient(from 0deg at 50% 50%, var(--color-spot-rose), var(--color-spot-amber), var(--color-spot-mint), var(--color-spot-violet), var(--color-spot-rose))",
        willChange: "transform",
      }}
    />
  );
}
