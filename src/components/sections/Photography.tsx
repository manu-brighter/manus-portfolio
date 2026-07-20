"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { PhotoInkMask, type SpotColor } from "@/components/scene/PhotoInkMask";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useLenis } from "@/hooks/useLenis";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Mobile-phone layout renders a vertical editorial stack (the first
// rework's horizontal swiper was retired in the mobile wow-pass).
// Lazy-imported so the Desktop bundle stays free of the mobile variant.
const PhotographyMobile = dynamic(
  () => import("@/components/sections/PhotographyMobile").then((m) => m.PhotographyMobile),
  { ssr: false },
);

/**
 * Photography — Section 05 · "Through the Lens".
 *
 * Editorial-asymmetric layout (no sticky-pin stack — that approach was
 * killed in the Phase 9 rework). Each photo lives in the DOM as a
 * clean <picture>; an ink-mask overlay (`PhotoInkMask`) sits on top
 * and dissolves on viewport entry via a small advect+splat fluid sim,
 * revealing the photo underneath. The pro photography stays visually
 * untouched — the Riso aesthetic is in the framing, the mask, and the
 * surrounding typography, not pixel-level recolor.
 *
 * Layout per slot:
 *   1 · Egret      — full-bleed centre, 80vh
 *   2 · Koenigsegg — right-60% block w/ left-side meta-text, 70vh
 *   3 · Pano       — full-bleed thin spread, 40vh
 *   4 · Tree-Lake  — centre-70% block w/ right-side meta-text, 75vh
 *   5 · Crocodile  — full-bleed centre, 80vh
 *
 * Each slot reveals the moment it crosses 30% into viewport; meta-text
 * captions slide in horizontally in parallel with the ink dissolve.
 */

type Slide = {
  baseName: string;
  altKey: string;
  stampKey: string;
  spot: SpotColor;
  aspect: number; // width / height
  layout: "full" | "right60" | "left70" | "spread";
  widths: number[];
};

// Tailwind v4's class scanner can't see runtime-built class names, so
// dynamic `bg-spot-${slide.spot}` won't be picked up. Even though the
// four spot bg-classes are referenced statically elsewhere on the home
// page (so they happen to be in the bundle), that's fragile coupling —
// PlaygroundCard documented the same trap. Static map keeps the lookup
// honest.
const SPOT_BG_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};

const SLIDES: readonly [Slide, Slide, Slide, Slide, Slide] = [
  {
    baseName: "01-pelican",
    altKey: "pelican",
    stampKey: "pelican",
    spot: "amber",
    aspect: 3 / 2,
    layout: "full",
    // Still the pre-quality-bump set: the DSC05426 master is missing
    // from content-input, so the pipeline can't regenerate this slide
    // (see the 01-pelican note in scripts/optimize-assets.mjs).
    widths: [800, 1200, 1600],
  },
  {
    baseName: "02-koenigsegg",
    altKey: "koenigsegg",
    stampKey: "koenigsegg",
    spot: "violet",
    aspect: 2 / 3,
    layout: "right60",
    widths: [800, 1200, 1600, 2200],
  },
  {
    baseName: "03-panorama",
    altKey: "panorama",
    stampKey: "panorama",
    spot: "amber",
    aspect: 3.72,
    layout: "spread",
    widths: [1200, 1920, 2880],
  },
  {
    baseName: "04-tree-lake",
    altKey: "treeLake",
    stampKey: "treeLake",
    spot: "mint",
    aspect: 2 / 3,
    layout: "left70",
    widths: [800, 1200, 1600, 2200],
  },
  {
    baseName: "05-crocodile",
    altKey: "crocodile",
    stampKey: "crocodile",
    spot: "rose",
    aspect: 16 / 9,
    layout: "full",
    widths: [800, 1200, 1600, 2560],
  },
];

