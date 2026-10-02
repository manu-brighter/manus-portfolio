"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { PhotoInkAnimation } from "@/components/scene/PhotoInkAnimation";
import { useScene } from "@/components/scene/SceneProvider";
import type { SpotColor } from "@/lib/palette";

/**
 * Mobile Photography — vertical editorial stack.
 *
 * Replaces the horizontal swiper variant from the first mobile rework
 * (Manuel: too many side-swipe carousels). The five photos flow in the
 * page's natural vertical scroll as an editorial rhythm: full-width and
 * inset widths alternate, each shot carries the site's riso framing —
 * ink outline + hard spot-color offset shadow (fills only, per the
 * visual policy: no pixel-level recolor of pro photos) — and a mono
 * stamp caption. Entrances are staggered FadeIns; reduced-motion renders
 * everything static via FadeIn's built-in branch.
 *
 * No per-section WebGL canvas anymore: the full-page MobileBackgroundSim
 * (alive during scroll since the mobile wow-pass) provides the ambient
 * ink behind the stack, so the pooled PhotoSwiperSim context is retired.
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
  /** width / height — mirrors Photography.tsx. Feeds the `<img>`
   *  width/height attributes so lazy images reserve their layout box
   *  before load (no CLS, no zero-height figures). */
  aspect: number;
  /** Editorial rhythm: full-bleed-ish vs inset, alternating sides. */
  layout: "full" | "inset-left" | "inset-right";
};

const SLIDES: readonly MobileSlide[] = [
  {
    baseName: "01-pelican",
    stampKey: "pelican",
    spot: "amber",
    widths: [800, 1200],
    aspect: 3 / 2,
    layout: "full",
  },
  {
    baseName: "02-koenigsegg",
    stampKey: "koenigsegg",
    spot: "violet",
    widths: [800, 1200],
    aspect: 2 / 3,
    layout: "inset-right",
  },
  {
    baseName: "03-panorama",
    stampKey: "panorama",
    spot: "amber",
    widths: [1200, 1920],
    aspect: 3.72,
    layout: "full",
  },
  {
    baseName: "04-tree-lake",
    stampKey: "treeLake",
    spot: "mint",
    widths: [800, 1200],
    aspect: 2 / 3,
    layout: "inset-left",
  },
  {
    baseName: "05-crocodile",
    stampKey: "crocodile",
    spot: "rose",
    widths: [800, 1200],
    aspect: 16 / 9,
    layout: "inset-right",
  },
];

/** Spot shadows as static class strings — Tailwind can't scan interpolations. */
const SPOT_SHADOW_CLASS: Record<SpotColor, string> = {
  rose: "shadow-[6px_6px_0_var(--color-spot-rose)]",
  amber: "shadow-[6px_6px_0_var(--color-spot-amber)]",
  mint: "shadow-[6px_6px_0_var(--color-spot-mint)]",
  violet: "shadow-[6px_6px_0_var(--color-spot-violet)]",
};

const LAYOUT_CLASS: Record<MobileSlide["layout"], string> = {
  full: "w-full",
  "inset-left": "w-[88%] self-start",
  "inset-right": "w-[88%] self-end",
};

function MobilePhotoFrame({ spotColor, children }: { spotColor: SpotColor; children: ReactNode }) {
  const { effectsReduced, inkUnavailable, reducedMotion } = useScene();
  const animated = effectsReduced && !inkUnavailable && !reducedMotion;
  const ref = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState(false);
  const [finished, setFinished] = useState(false);
  const complete = useCallback(() => setFinished(true), []);

  useEffect(() => {
    if (!animated || reveal || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.25))
          return;
        setReveal(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animated, reveal]);

  return (
    <div ref={ref} className="relative">
      {children}
      {animated && !finished && (
        <PhotoInkAnimation
          spotColor={spotColor}
          reveal={reveal}
          className="z-10"
          onComplete={complete}
        />
      )}
    </div>
  );
}

export function PhotographyMobile() {
  const t = useTranslations("photography");

  return (
    <section id="photography" aria-labelledby="photography-heading" className="relative py-12">
      <header className="container-page mb-10">
        <p className="type-label text-ink-muted">{t("eyebrow")}</p>
        <h2 id="photography-heading" className="type-h2 mt-2 italic text-ink">
          {t("headline")}
        </h2>
        <p className="type-body mt-5 max-w-prose text-ink-soft">{t("lede")}</p>
      </header>

      <div className="container-page flex flex-col gap-14">
        {SLIDES.map((slide, i) => (
          <FadeIn key={slide.baseName} as="div" y={24} className={LAYOUT_CLASS[slide.layout]}>
            <figure data-testid="photo-slide">
              <MobilePhotoFrame spotColor={slide.spot}>
                <picture className="block">
                  <source
                    type="image/avif"
                    srcSet={slide.widths
                      .map((w) => `/photography/${slide.baseName}-${w}w.avif ${w}w`)
                      .join(", ")}
                  />
                  <source
                    type="image/webp"
                    srcSet={slide.widths
                      .map((w) => `/photography/${slide.baseName}-${w}w.webp ${w}w`)
                      .join(", ")}
                  />
                  <img
                    src={`/photography/${slide.baseName}-1200w.jpg`}
                    alt={t(`slides.${slide.stampKey}.alt`)}
                    width={slide.widths[1] ?? 1200}
                    height={Math.round((slide.widths[1] ?? 1200) / slide.aspect)}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className={`block h-auto w-full outline outline-[1.5px] outline-ink ${SPOT_SHADOW_CLASS[slide.spot]}`}
                  />
                </picture>
              </MobilePhotoFrame>
              <figcaption className="mt-4 flex justify-end">
                <span className="type-label-stamp">{t(`slides.${slide.stampKey}.stamp`)}</span>
              </figcaption>
            </figure>
          </FadeIn>
        ))}
      </div>
      <div className="container-page mt-14">
        <a
          href={t("ctaHref")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-3 bg-spot-amber px-4 py-3 font-display text-lg italic text-ink-print shadow-[3px_3px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
        >
          <span>{t("ctaLabel")}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
