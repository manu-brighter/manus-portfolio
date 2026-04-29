"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PhotoInkMask, type SpotColor } from "@/components/scene/PhotoInkMask";

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

const SLIDES: readonly [Slide, Slide, Slide, Slide, Slide] = [
  {
    baseName: "01-egret",
    altKey: "egret",
    stampKey: "egret",
    spot: "amber",
    aspect: 3 / 2,
    layout: "full",
    widths: [800, 1200, 1600],
  },
  {
    baseName: "02-koenigsegg",
    altKey: "koenigsegg",
    stampKey: "koenigsegg",
    spot: "violet",
    aspect: 2 / 3,
    layout: "right60",
    widths: [800, 1200, 1600],
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
    widths: [800, 1200, 1600],
  },
  {
    baseName: "05-crocodile",
    altKey: "crocodile",
    stampKey: "crocodile",
    spot: "rose",
    aspect: 3 / 2,
    layout: "full",
    widths: [800, 1200, 1600],
  },
];

function PhotoFrame({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const t = useTranslations("photography");
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Scroll-center proximity: fire the reveal when the photo enters
    // the central 60% of the viewport. The negative rootMargin shrinks
    // the IO root to that band, so the photo "lights up" right as it
    // becomes the visual focus — not when its edge first peeks in.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReveal(true);
          io.disconnect();
        }
      },
      { rootMargin: "-20% 0px -20% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
      className="relative w-full"
      style={{ aspectRatio: slide.aspect }}
      data-photo-slide={slide.baseName}
    >
      <picture>
        <source type="image/avif" srcSet={avif} sizes={sizes} />
        <source type="image/webp" srcSet={webp} sizes={sizes} />
        <img
          src={jpg}
          alt={t(`slides.${slide.altKey}.alt`)}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-cover shadow-[6px_6px_0_var(--color-ink)] outline outline-[1.5px] outline-ink"
        />
      </picture>
      <PhotoInkMask spotColor={slide.spot} reveal={reveal} className="z-10" />

      {/* Mono-stempel caption — ink-revealed in parallel with the photo */}
      <figcaption
        className={`type-label absolute left-0 z-20 mt-3 flex flex-wrap items-center gap-3 text-ink-soft transition-all duration-700 ease-out ${
          reveal ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
        }`}
        style={{ top: "100%" }}
      >
        <span aria-hidden="true" className={`inline-block size-2 bg-spot-${slide.spot}`} />
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

  return (
    <section
      id="photography"
      aria-labelledby="photography-heading"
      className="relative py-24 md:py-36"
    >
      <header className="container-page grid-12 mb-24 gap-y-4 md:mb-32">
        <p className="col-span-12 text-ink-muted type-label md:col-span-4">{t("sectionLabel")}</p>
        <div className="col-span-12 md:col-span-8">
          <p className="type-label inline-flex items-center gap-2 text-ink">
            <span aria-hidden="true" className="inline-block size-2 bg-spot-amber" />
            {t("eyebrow")}
          </p>
          <h2
            id="photography-heading"
            className="type-h1 mt-4 text-ink"
            style={{ fontStyle: "italic" }}
          >
            {t("headline")}
          </h2>
          <p className="type-body-lg mt-6 max-w-[55ch] text-ink-soft">{t("lede")}</p>
          <p className="type-label-stamp mt-8">{t("techLabel")}</p>
        </div>
      </header>

      {/* Slot 1 · Egret · full-bleed */}
      <div className="container-page mb-32 md:mb-40">
        <div className="mx-auto w-full max-w-[min(72rem,92vw)]">
          <PhotoFrame slide={SLIDES[0]} index={0} total={SLIDES.length} />
        </div>
      </div>

      {/* Slot 2 · Koenigsegg · right-60% with left meta-text */}
      <div className="container-page grid-12 mb-32 items-center gap-y-8 md:mb-40">
        <div className="col-span-12 md:col-span-4 md:pr-8">
          <p className="type-label-stamp mb-6 inline-flex">
            {String(2).padStart(2, "0")} / {SLIDES.length}
          </p>
          <h3 className="type-h2 text-ink" style={{ fontStyle: "italic" }}>
            {t(`slides.${SLIDES[1].altKey}.title`)}
          </h3>
          <p className="type-body mt-4 text-ink-soft">{t(`slides.${SLIDES[1].altKey}.body`)}</p>
        </div>
        <div className="col-span-12 md:col-span-7 md:col-start-6">
          <PhotoFrame slide={SLIDES[1]} index={1} total={SLIDES.length} />
        </div>
      </div>

      {/* Slot 3 · Panorama · full-bleed thin spread */}
      <div className="-mx-[max(0px,calc((100vw-100%)/2))] mb-32 md:mb-40">
        <div className="mx-auto w-full">
          <PhotoFrame slide={SLIDES[2]} index={2} total={SLIDES.length} />
        </div>
      </div>

      {/* Slot 4 · Tree-Lake · left-70% with right meta-text */}
      <div className="container-page grid-12 mb-32 items-center gap-y-8 md:mb-40">
        <div className="col-span-12 md:col-span-7">
          <PhotoFrame slide={SLIDES[3]} index={3} total={SLIDES.length} />
        </div>
        <div className="col-span-12 md:col-span-4 md:col-start-9 md:pl-8">
          <p className="type-label-stamp mb-6 inline-flex">
            {String(4).padStart(2, "0")} / {SLIDES.length}
          </p>
          <h3 className="type-h2 text-ink" style={{ fontStyle: "italic" }}>
            {t(`slides.${SLIDES[3].altKey}.title`)}
          </h3>
          <p className="type-body mt-4 text-ink-soft">{t(`slides.${SLIDES[3].altKey}.body`)}</p>
        </div>
      </div>

      {/* Slot 5 · Crocodile · full-bleed */}
      <div className="container-page mb-20 md:mb-28">
        <div className="mx-auto w-full max-w-[min(72rem,92vw)]">
          <PhotoFrame slide={SLIDES[4]} index={4} total={SLIDES.length} />
        </div>
      </div>

      <footer className="container-page grid-12 mt-20 gap-y-4 md:mt-28">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
          <a
            href={t("ctaHref")}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-baseline gap-3 transition-transform type-label-stamp hover:translate-x-1"
          >
            <span>{t("ctaLabel")}</span>
            <span aria-hidden="true">↗</span>
          </a>
          <p className="mt-3 type-body-sm text-ink-muted">{t("ctaCaption")}</p>
        </div>
      </footer>
    </section>
  );
}
