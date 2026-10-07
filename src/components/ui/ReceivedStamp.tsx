"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { gsapEase } from "@/lib/motion/gsapEase";
import { dur } from "@/lib/motion/tokens";

/**
 * ReceivedStamp — the contact form's "sent" moment.
 *
 * Same choreography as the skills' VibecodedStamp (an ink stamp landing:
 * scale 1.6 + -8deg + transparent -> resting size, a rose halo pulsing
 * once behind it), but it fires on MOUNT rather than on viewport entry:
 * it appears right where the visitor just clicked Send. Transform and
 * opacity only. Reduced motion renders the resting stamp statically.
 *
 * Decorative: the status line in the form's aria-live region already
 * announces success, so the stamp is aria-hidden to avoid a second
 * announcement.
 */

/** Resting tilt of the landed stamp (degrees). */
const REST_ROTATE = -4;

export function ReceivedStamp({ label }: { label: string }) {
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);

  // Layout effect: the stamp mounts mid-session (status -> sent), so
  // the from-state must be set before first paint or it flashes at rest.
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    const halo = haloRef.current;
    if (!wrap || !halo) return;

    const tl = gsap.timeline();
    tl.fromTo(
      wrap,
      { scale: 1.6, rotate: -8, opacity: 0 },
      { scale: 1, rotate: REST_ROTATE, opacity: 1, duration: dur.medium, ease: gsapEase().riso },
    )
      .fromTo(
        halo,
        { opacity: 0, scale: 0.6 },
        { opacity: 0.55, scale: 1.4, duration: dur.short, ease: "power2.out" },
        "<",
      )
      .to(halo, { opacity: 0, scale: 1.8, duration: 0.32, ease: "power1.out" });

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <span
      ref={wrapRef}
      aria-hidden="true"
      className="relative inline-block shrink-0"
      style={{ transform: `rotate(${REST_ROTATE}deg)` }}
    >
      <span
        ref={haloRef}
        className="pointer-events-none absolute inset-0 -z-10 rounded-sm opacity-0"
        style={{ backgroundColor: "var(--color-spot-rose)", filter: "blur(6px)" }}
      />
      <span className="type-label-stamp bg-paper text-ink" data-testid="contact-received-stamp">
        {label}
      </span>
    </span>
  );
}
