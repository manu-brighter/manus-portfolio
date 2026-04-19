"use client";

import gsap from "gsap";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "@/hooks/useLenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Ink Bleed Dots — section-aware scroll progress indicator.
 *
 * Replaces the native scrollbar with a vertical strip of colored dots,
 * one per page section. The active dot is larger; a thin connecting
 * line fills between dots as the user scrolls. Clicking a dot
 * smooth-scrolls to that section via Lenis.
 *
 * Hidden under prefers-reduced-motion (native scrollbar is restored
 * via the CSS override in globals.css).
 */

type SectionDef = {
  id: string;
  labelKey: string;
  color: string;
};

const SECTION_DEFS: SectionDef[] = [
  { id: "hero", labelKey: "hero", color: "var(--color-spot-mint)" },
  { id: "work", labelKey: "work", color: "var(--color-spot-amber)" },
  { id: "about", labelKey: "about", color: "var(--color-spot-rose)" },
  { id: "playground", labelKey: "playground", color: "var(--color-spot-violet)" },
  { id: "contact", labelKey: "contact", color: "var(--color-spot-mint)" },
];

type ActiveSection = SectionDef & { el: HTMLElement };

export function ScrollProgress() {
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const t = useTranslations("scrollProgress");
  const navT = useTranslations("nav.items");
  const containerRef = useRef<HTMLElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lineRef = useRef<HTMLDivElement>(null);

  const [sections, setSections] = useState<ActiveSection[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fillProgress, setFillProgress] = useState(0);

  // Discover which sections exist in the DOM
  useEffect(() => {
    const found: ActiveSection[] = [];
    for (const def of SECTION_DEFS) {
      const el = document.getElementById(def.id);
      if (el) found.push({ ...def, el });
    }
    setSections(found);
  }, []);

  // IntersectionObserver for active section detection
  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = sections.findIndex((s) => s.el === entry.target);
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      { threshold: 0.35 },
    );

    for (const s of sections) observer.observe(s.el);
    return () => observer.disconnect();
  }, [sections]);

  // Scroll progress tracking via Lenis
  useEffect(() => {
    if (!lenis) return;

    const onScroll = () => {
      setFillProgress(lenis.progress);
    };
    lenis.on("scroll", onScroll);
    return () => lenis.off("scroll", onScroll);
  }, [lenis]);

  // Animate active dot — GSAP durations set to 0 under reduced-motion
  // (component is hidden, but guard defensively).
  useEffect(() => {
    // Reset refs array to match current section count
    dotRefs.current.length = sections.length;

    for (let i = 0; i < sections.length; i++) {
      const dot = dotRefs.current[i];
      if (!dot) continue;
      gsap.to(dot, {
        scale: i === activeIndex ? 1 : 0.7,
        opacity: i === activeIndex ? 1 : 0.45,
        duration: reducedMotion ? 0 : 0.3,
        ease: "power2.out",
      });
    }
  }, [activeIndex, sections.length, reducedMotion]);

  // Click handler — smooth scroll to section
  const scrollTo = useCallback(
    (idx: number) => {
      const section = sections[idx];
      if (!section) return;
      if (lenis) {
        lenis.scrollTo(section.el, { offset: -80 });
      } else {
        section.el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [sections, lenis],
  );

  // Hidden under reduced-motion — native scrollbar is restored via CSS
  if (reducedMotion) return null;

  // Don't render if no sections found
  if (sections.length < 1) return null;

  // Section label for ARIA
  const getLabel = (s: ActiveSection) => {
    if (s.id === "hero") return t("heroLabel");
    return navT(s.labelKey);
  };

  return (
    <nav
      ref={containerRef}
      aria-label={t("ariaLabel")}
      className="fixed top-1/2 right-5 z-40 -translate-y-1/2 md:right-6"
    >
      <ol className="relative flex flex-col items-center gap-5">
        {/* Connecting line behind dots */}
        {sections.length > 1 && (
          <div
            className="absolute top-2 bottom-2 w-px"
            style={{ backgroundColor: "var(--color-paper-line)" }}
          >
            <div
              ref={lineRef}
              className="w-full origin-top transition-transform duration-150"
              style={{
                backgroundColor: sections[activeIndex]?.color ?? "var(--color-ink-faint)",
                height: "100%",
                transform: `scaleY(${fillProgress})`,
              }}
            />
          </div>
        )}

        {sections.map((section, i) => (
          <li key={section.id} className="relative">
            <button
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={getLabel(section)}
              aria-current={i === activeIndex ? "true" : undefined}
              className="group relative flex size-8 items-center justify-center"
              style={{ opacity: i === activeIndex ? 1 : 0.45 }}
            >
              {/* Outer ring (visible on active) */}
              <span
                className="absolute rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? "18px" : "0px",
                  height: i === activeIndex ? "18px" : "0px",
                  border: `1.5px solid ${section.color}`,
                  opacity: i === activeIndex ? 0.5 : 0,
                }}
              />
              {/* Inner dot */}
              <span
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? "8px" : "6px",
                  height: i === activeIndex ? "8px" : "6px",
                  backgroundColor: section.color,
                }}
              />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
