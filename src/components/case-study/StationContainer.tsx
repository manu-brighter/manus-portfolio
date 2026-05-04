"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * StationContainer — wraps the 6 Case Study stations, pins the section
 * vertically, translates the inner track horizontally as the user scrolls.
 *
 * Mobile (<768px): pin disabled, stations stack vertically in normal flow.
 * Reduced-motion: same as mobile — vertical stack, no scroll-jack.
 */

type Props = {
  /** The 6 stations as children. Each is rendered as a flex item in the horizontal track. */
  children: ReactNode;
};

const MOBILE_BREAKPOINT = 768;

export function StationContainer({ children }: Props) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const trackWidth = track.scrollWidth;
    const viewportWidth = section.clientWidth;
    const distance = trackWidth - viewportWidth;
    if (distance <= 0) return;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${distance}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: (self) => {
        gsap.set(track, { x: -distance * self.progress });
      },
    });

    return () => {
      trigger.kill();
      gsap.set(track, { x: 0 });
    };
  }, [reducedMotion, isMobile]);

  if (isMobile || reducedMotion) {
    return (
      <section id="case-study" aria-labelledby="case-study-heading" className="relative py-20">
        <div className="flex flex-col gap-20">{children}</div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="case-study"
      aria-labelledby="case-study-heading"
      className="relative h-screen overflow-hidden"
    >
      <div ref={trackRef} className="flex h-full" style={{ width: "max-content" }}>
        {children}
      </div>
    </section>
  );
}
