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
 * TileRevealOverlay — the "Stempelpress" behind an Off-the-screen tile.
 *
 * Opens instantly (no page-wide ink wipe — its ~1s grow/retract felt
 * slow; user feedback) and owns a ~350ms press choreography instead:
 * backdrop fades in fast, the framed photo slams down with an
 * overshoot scale, its spot shadow seats from out-of-register into
 * the resting 8px offset, an ink blob squishes out from under the
 * plate, and the caption row stamps in a beat later. Keyframes live
 * in globals.css (`tile-press-in` and friends); reduced-motion
 * disables all of them and the overlay opens statically.
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

const LEAVE_MS = 220;

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
      <figure className="tile-reveal-figure relative max-w-full">
        {/* Ink squishing out from under the plate — a thin irregular
            rim around the frame plus a few spray droplets, riding the
            tile spot token so it re-inks with the theme. Sized just a
            few percent past the frame: any bigger and it reads as a
            balloon instead of pressed-out ink (screenshot-verified).
            preserveAspectRatio="none" stretches the wobble to the
            photo's aspect, which only makes it more organic. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 100"
          preserveAspectRatio="none"
          className="tile-reveal-splat pointer-events-none absolute -inset-[2.5%] -z-10 h-[105%] w-[105%]"
          style={{ fill: "var(--tile-spot)" }}
        >
          <path d="M60 2 C78 0 96 4 106 10 C116 16 114 28 117 42 C120 57 115 70 110 82 C104 94 88 96 70 98 C52 100 32 98 20 92 C8 86 6 72 3 58 C0 44 4 28 12 16 C20 5 42 4 60 2 Z" />
          <circle cx="4" cy="6" r="2.6" />
          <circle cx="117" cy="8" r="2.2" />
          <circle cx="116" cy="94" r="2.8" />
          <circle cx="5" cy="95" r="2" />
          <circle cx="60" cy="99" r="1.6" />
        </svg>
        <picture className="tile-reveal-shadow relative block border-[2px] border-ink bg-paper-shade p-2 shadow-[8px_8px_0_var(--tile-spot)] md:p-3">
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
            className="block max-h-[74vh] max-w-[88vw] object-contain md:max-w-[80vw]"
          />
        </picture>
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
