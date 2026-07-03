"use client";

import gsap from "gsap";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "@/hooks/useLenis";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePathname } from "@/i18n/navigation";
import { SECTIONS } from "@/lib/content/sections";
import { SPOT_CSS_VAR } from "@/lib/palette";

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
  /** `nav.items.*` key, or `null` for sections without a nav label
   *  (hero, about-objects — those get dedicated `scrollProgress.*`
   *  strings via `getLabel` below). */
  labelKey: string | null;
  color: string;
};

// Section order MUST match the actual page flow (see [locale]/page.tsx).
// IntersectionObserver-driven activeIndex relies on this ordering: when
// the user scrolls down the IO entries fire in DOM-position order, and
// the topmost-intersecting entry wins via the sort step in the IO
// callback below. If you put dots out-of-order, the active state will
// flicker between non-adjacent indices and the connecting line will
// run backwards. The list is derived from the shared `SECTIONS` source
// of truth so reorders only happen in one place.
const SECTION_DEFS: SectionDef[] = SECTIONS.filter((s) => s.showInScrollProgress).map((s) => ({
  id: s.id,
  labelKey: s.navLabelKey,
  color: SPOT_CSS_VAR[s.color],
}));

type ActiveSection = SectionDef & { el: HTMLElement };

export function ScrollProgress() {
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const isMobile = useMobileLayout();
  const pathname = usePathname();
  const t = useTranslations("scrollProgress");
  const navT = useTranslations("nav.items");
  const containerRef = useRef<HTMLElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lineRef = useRef<HTMLDivElement>(null);

  const [sections, setSections] = useState<ActiveSection[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fillProgress, setFillProgress] = useState(0);

  // Discover which sections exist in the DOM. Re-runs on route change:
  // the component lives in the locale layout and survives client
  // navigation, so home -> playground -> home would otherwise keep
  // stale element refs from the unmounted home tree (frozen dots).
  // biome-ignore lint/correctness/useExhaustiveDependencies(pathname): deliberate re-run trigger — home sections unmount/remount across client navigation
  useEffect(() => {
    const found: ActiveSection[] = [];
    for (const def of SECTION_DEFS) {
      const el = document.getElementById(def.id);
      if (el) found.push({ ...def, el });
    }
    setSections(found);
  }, [pathname]);

  // IntersectionObserver for active section detection
  useEffect(() => {
    if (sections.length === 0) return;

    // Pick the most-visible intersecting section (matches Nav.tsx
    // scroll-spy). Sort key 1: highest `intersectionRatio` wins, so the
    // section actually filling the 20-30% viewport strip is preferred
    // over a neighbouring section that has only just clipped in by a
    // pixel. Sort key 2 (tiebreaker): topmost in viewport — keeps the
    // active state stable when two adjacent sections have identical
    // ratios. rootMargin "-20% 0px -70%" matches Nav for handoff
    // consistency.
    const observer = new IntersectionObserver(
      (entries) => {
        const [topmost] = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            if (b.intersectionRatio !== a.intersectionRatio) {
              return b.intersectionRatio - a.intersectionRatio;
            }
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });
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

  // Mobile phones have no page margin — the fixed right-edge rail sat
  // ON TOP of full-width photos/cards (screenshot-verified in the
  // mobile wow-pass). Desktop/tablet keep it: there it lives in the
  // whitespace beside the content column.
  if (isMobile) return null;

  // Playground experiment routes: fullscreen fixed-frame canvas, the
  // section-dot strip carries no information and crowds the stage.
  // (The component survives client navigation in the locale layout,
  // so without this guard the home-page dots linger over experiments.)
  if (pathname.startsWith("/playground/")) return null;

  // Don't render if no sections found
  if (sections.length < 1) return null;

  // Section label for ARIA — hero + about-objects don't exist in nav.items
  // (they're not top-level nav destinations, `labelKey === null`), so they
  // get dedicated keys under scrollProgress.*. Everything else maps to
  // the existing nav label.
  const getLabel = (s: ActiveSection) => {
    if (s.id === "hero") return t("heroLabel");
    if (s.id === "about-objects") return t("aboutObjectsLabel");
    return s.labelKey ? navT(s.labelKey) : s.id;
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
              aria-current={i === activeIndex ? "location" : undefined}
              className="group relative flex size-11 cursor-pointer items-center justify-center"
              style={{ opacity: i === activeIndex ? 1 : 0.45, touchAction: "manipulation" }}
            >
              {/* Outer ring (visible on active) */}
              <span
                className="absolute rounded-full transition-[background-color,width,height,opacity] duration-300"
                style={{
                  width: i === activeIndex ? "18px" : "0px",
                  height: i === activeIndex ? "18px" : "0px",
                  border: `1.5px solid ${section.color}`,
                  opacity: i === activeIndex ? 0.5 : 0,
                }}
              />
              {/* Inner dot */}
              <span
                className="rounded-full transition-[background-color,width,height] duration-300"
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
