"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { OverprintReveal } from "@/components/motion/OverprintReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PortfolioCardReveal — the meta-stage on the Portfolio-Card.
 *
 * Rest state: the real screenshot of the portfolio homepage.
 * On `pointerenter` (or keyboard focus, see below): the screenshot blurs
 * and dims, the Hero choreography "Heller, / Manuel." plays in the
 * bottom-right (matching the Hero's right-aligned `items-end`
 * composition). On `pointerleave`: stage fades out, screenshot
 * un-blurs.
 *
 * Each fresh hover re-triggers the OverprintReveal char-stagger via a
 * key bump that force-remounts the inner reveal subtree. This is the
 * cheap-and-correct way to re-fire OverprintReveal's once-per-mount
 * IO without modifying that primitive.
 *
 * Reduced-motion: nothing animates. Only the static screenshot renders.
 */

const FADE_MS = 380;
const SCREENSHOT_BLUR_PX = 8;
const SCREENSHOT_DIM_OPACITY = 0.7;

type Props = {
  alt: string;
  surname: string;
  given: string;
  /** Preserved in the contract for a future `role="status"` live region —
   *  unused in the current render to avoid focus-trap with the parent
   *  WorkCard `<a>`. */
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
  // Force-remount the reveal subtree on each hover so OverprintReveal's
  // internal once-per-mount IO fires fresh. Cheap, correct, no
  // upstream-component edits.
  const [revealCount, setRevealCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Coarse-pointer: replace hover with viewport-based IO so the reveal
  // plays automatically when the card scrolls into view. Re-entering
  // viewport bumps revealCount → OverprintReveal re-fires.
  const [isCoarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    if (!isCoarse || reducedMotion) return;
    const root = containerRef.current;
    if (!root) return;
    // Middle-35% band: fires when the card is genuinely mid-screen,
    // not just past the upper third. Same heuristic across the four
    // hover→scroll-trigger replacements (WorkCard, PortfolioCardReveal,
    // PlaygroundCard, TileFigure) for a consistent feel.
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setRevealCount((c) => c + 1);
          setIsHovered(true);
        } else {
          setIsHovered(false);
        }
      },
      { threshold: 0, rootMargin: "-32.5% 0px -32.5% 0px" },
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [isCoarse, reducedMotion]);

  // Imperative GSAP for the screenshot blur/dim + stage opacity. Uses
  // refs not state — keeps the tweens cancellable and frame-stable.
  useEffect(() => {
    if (reducedMotion) return;
    const screenshot = screenshotRef.current;
    const stage = stageRef.current;
    if (!screenshot || !stage) return;

    // Initial state — set explicitly so SSR-hydration + first render
    // both start from the same baseline.
    if (!isHovered) {
      gsap.set(screenshot, { filter: "blur(0px)", opacity: 1 });
      gsap.set(stage, { opacity: 0 });
    }

    const screenshotTween = gsap.to(screenshot, {
      filter: isHovered ? `blur(${SCREENSHOT_BLUR_PX}px)` : "blur(0px)",
      opacity: isHovered ? SCREENSHOT_DIM_OPACITY : 1,
      duration: FADE_MS / 1000,
      ease: "power2.out",
    });
    const stageTween = gsap.to(stage, {
      opacity: isHovered ? 1 : 0,
      duration: FADE_MS / 1000,
      ease: "power2.out",
    });

    return () => {
      screenshotTween.kill();
      stageTween.kill();
    };
  }, [isHovered, reducedMotion]);

  const onEnter = () => {
    if (reducedMotion) return;
    setRevealCount((c) => c + 1);
    setIsHovered(true);
  };
  const onLeave = () => {
    if (reducedMotion) return;
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className="relative h-full w-full"
    >
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
          className="pointer-events-none absolute inset-0 flex items-center justify-end pr-6 md:pr-10"
        >
          {/* Mirrors the Hero composition: right-aligned, vertically
              centered with a generous right padding. The two
              OverprintReveal instances + FadeIn slash get bumped keys
              per hover so the char-stagger re-fires from the start. */}
          <div className="flex items-baseline gap-2 text-right text-[clamp(2.5rem,7.5vw,5.5rem)]">
            <span className="font-display italic text-ink leading-none">
              <OverprintReveal
                key={`surname-${revealCount}`}
                text={surname}
                className="inline-block"
                threshold={0.01}
              />
            </span>
            <FadeIn
              key={`slash-${revealCount}`}
              className="not-italic inline-block font-display text-ink"
              delay={0.12}
              ariaHidden
            >
              /
            </FadeIn>
            <span className="font-display italic text-ink leading-none">
              <OverprintReveal
                key={`given-${revealCount}`}
                text={given}
                className="inline-block"
                threshold={0.01}
                delay={0.25}
              />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
