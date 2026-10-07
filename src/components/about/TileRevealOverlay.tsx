"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "@/hooks/useLenis";
import { SPOT_CSS_VAR, type SpotColor } from "@/lib/palette";
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
 * Gallery: prev/next buttons, ArrowLeft/ArrowRight and a horizontal
 * touch swipe walk through every revealable tile (wrap-around, like
 * the case-study Lightbox). Each switch remounts the <figure> (keyed
 * on the tile) so a shorter, direction-aware version of the snap
 * replays: the plate lands from the side the next print comes from.
 * The neighbours' <picture>s render `hidden` so their exact source
 * candidate is already cached when the user switches. A persistent
 * sr-only live region (outside the keyed figure, so it survives the
 * remount) announces the new tile; the visible counter is not live,
 * or it would announce twice.
 *
 * Still a fixed div, NOT `dialog.showModal()` — focus handling stays
 * manual: focus lands on close, Tab cycles prev → next → close and
 * never leaves the overlay, Esc and backdrop click close. On close the
 * parent gets the tile that was showing last and restores focus to
 * THAT tile (see ObjectGrid for why not the opener).
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

export type RevealTile = { key: RevealTileKey; spot: SpotColor };

type TileRevealOverlayProps = {
  tiles: readonly RevealTile[];
  initialTile: RevealTileKey;
  /** Receives the tile that was showing when the overlay closed. */
  onClose: (lastTile: RevealTile) => void;
};

type NavDirection = "next" | "prev";

const LEAVE_MS = 180;
// Horizontal swipe commit distance; a predominantly vertical drag
// (> SWIPE_MAX_DY) never navigates. Same numbers as the Lightbox.
const SWIPE_MIN_DX = 50;
const SWIPE_MAX_DY = 80;

const SIZES: Record<TileOrientation, string> = {
  portrait: "88vw",
  landscape: "80vw",
};

const NAV_BUTTON_CLASS =
  "tile-reveal-meta absolute grid size-12 place-items-center border-[1.5px] border-ink bg-paper text-2xl text-ink leading-none shadow-[3px_3px_0_var(--color-ink)] transition-[translate,transform,box-shadow] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none";

function TilePicture({
  tile,
  alt,
  className,
  lowPriority = false,
}: {
  tile: RevealTileKey;
  alt: string;
  className?: string;
  /** Hidden neighbour preloads: never compete with the visible photo. */
  lowPriority?: boolean;
}) {
  return (
    <picture className={className}>
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
        alt={alt}
        fetchPriority={lowPriority ? "low" : undefined}
        sizes={SIZES.landscape}
        // The dvh term reserves the caption row, the control row and
        // the backdrop padding, so short/landscape viewports can't push
        // the caption off-screen. 74vh is the cap on tall viewports
        // where that reserve is not the binding constraint. Below md
        // the reserve is larger: prev/next/close share a top band there
        // (the backdrop's pt-[5.5rem]) instead of overlapping the photo.
        className="block max-h-[min(74vh,calc(100dvh-15rem))] max-w-[88vw] object-contain md:max-h-[min(74vh,calc(100dvh-11rem))] md:max-w-[80vw]"
      />
    </picture>
  );
}

