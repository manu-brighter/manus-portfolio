"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * InkSweep — section-enter/exit ink-wipe overlay. CSS+SVG only, no WebGL.
 *
 * Replaces the disabled InkTransition WebGL primitive (which painted
 * paper-color over the whole scene during the pinned phase). This
 * version is a single SVG ellipse that GSAP translates across the
 * viewport whenever the case-study section enters or leaves the
 * vertical scroll-band.
 *
 * Triggered by ScrollTrigger callbacks against `#case-study`:
 *   - onEnter:      sweep right -> left (1.2s)
 *   - onLeave:      sweep left -> right (1.2s)
 *   - onEnterBack:  sweep right -> left (1.2s)
 *   - onLeaveBack:  sweep left -> right (1.2s)
 *
 * Reduced-motion: component returns null. Nothing rendered, nothing
 * animated.
 */

const SWEEP_DURATION_S = 1.2;

export function InkSweep() {
  const reducedMotion = useReducedMotion();
  const overlayRef = useRef<SVGSVGElement>(null);
  const ellipseRef = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const overlay = overlayRef.current;
    const ellipse = ellipseRef.current;
    if (!overlay || !ellipse) return;

    gsap.set(overlay, { opacity: 0 });
    gsap.set(ellipse, { x: 150, y: 0 });

    const sweep = (direction: -1 | 1) => {
      // direction -1 means right -> left (enter); +1 means left -> right (leave).
      // We work in viewBox units (0..100 wide, 0..100 tall) since
      // preserveAspectRatio="none" stretches us to the viewport.
      const startX = direction === -1 ? 150 : -150;
      const endX = -startX;
      const tl = gsap.timeline();
      tl.set(ellipse, { x: startX });
      tl.to(overlay, { opacity: 0.85, duration: SWEEP_DURATION_S * 0.3, ease: "power2.out" }, 0);
      tl.to(ellipse, { x: 0, duration: SWEEP_DURATION_S * 0.5, ease: "power2.inOut" }, 0);
      tl.to(
        ellipse,
        { x: endX, duration: SWEEP_DURATION_S * 0.5, ease: "power2.inOut" },
        SWEEP_DURATION_S * 0.5,
      );
      tl.to(
        overlay,
        { opacity: 0, duration: SWEEP_DURATION_S * 0.4, ease: "power2.in" },
        SWEEP_DURATION_S * 0.6,
      );
    };

    const st = ScrollTrigger.create({
      trigger: "#case-study",
      start: "top center",
      end: "bottom center",
      onEnter: () => sweep(-1),
      onLeave: () => sweep(+1),
      onEnterBack: () => sweep(-1),
      onLeaveBack: () => sweep(+1),
    });

    return () => {
      st.kill();
      gsap.killTweensOf(overlay);
      gsap.killTweensOf(ellipse);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <svg
      ref={overlayRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
      style={{ opacity: 0, width: "100vw", height: "100vh" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <ellipse
        ref={ellipseRef}
        cx={50}
        cy={50}
        rx={70}
        ry={80}
        fill="var(--color-paper-shade)"
        style={{ filter: "blur(20px)" }}
      />
    </svg>
  );
}
