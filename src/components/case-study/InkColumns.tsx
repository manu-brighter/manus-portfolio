"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * InkColumns — two persistent vertical wavy ink shapes at viewport edges.
 *
 * The case-study horizontal-scroll concept is "stations as paper notes
 * flowing on a Foto-Tisch from a right-edge ink source toward a left-edge
 * ink drain". These two SVG columns are the visible anchors for that
 * mental model: thick organic ink shapes hugging the left + right
 * viewport edges with wavy inward-facing contours. Stations translate
 * UNDER them (the columns sit at z-30; the StationContainer track is
 * below). Result: paper appears to spawn from the right column and
 * dissolve into the left column as horizontal scroll progresses.
 *
 * Active only while `#case-study` is in/near the viewport — ScrollTrigger
 * with `start: "top bottom"` / `end: "bottom top"` fades them in well
 * before the section pins, fades them out as the section leaves.
 *
 * Replaces the earlier `CaseStudyInkFlow` splat-bus dispatch (which
 * dropped colored blobs into the hero FluidSim — wrong direction; that
 * read as ambient color noise, not the dark wavy edges Manuel sketched).
 *
 * Reduced-motion: opacity flips instantly without tween, columns are
 * still rendered (they're decorative-but-anchoring; without them the
 * "spawn from / dissolve into ink" framing is lost).
 */
export function InkColumns() {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const leftRef = useRef<SVGSVGElement>(null);
  const rightRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: "#case-study",
      start: "top bottom",
      end: "bottom top",
      onEnter: () => setActive(true),
      onLeave: () => setActive(false),
      onEnterBack: () => setActive(true),
      onLeaveBack: () => setActive(false),
    });
    return () => {
      st.kill();
    };
  }, []);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    if (reducedMotion) {
      gsap.set([left, right], { opacity: active ? 1 : 0 });
      return;
    }
    gsap.to([left, right], {
      opacity: active ? 1 : 0,
      duration: 0.6,
      ease: "power2.out",
    });
  }, [active, reducedMotion]);

  return (
    <>
      <svg
        ref={leftRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-30 h-screen"
        width="120"
        viewBox="0 0 120 1000"
        preserveAspectRatio="none"
        style={{ opacity: 0 }}
      >
        <title>Ink edge — left</title>
        <path
          d="M 0 0 L 120 0 Q 80 80 95 160 Q 110 240 70 320 Q 50 400 90 480 Q 105 560 65 640 Q 45 720 85 800 Q 100 880 60 960 L 60 1000 L 0 1000 Z"
          fill="var(--color-ink)"
        />
      </svg>
      <svg
        ref={rightRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 z-30 h-screen"
        width="120"
        viewBox="0 0 120 1000"
        preserveAspectRatio="none"
        style={{ opacity: 0 }}
      >
        <title>Ink edge — right</title>
        <path
          d="M 120 0 L 0 0 Q 40 80 25 160 Q 10 240 50 320 Q 70 400 30 480 Q 15 560 55 640 Q 75 720 35 800 Q 20 880 60 960 L 60 1000 L 120 1000 Z"
          fill="var(--color-ink)"
        />
      </svg>
    </>
  );
}