export function TileRevealOverlay({ tiles, initialTile, onClose }: TileRevealOverlayProps) {
  const t = useTranslations("about.objectGrid");
  const [leaving, setLeaving] = useState(false);
  const [view, setView] = useState<{ index: number; dir: NavDirection | null }>(() => ({
    index: Math.max(
      0,
      tiles.findIndex((tile) => tile.key === initialTile),
    ),
    dir: null,
  }));
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const lenis = useLenis();

  const total = tiles.length;
  const current = tiles[view.index] ?? tiles[0];
  const prevTile = tiles[(view.index - 1 + total) % total];
  const nextTile = tiles[(view.index + 1) % total];
  const canNavigate = total > 1;

  // Latest tile for the deferred close callback — the leave timer
  // fires after a render, so a stale closure would report the opener.
  // Synced in an effect, not during render (render stays pure).
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const requestClose = useCallback(() => {
    if (leaveTimerRef.current !== null) return;
    setLeaving(true);
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      if (currentRef.current) onClose(currentRef.current);
    }, LEAVE_MS);
  }, [onClose]);

  const step = useCallback(
    (dir: NavDirection) => {
      if (total < 2 || leaveTimerRef.current !== null) return;
      setView((v) => ({
        index: (v.index + (dir === "next" ? 1 : -1) + total) % total,
        dir,
      }));
    },
    [total],
  );

  // Esc closes, arrows navigate, Tab cycles through the overlay's own
  // controls (prev → next → close) and never escapes to the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Alt/Cmd+Arrow is browser history; leave it alone.
        if (e.altKey || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        step(e.key === "ArrowRight" ? "next" : "prev");
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const controls = [prevBtnRef.current, nextBtnRef.current, closeBtnRef.current].filter(
          (el): el is HTMLButtonElement => el !== null,
        );
        if (controls.length === 0) return;
        const at = controls.indexOf(document.activeElement as HTMLButtonElement);
        const n = controls.length;
        const to = at === -1 ? (e.shiftKey ? n - 1 : 0) : (at + (e.shiftKey ? -1 : 1) + n) % n;
        controls[to]?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose, step]);

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

  // Touch/pen swipe. Mouse drags don't navigate (buttons + keys cover
  // them). `touch-pinch-zoom` on the overlay keeps the browser from
  // claiming the horizontal pan (pointercancel) while pinch-zoom on the
  // photo still works.
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    // A second finger (pinch) must not overwrite the swipe origin.
    if (!e.isPrimary) {
      swipeRef.current = null;
      return;
    }
    swipeRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dy) > SWIPE_MAX_DY) return;
    if (dx <= -SWIPE_MIN_DX) step("next");
    else if (dx >= SWIPE_MIN_DX) step("prev");
  };

  if (!current) return null;
  const name = t(`tiles.${current.key}.name`);
  const caption = t(`tiles.${current.key}.reveal.caption`);
  const counter = t("revealCounter", { current: view.index + 1, total });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc/arrows are handled by the document keydown above; the backdrop itself is not focusable and the buttons carry keyboard parity.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tile-reveal-caption"
      data-no-splat
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeRef.current = null;
      }}
      className={`tile-reveal-backdrop fixed inset-0 z-[9000] grid touch-pinch-zoom place-items-center bg-paper-tint/85 p-5 pt-[5.5rem] backdrop-blur-sm transition-opacity duration-200 md:p-10 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      style={{ "--tile-spot": SPOT_CSS_VAR[current.spot] } as CSSProperties}
    >
      {/* Keyed on the tile: a switch remounts the figure so the snap
          replays; `data-tile-nav` picks the short, direction-aware
          keyframes (globals.css) instead of the opening ones. */}
      <figure
        key={current.key}
        data-tile-nav={view.dir ?? undefined}
        data-testid="tile-reveal-figure"
        data-tile={current.key}
        className="max-w-full"
      >
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
          <TilePicture
            tile={current.key}
            alt={t(`tiles.${current.key}.reveal.alt`)}
            className="tile-reveal-photo relative block border-[2px] border-ink bg-paper-shade p-2 md:p-3"
          />
        </div>
        <figcaption
          id="tile-reveal-caption"
          className="tile-reveal-meta mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"
        >
          <span className="type-label-stamp">{name}</span>
          <span className="font-mono text-ink-muted text-xs uppercase tracking-[0.2em]">
            {caption}
            {canNavigate ? (
              <span data-testid="tile-reveal-counter" className="ml-4 text-ink">
                {counter}
              </span>
            ) : null}
          </span>
        </figcaption>
      </figure>

      {/* Announces the switch. Lives outside the keyed figure so the
          region persists and only its text changes — a freshly
          mounted live region is not announced. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {view.dir ? `${counter}: ${name}. ${caption}` : ""}
      </p>

      {canNavigate && prevTile && nextTile ? (
        <>
          {/* Neighbour preload: hidden pictures resolve the same
              <source> the visible one will, so the next switch paints
              from cache instead of collapsing the frame. */}
          <div hidden>
            <TilePicture tile={prevTile.key} alt="" lowPriority />
            <TilePicture tile={nextTile.key} alt="" lowPriority />
          </div>
          {/* Mobile: a top-left pair beside the close button's row
              (that row is already reserved in the photo's max-height).
              md+: flanking the photo at mid-height, like the Lightbox. */}
          <button
            ref={prevBtnRef}
            type="button"
            onClick={() => step("prev")}
            aria-label={t("revealPrevious")}
            data-testid="tile-reveal-prev"
            className={`${NAV_BUTTON_CLASS} top-5 left-5 hover:translate-x-[-2px] md:top-1/2 md:left-8 md:-translate-y-1/2`}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            ref={nextBtnRef}
            type="button"
            onClick={() => step("next")}
            aria-label={t("revealNext")}
            data-testid="tile-reveal-next"
            className={`${NAV_BUTTON_CLASS} top-5 left-[4.75rem] hover:translate-x-[2px] md:top-1/2 md:right-8 md:left-auto md:-translate-y-1/2`}
          >
            <span aria-hidden="true">›</span>
          </button>
        </>
      ) : null}
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
