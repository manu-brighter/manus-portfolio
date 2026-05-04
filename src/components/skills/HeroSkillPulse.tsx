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
      tl.to(halo, { opacity: 0.4, duration: 1.4, ease: "sine.inOut" })
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

  return (
    <div
      ref={haloRef}
      aria-hidden="true"
      className="pointer-events-none absolute -z-10"
      style={{
        top: "10%",
        left: "-10%",
        width: "120%",
        height: "80%",
        filter: "blur(40px)",
        mixBlendMode: "multiply",
        opacity: 0,
      }}
    />
  );
}
