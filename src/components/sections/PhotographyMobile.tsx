"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { PhotoSwiperSim } from "@/components/scene/PhotoSwiperSim";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SpotColor } from "@/lib/palette";

/**
 * Mobile-Rework Photography — horizontal swiper variant.
 *
 * Spec §4.6: collapses the 5 vertical slots of the Desktop layout into a
 * single horizontal swiper-slot at ~75vh height. Each swipe (or pagination
 * dot / prev-next button) snaps to the next slide; the PhotoSwiperSim
 * canvas behind injects a splat in the incoming slide's spot color.
 *
 * Slides data is duplicated from Photography.tsx (small set, infrequent
 * change). If you add or reorder photos there, update this array too —
 * order and spot-color assignments must stay aligned across both views.
 */

type MobileSlide = {
  baseName: string;
  stampKey: string;
  spot: SpotColor;
  widths: number[];
};

const SLIDES: readonly MobileSlide[] = [
  { baseName: "01-pelican", stampKey: "pelican", spot: "amber", widths: [800, 1200] },
  { baseName: "02-koenigsegg", stampKey: "koenigsegg", spot: "violet", widths: [800, 1200] },
  { baseName: "03-panorama", stampKey: "panorama", spot: "amber", widths: [1200, 1920] },
  { baseName: "04-tree-lake", stampKey: "treeLake", spot: "mint", widths: [800, 1200] },
  { baseName: "05-crocodile", stampKey: "crocodile", spot: "rose", widths: [800, 1200] },
];

const SPOT_BG_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};

export function PhotographyMobile() {
  const t = useTranslations("photography");
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  // Sync index from native scroll-snap position. Touch-swipe scrolls the
  // track; we read scrollLeft → slide index on each scroll event.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const slide = Math.round(track.scrollLeft / track.clientWidth);
      setIndex((current) => (current === slide ? current : slide));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, newIndex));
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
    setIndex(clamped);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  const current = SLIDES[index] ?? SLIDES[0];

  return (
    <section id="photography" aria-labelledby="photography-heading" className="relative py-12">
      <header className="container-page mb-8">
        <p className="type-label text-ink-muted">{t("eyebrow")}</p>
        <h2 id="photography-heading" className="type-h2 mt-2 italic text-ink">
          {t("headline")}
        </h2>
      </header>

      <div className="relative">
        {current && <PhotoSwiperSim spot={current.spot} index={index} />}

        {/* Horizontal swiper: scroll-snap-x mandatory, one slide per
            snap, native touch scrolling. Keyboard ArrowLeft/Right also
            navigates via the onKey handler on the focusable region.
            Uses <section> over <div role="region"> per useSemanticElements.
            tabIndex={0} is intentional per W3C ARIA carousel pattern —
            the region is the keyboard focus stop for arrow-key nav. */}
        <section
          ref={trackRef as React.RefObject<HTMLElement>}
          aria-roledescription="carousel"
          aria-label={t("ariaCarouselLabel")}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: ARIA carousel pattern — region is tab stop for arrow-key nav
          tabIndex={0}
          onKeyDown={onKey}
          className="flex h-[75vh] snap-x snap-mandatory overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-spot-mint)] focus-visible:ring-offset-2"
          style={{ scrollbarWidth: "none" }}
        >
          {SLIDES.map((slide, slideIndex) => (
            <figure
              key={slide.baseName}
              data-testid="photo-slide"
              aria-roledescription="slide"
              aria-label={t("ariaSlideOf", {
                index: slideIndex + 1,
                total: SLIDES.length,
              })}
              className="relative flex h-full w-full shrink-0 snap-center items-center justify-center px-6"
            >
              <picture>
                <source
                  type="image/avif"
                  srcSet={slide.widths
                    .map((w) => `/photography/${slide.baseName}-${w}.avif ${w}w`)
                    .join(", ")}
                />
                <source
                  type="image/webp"
                  srcSet={slide.widths
                    .map((w) => `/photography/${slide.baseName}-${w}.webp ${w}w`)
                    .join(", ")}
                />
                <img
                  src={`/photography/${slide.baseName}-1200.jpg`}
                  alt={t(`slides.${slide.stampKey}.alt`)}
                  loading={slideIndex === 0 ? "eager" : "lazy"}
                  className="max-h-full max-w-full object-contain"
                />
              </picture>
              <figcaption className="absolute right-6 bottom-6 max-w-[60%] type-label-stamp">
                {t(`slides.${slide.stampKey}.stamp`)}
              </figcaption>
            </figure>
          ))}
        </section>

        {/* Pagination controls — prev | dots | next. Dots are 44×44
            hit-area buttons (visually 12×12 with padding) per WCAG 2.5.5. */}
        <div className="container-page mt-6 flex items-center justify-between">
          <button
            type="button"
            data-testid="photo-prev"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label={t("ariaPrev")}
            className="type-label-stamp inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 disabled:opacity-30"
          >
            ← {t("prev")}
          </button>

          <div
            className="flex items-center gap-1"
            role="tablist"
            aria-label={t("ariaPaginationLabel")}
          >
            {SLIDES.map((slide, i) => (
              <button
                key={slide.baseName}
                type="button"
                data-testid="photo-dot"
                role="tab"
                aria-current={i === index ? "true" : "false"}
                aria-label={t("ariaDot", { index: i + 1, total: SLIDES.length })}
                onClick={() => goTo(i)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={`block size-3 rounded-full border border-ink ${
                    i === index ? SPOT_BG_CLASS[slide.spot] : "bg-paper"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="photo-next"
            onClick={() => goTo(index + 1)}
            disabled={index === SLIDES.length - 1}
            aria-label={t("ariaNext")}
            className="type-label-stamp inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 disabled:opacity-30"
          >
            {t("next")} →
          </button>
        </div>

        {/* aria-live status — announces the current slide to AT users
            when the index changes. `aria-atomic` re-reads the full
            message so partial updates don't confuse the SR. */}
        <div
          data-testid="photo-live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {t("ariaLive", { index: index + 1, total: SLIDES.length })}
        </div>
      </div>
    </section>
  );
}
