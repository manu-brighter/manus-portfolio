"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { OverprintReveal } from "@/components/motion/OverprintReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PortfolioCardReveal — the meta-stage on the Portfolio-Card.
 *
 * Rest state: the real screenshot of the portfolio homepage.
 * Trigger (first of):
 *   1. IntersectionObserver one-shot at threshold 0.45
 *   2. Pointer hover (pointerenter)
 *
 * The choreography fires ONCE per session (component lifetime).
 * Subsequent hovers after first fire are no-ops.
 *
 * Reduced-motion: choreography skipped, only static screenshot renders.
 */

const REVEAL_THRESHOLD = 0.45;
/** When (since timeline start) the fade-out begins. Reveal is fully
 *  visible from ~0.4s (post fade-in) to this point, ~2.1s of full hold. */
const FADE_OUT_START_MS = 2500;
/** Duration of the fade-out tween. Total reveal lifetime ≈ FADE_OUT_START_MS + FADE_OUT_MS = 3.1s. */
const FADE_OUT_MS = 600;

type Props = {
  /** alt text for the static screenshot */
  alt: string;
  /** translation: surname (e.g. "Heller,") */
  surname: string;
  /** translation: given name (e.g. "Manuel.") */
  given: string;
  /** translation: SR-only announcement when reveal plays */
  ariaAnnouncement: string;
};

export function PortfolioCardReveal({
  alt,
  surname,
  given,
  ariaAnnouncement: _ariaAnnouncement,
}: Props) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    const screenshot = screenshotRef.current;
    const stage = stageRef.current;
    if (!container || !screenshot || !stage) return;

    gsap.set(stage, { opacity: 0 });
    gsap.set(screenshot, { opacity: 1 });

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;

      tlRef.current?.kill();
      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(screenshot, { opacity: 0.5, duration: 0.4, ease: "power2.out" }, 0);
      tl.to(stage, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
      tl.to(
        stage,
        { opacity: 0, duration: FADE_OUT_MS / 1000, ease: "power2.in" },
        FADE_OUT_START_MS / 1000,
      );
      tl.to(
        screenshot,
        { opacity: 1, duration: FADE_OUT_MS / 1000, ease: "power2.in" },
        FADE_OUT_START_MS / 1000,
      );
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !firedRef.current) fire();
        }
      },
      { threshold: REVEAL_THRESHOLD },
    );
    io.observe(container);

    const onHover = () => fire();
    container.addEventListener("pointerenter", onHover);

    return () => {
      io.disconnect();
      container.removeEventListener("pointerenter", onHover);
      tlRef.current?.kill();
      tlRef.current = null;
    };
  }, [reducedMotion]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <div ref={screenshotRef} className="absolute inset-0">
        <picture className="block h-full w-full">
          <source
            type="image/avif"
            srcSet="/projects/portfolio/homepage-480w.avif 480w, /projects/portfolio/homepage-800w.avif 800w, /projects/portfolio/homepage-1200w.avif 1200w"
            sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
          />
          <source
            type="image/webp"
            srcSet="/projects/portfolio/homepage-480w.webp 480w, /projects/portfolio/homepage-800w.webp 800w, /projects/portfolio/homepage-1200w.webp 1200w"
          />
          <img
            src="/projects/portfolio/homepage-800w.jpg"
            alt={alt}
            width={800}
            height={450}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover object-top"
          />
        </picture>
      </div>
      {!reducedMotion ? (
        <div
          ref={stageRef}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-paper/0"
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-baseline gap-2 px-4 text-[clamp(1.5rem,4vw,3rem)]">
            <span className="font-display italic text-ink leading-none">
              <OverprintReveal text={surname} className="inline-block" threshold={0.5} />
            </span>
            <FadeIn
              className="not-italic inline-block font-display text-ink"
              delay={0.12}
              ariaHidden
            >
              /
            </FadeIn>
            <span className="font-display italic text-ink leading-none">
              <OverprintReveal text={given} className="inline-block" threshold={0.5} delay={0.25} />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