/**
 * Reveal trigger line: the photo fires its ink-dissolve only once the
 * photo's OWN vertical centre crosses the viewport's vertical centre —
 * i.e. after the middle of the photo has passed the middle of the screen.
 * This leaves the still photo on screen long enough for the user to play
 * with the live fluid sim over it before it auto-dissolves. (The earlier
 * "-44%" band fired when the photo's *edge* merely reached the central
 * strip, which read as revealing far too early.)
 *
 * Mechanic: `rootMargin: "-49.5% 0px -49.5% 0px"` shrinks the IO root to a
 * ~1%-tall band straddling the viewport centre (a sliver of height, not a
 * pure zero-height line — so the exact centre frame can't slip between IO
 * samples and an edge-touch is never an ambiguous zero-area intersection).
 * We do NOT observe the figure itself — a rising element (scroll-down)
 * trips `isIntersecting` at its leading TOP edge, so the figure would fire
 * when its top edge reached the line (way too early). Instead each frame
 * exposes a sentinel that
 * spans the figure's BOTTOM HALF, so the sentinel's leading *top* edge
 * sits exactly on the photo's centre. Scrolling down, that top edge
 * touches the centre line at the instant the photo's centre reaches it,
 * and `isIntersecting` flips true there — firing the one-shot reveal.
 * The sentinel is tall (~half the photo), so fast wheel flicks and
 * Lenis smooth-scroll jumps can't skip the crossing the way a thin marker
 * could. Still a single shared IntersectionObserver across all PhotoFrame
 * instances (one browser-managed observer, no per-frame scroll listener).
 */
const REVEAL_OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: "-49.5% 0px -49.5% 0px",
  threshold: 0,
};

/**
 * Module-singleton observer + element->callback map. Lives at module
 * scope (not inside a hook) so all PhotoFrame instances on the page
 * share the same browser-side observer — when the page mounts 5
 * frames, we hit `IntersectionObserver` once, not 5x. Each frame's
 * callback self-unsubscribes after it fires (one-shot reveal).
 */
type RevealCallback = () => void;
let revealObserver: IntersectionObserver | null = null;
const revealCallbacks = new Map<Element, RevealCallback>();

function getRevealObserver(): IntersectionObserver {
  if (revealObserver) return revealObserver;
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const cb = revealCallbacks.get(entry.target);
      if (cb) {
        revealCallbacks.delete(entry.target);
        revealObserver?.unobserve(entry.target);
        cb();
      }
    }
    // Drop the singleton once nobody's watching — lets GC collect the
    // observer if the user navigates away from /photography and back.
    if (revealCallbacks.size === 0 && revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
  }, REVEAL_OBSERVER_OPTIONS);
  return revealObserver;
}

