"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dur, ease } from "@/lib/motion/tokens";

/**
 * VibecodedStamp — wraps the [vibecoded] marker text and animates it
 * into place like a real Riso-stamp landing on the skill word.
 *
 * Mechanic: starts scaled 1.6, rotated -8°, opacity 0. On viewport-
 * entry of the parent skill-tier container (one-shot via IO), tweens
 * to scale 1, rotate 0°, opacity 1 with ease `riso`. A brief shadow-
 * burst pulses behind the stamp at impact (rose halo, 200ms fade).
 *
 * Stagger between sibling stamps in the same tier is handled by the
 * parent — VibecodedStamp doesn't know about its siblings. The parent
 * passes a `delay` (seconds) per stamp.
 */

type Props = {
  /** Text to render inside the stamp (typically "vibecoded"). */
  children: ReactNode;
  /** Stagger delay applied to the GSAP tween, in seconds. */
  delay?: number;
};

export function VibecodedStamp({ children, delay = 0 }: Props) {
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    const halo = haloRef.current;
    if (!wrap || !halo) return;

    gsap.set(wrap, { scale: 1.6, rotate: -8, opacity: 0 });
    gsap.set(halo, { opacity: 0, scale: 0.6 });

    let fired = false;
    const easeCurve = `cubic-bezier(${ease.riso.join(",")})`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired) continue;
          fired = true;
          observer.disconnect();

          const tl = gsap.timeline({ delay });
          tlRef.current = tl;
          tl.to(wrap, {
            scale: 1,
            rotate: 0,
            opacity: 1,
            duration: dur.medium,
            ease: easeCurve,
          });
          tl.to(
            halo,
            { opacity: 0.55, scale: 1.4, duration: dur.short, ease: "power2.out" },
            "<",
          ).to(halo, { opacity: 0, scale: 1.8, duration: 0.32, ease: "power1.out" });
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      tlRef.current?.kill();
    };
  }, [reducedMotion, delay]);

  return (
    <span ref={wrapRef} className="relative inline-block px-1.5 align-baseline">
      <span
        ref={haloRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-sm"
        style={{ backgroundColor: "var(--color-spot-rose)", filter: "blur(6px)" }}
      />
      <span className="type-label inline-block border-[1.5px] border-ink bg-paper px-1 py-0.5 text-ink">
        {children}
      </span>
    </span>
  );
}
