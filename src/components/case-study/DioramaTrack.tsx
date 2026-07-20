"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSceneVisibilityStore } from "@/lib/sceneVisibilityStore";

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
 * Fallback (width <768px OR height <900px) and reduced-motion: pin
 * disabled, children render in a vertical fallback flow (parent passes
 * a `mobileFallback` prop with a vertical-stack representation). The
 * height branch catches flat laptop viewports (1366x768, 1600x900,
 * 1280x720) where vh-scaled cards become unreadably small.
 */

const MOBILE_MAX_WIDTH = 768;
const FALLBACK_MAX_HEIGHT = 700; // empirically: 1920x1200 with 125% Windows DPI + browser chrome resolves to ~744px CSS-viewport height. 700 keeps that case on diorama while still routing real laptop classes (1366x768 / 1280x720 with chrome) to the fallback.
const TRACK_WIDTH_VH = 420;

type Props = {
  /** Diorama content — typically <DioramaIllustration /> + <DioramaCards />. */
  children: ReactNode;
  /** Vertical-stack fallback rendered on mobile / reduced-motion. */
  mobileFallback: ReactNode;
  /** Decorative section identity stamp shown top-left of the desktop diorama. */
  sectionLabel: string;
};

export function DioramaTrack({ children, mobileFallback, sectionLabel }: Props) {
  const reducedMotion = useReducedMotion();
  // The PIN TARGET is an inner wrapper, never the <section> itself.
  // ScrollTrigger's pin wraps the pinned element in a `div.pin-spacer`
  // — a DOM move React doesn't know about. The section is a direct
  // child of <main>, so pinning IT means React's deletion pass on
  // client-side navigation calls `main.removeChild(section)` while
  // the section actually sits inside the spacer → NotFoundError
  // ("Failed to execute 'removeChild'"). Passive-effect cleanup runs
  // AFTER that mutation, so kill(true)-on-unmount can't save it. With
  // the spacer inside the section, React only ever detaches the
  // unmoved section and the whole subtree goes with it — timing-proof.
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const sceneHidden = useSceneVisibilityStore((s) => s.hidden);

  useEffect(() => {
    const mq = window.matchMedia(
      `(max-width: ${MOBILE_MAX_WIDTH - 1}px), (max-height: ${FALLBACK_MAX_HEIGHT - 1}px)`,
    );
    setUseFallback(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setUseFallback(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || useFallback) return;
    const pinEl = pinRef.current;
    const track = trackRef.current;
    if (!pinEl || !track) return;

    let raf2 = 0;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const trackWidth = track.scrollWidth;
        const viewportWidth = pinEl.clientWidth;
        let distance = trackWidth - viewportWidth;
        if (distance <= 0) return;

        triggerRef.current = ScrollTrigger.create({
          trigger: pinEl,
          start: "top top",
          end: () => `+=${distance}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            distance = track.scrollWidth - pinEl.clientWidth;
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
  }, [reducedMotion, useFallback]);

  // Early cleanup on the playground path: PlaygroundCard flips
  // `sceneHidden=true` before its route push, so killing here reverts
  // the pin while the wipe still covers the viewport (no layout jump
  // mid-transition). NOT load-bearing for correctness anymore — the
  // inner-wrapper pin above keeps React's deletion pass safe on every
  // navigation path, including /cv + legal routes where the
  // destination layout's SceneVisibilityGate effect runs only after
  // the old tree is already gone.
  useEffect(() => {
    if (!sceneHidden) return;
    triggerRef.current?.kill(true);
    triggerRef.current = null;
  }, [sceneHidden]);

  if (useFallback || reducedMotion) {
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
    // The section is deliberately unstyled height-wise: the pin-spacer
    // that ScrollTrigger injects around the inner wrapper dictates the
    // section's height during and after the pin.
    <section id="case-study" aria-labelledby="case-study-heading" className="relative bg-paper">
      <div ref={pinRef} className="relative h-screen overflow-hidden bg-paper">
        {/* Floating section identity stamp — visible on desktop diorama only. */}
        <p
          aria-hidden="true"
          className="absolute top-6 left-6 z-10 type-label-stamp text-ink-muted"
        >
          {sectionLabel}
        </p>
        <div ref={trackRef} className="relative h-full" style={{ width: `${TRACK_WIDTH_VH}vh` }}>
          {children}
        </div>
      </div>
    </section>
  );
}
