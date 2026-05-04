"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * HeroSkillPulse — ambient peripheral-vision marker behind the Skills
 * section's XXL "AI-Workflow & Vibecoding" hero block. A blurred
 * spot-color halo loops through the four Riso inks, rising and
 * fading every ~4 seconds. Subtle — the visitor barely registers it
 * consciously, but the section reads as "alive" rather than static.
 *
 * Mechanic: position absolute behind the hero text (parent provides
 * `position: relative`). Width/height ~120% / 80% of parent. GSAP
 * timeline ramps opacity 0 → 0.4 → 0 over 2.8s, holds at 0 for 1.2s,
 * then advances colour. Loops indefinitely.
 *
 * Reduced-motion: timeline killed at mount, halo stays at opacity 0.
 *
 * Place inside the hero-skill container; the timeline cleans up on
 * unmount.
 */

const COLORS = [
  "var(--color-spot-rose)",
  "var(--color-spot-amber)",
  "var(--color-spot-mint)",
  "var(--color-spot-violet)",
] as const;

export function HeroSkillPulse() {
  const reducedMotion = useReducedMotion();
  const haloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const halo = haloRef.current;
    if (!halo) return;

    gsap.set(halo, { opacity: 0 });
    let i = 0;
    let killed = false;

    const cycle = () => {
      if (killed) return;
      halo.style.backgroundColor = COLORS[i % COLORS.length] ?? COLORS[0];
      i++;
      const tl = gsap.timeline({ onComplete: cycle });
      tl.to(halo, { opacity: 0.55, duration: 1.4, ease: "sine.inOut" })
        .to(halo, { opacity: 0, duration: 1.4, ease: "sine.inOut" })
        .to({}, { duration: 1.2 });
    };
    cycle();

    return () => {
      killed = true;
      gsap.killTweensOf(halo);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  // Inset 0 + behind-via-DOM-order: parent uses `relative isolate` so
  // we form a stacking context and this halo (first DOM child) paints
  // behind subsequent siblings naturally. Dropping mix-blend-mode +
  // negative z-index (the previous version was invisible because the
  // article wasn't a stacking context, sending the halo behind body
  // paper) — direct opacity is more predictable and reads as a soft
  // spot-color glow against the paper backdrop.
  return (
    <div
      ref={haloRef}
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        top: "10%",
        left: "-10%",
        width: "120%",
        height: "80%",
        filter: "blur(48px)",
        opacity: 0,
      }}
    />
  );
}
