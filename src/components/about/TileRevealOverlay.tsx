"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "@/hooks/useLenis";
import { SPOT_CSS_VAR } from "@/lib/palette";
import {
  type RevealTileKey,
  type TileOrientation,
  tileRevealJpg,
  tileRevealSrcSet,
} from "./tileReveals";

/**
 * TileRevealOverlay — the "Andruck" behind an Off-the-screen tile.
 *
 * Opens instantly (no page-wide ink wipe — its ~1s grow/retract felt
 * slow; user feedback) with a ~290ms registration snap: the backdrop
 * fades, a spot-color plate slides in from out of register and seats
 * into its resting 8px offset, the photo plate fades in over a small
 * scale a beat later, then the caption. Keyframes live in globals.css
 * (`tile-plate-in` and friends); reduced-motion disables all of them
 * and the overlay opens statically.
 *
 * Everything animated is transform/opacity only. The previous cut
 * animated `box-shadow` (not compositor-animatable — it repainted a
 * fullscreen photo every frame) and scaled the whole <figure> from
 * 1.14, which dragged the caption and pushed an oversized ink rim off
 * the bottom of the viewport. That combination is what read as
 * "holprig" and cropped; don't reintroduce either.
 *
 * Still a fixed div, NOT `dialog.showModal()` — focus handling stays
 * manual: single-control dialog (close button only), focus lands on
 * close, Tab is pinned to it, Esc and backdrop click close, and
 * ObjectGrid restores focus to the opening tile after unmount.
 *
 * Photo framing follows the site-wide policy: paper-shade backing +
 * ink border + spot-color offset shadow, mono caption stamps below —
 * never pixel-level recolor. Landscape vs portrait crop is picked by
 * viewport orientation via `<source media>` (Manuel authors both
 * crops; see tileReveals.ts).
 *
 * Scroll freezes underneath (Lenis stop + overflow hidden) and
 * `data-no-splat` keeps mobile tap-to-splat away from the backdrop.
 */

type TileRevealOverlayProps = {
  tile: RevealTileKey;
  spot: "rose" | "amber" | "mint" | "violet";
  onClose: () => void;
};

const LEAVE_MS = 180;

const SIZES: Record<TileOrientation, string> = {
  portrait: "88vw",
  landscape: "80vw",
};

export function TileRevealOverlay({ tile, spot, onClose }: TileRevealOverlayProps) {
  const t = useTranslations("about.objectGrid");
  const [leaving, setLeaving] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const lenis = useLenis();

  const requestClose = useCallback(() => {
    if (leaveTimerRef.current !== null) return;
    setLeaving(true);
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      onClose();
    }, LEAVE_MS);
  }, [onClose]);

  // Esc closes; Tab stays pinned to the single focusable control.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      } else if (e.key === "Tab") {
        e.preventDefault();
        closeBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  // Freeze page scroll while open; focus lands on the close button.
  useEffect(() => {
    lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [lenis]);

  useEffect(
    () => () => {
      if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
    },
    [],
  );

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc is handled by the document keydown above; the backdrop itself is not focusable and the close button carries keyboard parity.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tile-reveal-caption"
      data-no-splat
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className={`tile-reveal-backdrop fixed inset-0 z-[9000] grid place-items-center bg-paper-tint/85 p-5 backdrop-blur-sm transition-opacity duration-200 md:p-10 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      style={{ "--tile-spot": SPOT_CSS_VAR[spot] } as CSSProperties}
    >
      <figure className="max-w-full">
        {/* Plate stack. This wrapper exists so the spot plate's
            `inset-0` resolves against the PHOTO, not against the whole
            figure — anchored to the figure it also covered the caption
            row and painted a solid spot block behind the text. */}
        <div className="relative w-fit">
          {/* The spot plate. A real element rather than a box-shadow so
              it can animate on the compositor, and rough-edged rather
              than a crisp rect so it reads as ink laid down by a drum.
              It sits exactly under the photo and only shows through as
              the resting 8px offset — the animation is the part you
              actually watch. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="tile-reveal-plate pointer-events-none absolute inset-0 -z-10 size-full"
            style={{ fill: "var(--tile-spot)" }}
          >
            <path d="M0.6 1.1 C 26 0.2, 58 1.4, 99.1 0.5 C 99.7 28, 98.9 62, 99.4 99 C 68 99.8, 32 98.7, 0.9 99.5 C 0.3 70, 1.2 34, 0.6 1.1 Z" />
          </svg>
          <picture className="tile-reveal-photo relative block border-[2px] border-ink bg-paper-shade p-2 md:p-3">
            <source
              media="(orientation: portrait)"
              type="image/avif"
              srcSet={tileRevealSrcSet(tile, "portrait", "avif")}
              sizes={SIZES.portrait}
            />
            <source
              media="(orientation: portrait)"
              type="image/webp"
              srcSet={tileRevealSrcSet(tile, "portrait", "webp")}
              sizes={SIZES.portrait}
            />
            <source
              type="image/avif"
              srcSet={tileRevealSrcSet(tile, "landscape", "avif")}
              sizes={SIZES.landscape}
            />
            <source
              type="image/webp"
              srcSet={tileRevealSrcSet(tile, "landscape", "webp")}
              sizes={SIZES.landscape}
            />
            <img
              src={tileRevealJpg(tile, "landscape")}
              alt={t(`tiles.${tile}.reveal.alt`)}
              sizes={SIZES.landscape}
              // The dvh term reserves the caption row, the close button
              // and the backdrop padding, so short/landscape viewports
              // can't push the caption off-screen. 74vh is the cap on
              // tall viewports where that reserve is not the binding
              // constraint.
              className="block max-h-[min(74vh,calc(100dvh-11rem))] max-w-[88vw] object-contain md:max-w-[80vw]"
            />
          </picture>
        </div>
        <figcaption
          id="tile-reveal-caption"
          className="tile-reveal-meta mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"
        >
          <span className="type-label-stamp">{t(`tiles.${tile}.name`)}</span>
          <span className="font-mono text-ink-muted text-xs uppercase tracking-[0.2em]">
            {t(`tiles.${tile}.reveal.caption`)}
          </span>
        </figcaption>
      </figure>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={requestClose}
        aria-label={t("revealClose")}
        className="tile-reveal-meta absolute top-5 right-5 grid size-12 place-items-center border-[1.5px] border-ink bg-paper text-2xl text-ink leading-none shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none md:top-8 md:right-8"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
