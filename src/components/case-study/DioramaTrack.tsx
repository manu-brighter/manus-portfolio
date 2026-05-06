"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSceneVisibility } from "@/lib/sceneVisibility";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * DioramaTrack — wraps the Case Study diorama (illustration + cards),
 * pins the section vertically, translates the inner track horizontally
 * as the user scrolls.
 *
 * vh-based coordinate system: the diorama is intrinsically 4200×1000
 * (viewBox units). Rendered at height: 100vh, width: 420vh — so the
 * track scales consistently across normal desktop and ultrawide
 * displays. Ink-column fluid sim is rendered separately by parent.
 *
 * Mobile (<768px) and reduced-motion: pin disabled, children render
 * in a vertical fallback flow (parent passes a `mobileFallback` prop
 * with a vertical-stack representation).
 */

const MOBILE_BREAKPOINT = 768;
const TRACK_WIDTH_VH = 420;

type Props = {
  /** Diorama content — typically <DioramaIllustration /> + <DioramaCards />. */
  children: ReactNode;
  /** Vertical-stack fallback rendered on mobile / reduced-motion. */
  mobileFallback: ReactNode;
};

export function DioramaTrack({ children, mobileFallback }: Props) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const sceneHidden = useSceneVisibility((s) => s.hidden);

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

    let raf2 = 0;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const trackWidth = track.scrollWidth;
        const viewportWidth = section.clientWidth;
        let distance = trackWidth - viewportWidth;
        if (distance <= 0) return;

        triggerRef.current = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${distance}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            distance = track.scrollWidth - section.clientWidth;
          },
          onUpdate: (self) => {
            gsap.set(track, { x: -distance * self.progress });
          },
        });

        ScrollTrigger.refresh();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      triggerRef.current?.kill(true);
      triggerRef.current = null;
      gsap.set(track, { x: 0 });
    };
  }, [reducedMotion, isMobile]);

  // Pre-unmount cleanup: when the user clicks a playground card,
  // SceneVisibilityGate flips `sceneHidden=true` (one frame later via
  // rAF, per the previous fix). Kill the ScrollTrigger here BEFORE
  // React starts unmounting the page tree — otherwise the pin-spacer
  // (a ScrollTrigger-injected sibling outside React's reconciliation
  // tree) confuses React's removeChild and throws NotFoundError.
  useEffect(() => {
    if (!sceneHidden) return;
    triggerRef.current?.kill(true);
    triggerRef.current = null;
  }, [sceneHidden]);

  if (isMobile || reducedMotion) {
    return (
      <section
        id="case-study"
        aria-labelledby="case-study-heading"
        className="relative bg-paper py-20"
      >
        {mobileFallback}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="case-study"
      aria-labelledby="case-study-heading"
      className="relative h-screen overflow-hidden bg-paper"
    >
      <div ref={trackRef} className="relative h-full" style={{ width: `${TRACK_WIDTH_VH}vh` }}>
        {children}
      </div>
    </section>
  );
}
