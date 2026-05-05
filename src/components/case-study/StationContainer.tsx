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

    let trigger: ScrollTrigger | null = null;
    let raf2 = 0;

    // Two-frame delay so React commit + child layout + font swap settle
    // before we measure scrollWidth — without this the first measurement
    // runs against an under-sized track (children not yet laid out at
    // their final 65vw widths) and the horizontal sweep ends prematurely.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const trackWidth = track.scrollWidth;
        const viewportWidth = section.clientWidth;
        let distance = trackWidth - viewportWidth;
        if (distance <= 0) return;

        trigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${distance}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            // Re-measure so end-distance tracks viewport / font / image
            // size changes after creation.
            distance = track.scrollWidth - section.clientWidth;
          },
          onUpdate: (self) => {
            gsap.set(track, { x: -distance * self.progress });
          },
        });

        // Final refresh after the trigger is wired so its end-distance
        // matches the freshly measured layout.
        ScrollTrigger.refresh();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      trigger?.kill();
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
      <div ref={trackRef} className="flex h-full items-center" style={{ width: "max-content" }}>
        {/* Leading spacer — centers the first station (32vw hook) in the
            viewport when track-x = 0. (100vw - 32vw)/2 = 34vw. */}
        <div aria-hidden="true" className="shrink-0" style={{ width: "34vw" }} />
        {children}
        {/* Trailing spacer — centers the last station (58vw public) when
            track-x = -distance. (100vw - 58vw)/2 = 21vw. */}
        <div aria-hidden="true" className="shrink-0" style={{ width: "21vw" }} />
      </div>
    </section>
  );
}