function PhotoFrame({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const t = useTranslations("photography");
  const ref = useRef<HTMLDivElement | null>(null);
  // Centre sentinel (bottom-half overlay); its top edge sits on the photo's
  // vertical centre. The shared reveal observer watches THIS, not the figure
  // — see REVEAL_OBSERVER_OPTIONS for why.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(false);
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();

  // Subscribe this frame to the shared module-level observer. The
  // earlier per-frame `window.addEventListener("scroll", ...)` +
  // rAF pattern allocated one listener per PhotoFrame; with 5 frames
  // that was 5 scroll listeners each spinning their own rAF chain on
  // every scroll event. One shared IO replaces all of it.
  useEffect(() => {
    // Observe the centre sentinel, not the figure: the reveal must fire
    // when the photo's MIDDLE crosses the viewport middle, not when its
    // top edge does (see REVEAL_OBSERVER_OPTIONS).
    const el = sentinelRef.current;
    if (!el) return;
    const observer = getRevealObserver();
    revealCallbacks.set(el, () => setReveal(true));
    observer.observe(el);

    return () => {
      revealCallbacks.delete(el);
      observer.unobserve(el);
      // Note: we don't disconnect the singleton here — other PhotoFrames
      // may still be subscribed. The observer self-cleans inside its
      // callback when the map empties.
    };
  }, []);

  // Click / Enter / Space scrolls the photo's centre to the viewport
  // centre; the scroll handler above then fires the reveal organically
  // once the position lands. Lenis owns smooth scroll site-wide, so we
  // route through it; reduced-motion users get an instant jump
  // (and the global *,*::before,*::after rule already snaps any GSAP
  // animation duration to 0.01ms, so the reveal fires immediately).
  const onActivate = useCallback(() => {
    if (reveal) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const targetY = rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2;
    if (lenis && !reducedMotion) {
      lenis.scrollTo(targetY, { duration: 0.9 });
    } else {
      window.scrollTo({
        top: targetY,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  }, [reveal, lenis, reducedMotion]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  const avif = slide.widths
    .map((w) => `/photography/${slide.baseName}-${w}w.avif ${w}w`)
    .join(", ");
  const webp = slide.widths
    .map((w) => `/photography/${slide.baseName}-${w}w.webp ${w}w`)
    .join(", ");
  const jpg = `/photography/${slide.baseName}-${slide.widths[1] ?? slide.widths[0]}w.jpg`;
  const sizes =
    slide.layout === "full" || slide.layout === "spread"
      ? "100vw"
      : "(min-width: 1024px) 60vw, 100vw";

  return (
    <figure
      ref={ref}
      className={`relative w-full ${reveal ? "" : "cursor-pointer"}`}
      style={{ aspectRatio: slide.aspect }}
      data-photo-slide={slide.baseName}
      // Pre-reveal the figure is interactive (click/enter/space scrolls
      // photo to viewport centre, organic reveal trigger fires there).
      // Post-reveal we drop the affordances — photo is just content.
      // No aria-pressed (this isn't a toggle); role="button" is a
      // one-shot affordance the user activates exactly once per slot.
      onClick={reveal ? undefined : onActivate}
      onKeyDown={reveal ? undefined : onKeyDown}
      tabIndex={reveal ? -1 : 0}
      role={reveal ? undefined : "button"}
      aria-label={reveal ? undefined : t(`slides.${slide.altKey}.alt`)}
    >
      {/* Centre sentinel: spans the figure's bottom half, so its leading
          top edge lands exactly on the photo's vertical centre. The shared
          reveal observer watches this (not the figure) so the ink-dissolve
          only fires once the photo's middle crosses the viewport middle.
          Decorative + inert: aria-hidden, pointer-events-none, no paint. */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 bottom-0"
      />
      <picture>
        <source type="image/avif" srcSet={avif} sizes={sizes} />
        <source type="image/webp" srcSet={webp} sizes={sizes} />
        <img
          // Fallback <img> width/height: gives the browser a layout
          // hint before the picture resolves, so the figure reserves
          // the right slot height. The figure also sets
          // `style={{ aspectRatio }}` on its outer element (see below),
          // which is the primary CLS guard; these intrinsic dims back
          // it up for older UAs that don't honor `aspect-ratio` on the
          // outer element until the image resolves.
          src={jpg}
          alt={t(`slides.${slide.altKey}.alt`)}
          loading="lazy"
          decoding="async"
          width={slide.widths[1]}
          height={Math.round((slide.widths[1] ?? slide.widths[0] ?? 1200) / slide.aspect)}
          className="block h-full w-full object-cover shadow-[6px_6px_0_var(--color-ink)] outline outline-[1.5px] outline-ink"
        />
      </picture>
      <PhotoInkMask spotColor={slide.spot} reveal={reveal} className="z-10" />

      {/* Mono-stempel caption — ink-revealed in parallel with the photo.
          `transition-all` was painting every animatable property on
          this element (incl. the unintended pointer-events / colour
          transitions from inherited utility resets); scoping to
          opacity+transform only and aligning the easing with our token
          stack (ease.expo, 560ms) makes the caption land with the same
          riso cadence as the rest of the section. */}
      <figcaption
        className={`type-label absolute left-0 z-20 mt-3 flex flex-wrap items-center gap-3 text-ink-soft transition-[opacity,transform] duration-[560ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          reveal ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
        }`}
        style={{ top: "100%" }}
      >
        <span aria-hidden="true" className={`inline-block size-2 ${SPOT_BG_CLASS[slide.spot]}`} />
        <span>{t(`slides.${slide.stampKey}.stamp`)}</span>
        <span aria-hidden="true" className="text-ink-muted">
          ·
        </span>
        <span className="text-ink-muted">
          {String(index + 1).padStart(2, "0")} / {total}
        </span>
      </figcaption>
    </figure>
  );
}

export function Photography() {
  const t = useTranslations("photography");
  const isMobile = useMobileLayout();

  // Mobile-phone layout: hand off to the swiper variant entirely. Tablets
  // and Desktop fall through to the original 5-slot editorial flow below.
  if (isMobile) {
    return <PhotographyMobile />;
  }

  return (
    <section
      id="photography"
      aria-labelledby="photography-heading"
      className="relative py-24 md:py-36"
    >
      <SectionHeader
        className="container-page mb-24 md:mb-32"
        label={t("sectionLabel")}
        headingId="photography-heading"
        headline={t("headline")}
        eyebrow={t("eyebrow")}
        eyebrowSpot="amber"
        italicHeadline
        lede={t("lede")}
        techLabel={t("techLabel")}
      />

      {/* Slot 1 · Egret · full-bleed */}
      {/* Bottom margins bumped to mb-36/md:mb-44 (was mb-32/mb-40) so
          the absolute-positioned figcaption (top: 100%) has breathing
          room before the next slot — without this the next photo's
          frame border could touch the caption baseline on shorter
          viewports. Per F-frontend-design-4. */}
      <div className="container-page mb-36 md:mb-44">
        <div className="mx-auto w-full max-w-[min(72rem,92vw)]">
          <PhotoFrame slide={SLIDES[0]} index={0} total={SLIDES.length} />
        </div>
      </div>

      {/* Slot 2 · Koenigsegg · right-60% with left meta-text */}
      <div className="container-page grid-12 mb-36 items-center gap-y-8 md:mb-44">
        <div className="col-span-12 md:col-span-4 md:pr-8">
          {/* Hidden on mobile: the photo's own figcaption already
              shows "02 / 5" — duplicating the index above the title
              text reads as redundant on a single column. Desktop keeps
              it as the editorial pair-stamp. */}
          <p className="type-label-stamp mb-6 hidden md:inline-flex">
            {String(2).padStart(2, "0")} / {SLIDES.length}
          </p>
          <h3 className="type-h2 italic text-ink">{t(`slides.${SLIDES[1].altKey}.title`)}</h3>
          <p className="type-body mt-4 text-ink-soft">{t(`slides.${SLIDES[1].altKey}.body`)}</p>
        </div>
        <div className="col-span-12 md:col-span-7 md:col-start-6">
          <PhotoFrame slide={SLIDES[1]} index={1} total={SLIDES.length} />
        </div>
      </div>

      {/* Slot 3 · Panorama · full-bleed thin spread */}
      <div className="-mx-[max(0px,calc((100vw-100%)/2))] mb-36 md:mb-44">
        <div className="mx-auto w-full">
          <PhotoFrame slide={SLIDES[2]} index={2} total={SLIDES.length} />
        </div>
      </div>

      {/* Slot 4 · Tree-Lake · left-70% with right meta-text */}
      <div className="container-page grid-12 mb-36 items-center gap-y-8 md:mb-44">
        <div className="col-span-12 md:col-span-7">
          <PhotoFrame slide={SLIDES[3]} index={3} total={SLIDES.length} />
        </div>
        <div className="col-span-12 md:col-span-4 md:col-start-9 md:pl-8">
          {/* Hidden on mobile (see Slot 2 above) — photo's figcaption
              already carries "04 / 5". */}
          <p className="type-label-stamp mb-6 hidden md:inline-flex">
            {String(4).padStart(2, "0")} / {SLIDES.length}
          </p>
          <h3 className="type-h2 italic text-ink">{t(`slides.${SLIDES[3].altKey}.title`)}</h3>
          <p className="type-body mt-4 text-ink-soft">{t(`slides.${SLIDES[3].altKey}.body`)}</p>
        </div>
      </div>

      {/* Slot 5 · Crocodile · full-bleed */}
      <div className="container-page mb-20 md:mb-28">
        <div className="mx-auto w-full max-w-[min(72rem,92vw)]">
          <PhotoFrame slide={SLIDES[4]} index={4} total={SLIDES.length} />
        </div>
      </div>

      <div className="container-page grid-12 mt-20 gap-y-4 md:mt-28">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
          <a
            href={t("ctaHref")}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-baseline gap-3 bg-spot-amber px-4 py-3 font-display italic text-ink-print text-[clamp(1rem,1.4vw,1.4rem)] leading-none w-fit shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none"
          >
            <span>{t("ctaLabel")}</span>
            <span aria-hidden="true" className="font-mono not-italic">
              ↗
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
