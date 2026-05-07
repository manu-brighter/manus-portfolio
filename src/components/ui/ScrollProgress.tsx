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

// Section order MUST match the actual page flow (see [locale]/page.tsx).
// IntersectionObserver-driven activeIndex relies on this ordering: when
// the user scrolls down the IO entries fire in DOM-position order, and
// the topmost-intersecting entry wins via the sort step in the IO
// callback below. If you put dots out-of-order, the active state will
// flicker between non-adjacent indices and the connecting line will
// run backwards.
//
// Riso 4-spot rotation cycles mint → rose → amber → violet across the
// 9 dots so each adjacent pair has distinct colour identity.
const SECTION_DEFS: SectionDef[] = [
  { id: "hero", labelKey: "hero", color: "var(--color-spot-mint)" },
  { id: "about", labelKey: "about", color: "var(--color-spot-rose)" },
  { id: "about-objects", labelKey: "aboutObjects", color: "var(--color-spot-amber)" },
  { id: "skills", labelKey: "skills", color: "var(--color-spot-violet)" },
  { id: "work", labelKey: "work", color: "var(--color-spot-mint)" },
  { id: "case-study", labelKey: "casestudy", color: "var(--color-spot-rose)" },
  { id: "photography", labelKey: "photography", color: "var(--color-spot-amber)" },
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

    // Pick the topmost intersecting section (matches Nav.tsx scroll-spy).
    // Iterating entries blindly + setActiveIndex per-entry produces a
    // race when adjacent sections briefly overlap during scroll: the
    // last entry "wins" rather than the visually-active one. Filter →
    // sort by viewport-top → take first. rootMargin "-20% 0px -70%"
    // treats a section as active when its top crosses into the
    // 20–30% viewport strip, identical to Nav for handoff consistency.
    const observer = new IntersectionObserver(
      (entries) => {
        const [topmost] = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!topmost) return;
        const idx = sections.findIndex((s) => s.el === topmost.target);
        if (idx >= 0) setActiveIndex(idx);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
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

  // Section label for ARIA — hero + about-objects don't exist in nav.items
  // (they're not top-level nav destinations), so they get dedicated keys
  // under scrollProgress.*. Everything else maps to the existing nav label.
  const getLabel = (s: ActiveSection) => {
    if (s.id === "hero") return t("heroLabel");
    if (s.id === "about-objects") return t("aboutObjectsLabel");
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
