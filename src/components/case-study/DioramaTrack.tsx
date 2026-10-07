"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * Fallbacks (pin disabled, vertical flow):
 *   - narrow (width <768px): `mobileFallback`, the phone stack.
 *   - wide but short (width >=768px, height <700px) and reduced motion
 *     at desktop width: `wideFallback`, a desktop-width vertical layout
 *     (CaseStudyStacked). Flat laptop viewports (1366x768, 1280x720
 *     with browser chrome) land here because vh-scaled diorama cards
 *     get unreadably small, and they used to get the phone stack.
 */

const MOBILE_MAX_WIDTH = 768;
const FALLBACK_MAX_HEIGHT = 700; // empirically: 1920x1200 with 125% Windows DPI + browser chrome resolves to ~744px CSS-viewport height. 700 keeps that case on diorama while still routing real laptop classes (1366x768 / 1280x720 with chrome) to the fallback.
export const TRACK_WIDTH_VH = 420;

type Props = {
  /** Diorama content — typically <DioramaIllustration /> + <DioramaCards />. */
  children: ReactNode;
  /** Vertical-stack fallback for narrow viewports (<768px). */
  mobileFallback: ReactNode;
  /** Desktop-width vertical layout for short viewports and reduced motion. */
  wideFallback: ReactNode;
  /** Decorative section identity stamp shown top-left of the desktop diorama. */
  sectionLabel: string;
};

export function DioramaTrack({ children, mobileFallback, wideFallback, sectionLabel }: Props) {
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
  const sectionRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [short, setShort] = useState(false);
  const sceneHidden = useSceneVisibilityStore((s) => s.hidden);

  useEffect(() => {
    const narrowMq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH - 1}px)`);
    const shortMq = window.matchMedia(`(max-height: ${FALLBACK_MAX_HEIGHT - 1}px)`);
    const sync = () => {
      setNarrow(narrowMq.matches);
      setShort(shortMq.matches);
    };
    sync();
    narrowMq.addEventListener("change", sync);
    shortMq.addEventListener("change", sync);
    return () => {
      narrowMq.removeEventListener("change", sync);
      shortMq.removeEventListener("change", sync);
    };
  }, []);

  const useFallback = narrow || short;

  // Layout effect, not a post-paint rAF. ScrollToOnLoad's effect runs
  // after this, and a starved WebKit main thread can delay rAF past the
  // moment the jump has to be correct. Measuring here, the pin spacer
  // already exists when that jump reads section positions. A reused
  // section node can still carry the previous page's attribute; clear
  // it before the new pin is in, or the jump fires on the pre-pin layout.
  useLayoutEffect(() => {
    if (reducedMotion || useFallback) return;
    const pinEl = pinRef.current;
    const track = trackRef.current;
    const section = sectionRef.current;
    if (!pinEl || !track) return;
    section?.removeAttribute("data-case-study-layout");

    const trackWidth = track.scrollWidth;
    const viewportWidth = pinEl.clientWidth;
    let distance = trackWidth - viewportWidth;
    if (distance <= 0) {
      section?.setAttribute("data-case-study-layout", "flat");
      return;
    }

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
    section?.setAttribute("data-case-study-layout", "pinned");

    return () => {
      triggerRef.current?.kill(true);
      triggerRef.current = null;
      gsap.set(track, { x: 0 });
      section?.removeAttribute("data-case-study-layout");
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
        data-case-study-layout={narrow ? "phone" : "stacked"}
        aria-labelledby="case-study-heading"
        className="relative bg-paper py-20"
      >
        {narrow ? mobileFallback : wideFallback}
      </section>
    );
  }

  return (
    // The section is deliberately unstyled height-wise: the pin-spacer
    // that ScrollTrigger injects around the inner wrapper dictates the
    // section's height during and after the pin.
    <section
      ref={sectionRef}
      id="case-study"
      aria-labelledby="case-study-heading"
      className="relative bg-paper"
    >
      {/* Pin host: a keyed wrapper GSAP never moves. ScrollTrigger wraps
          the pinned div in a pin-spacer, so React must never be the one
          to detach the pinned div itself. Without this host, a RUNTIME
          switch to a fallback (resize below the width/height threshold,
          DevTools docking, toggling reduced motion) made React call
          section.removeChild(pinnedDiv) while that div sat inside the
          spacer: NotFoundError. Neither the passive kill(true) cleanup
          nor a layout-effect cleanup can prevent it, because React
          applies child deletions before the parent's effect cleanups.
          With the host, React removes the host (still a direct child of
          the section) and the spacer goes with it. The key keeps React
          from reusing this div for the fallback's own root div, which
          would bring the removeChild back one level down. */}
      <div key="diorama-pin-host">
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
      </div>
    </section>
  );
}
