// src/components/case-study/Lightbox.tsx
"use client";

import gsap from "gsap";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLightboxStore } from "@/lib/lightboxStore";
import { dur, ease } from "@/lib/motion/tokens";

/**
 * Lightbox — case-study image zoom modal.
 *
 * Mounts a single native <dialog> at the section root. The dialog
 * provides built-in focus trap, ESC-to-close, and focus-restore. The
 * component renders no DOM when activeIndex is null (closed state).
 *
 * Animation is layered on in Task 6 (FLIP). Navigation in Task 7.
 * Touch swipe in Task 8. This task ships the open/close lifecycle and
 * the image rendering only.
 */
const easeExpoCSS = `cubic-bezier(${ease.expo[0]}, ${ease.expo[1]}, ${ease.expo[2]}, ${ease.expo[3]})`;

export function Lightbox() {
  const t = useTranslations("caseStudy.lightbox");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const activeIndex = useLightboxStore((s) => s.activeIndex);
  const images = useLightboxStore((s) => s.images);
  const close = useLightboxStore((s) => s.close);
  const prev = useLightboxStore((s) => s.prev);
  const next = useLightboxStore((s) => s.next);
  const reducedMotion = useReducedMotion();
  const sourceRect = useLightboxStore((s) => s.sourceRect);
  const figureRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const previousIndexRef = useRef<number | null>(null);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      // Close when the click lands on the backdrop area:
      // - e.target === dialog itself (CSS ::backdrop in some browsers)
      // - e.target === the grid wrapper div (empty space outside figure)
      if (e.target === e.currentTarget || e.target === gridRef.current) {
        close();
      }
    },
    [close],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, prev, next]);

  useEffect(() => {
    if (activeIndex === null) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onPointerDown = (e: PointerEvent) => {
      // Only track touch / pen — mouse drags shouldn't navigate
      // (mouse users have arrow keys + buttons).
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Horizontal commit threshold; ignore predominantly-vertical swipes.
      if (Math.abs(dy) > 80) return;
      if (dx < -50) next();
      else if (dx > 50) prev();
    };
    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [activeIndex, prev, next]);

  // Open / close the native dialog when activeIndex flips.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeIndex !== null && !dialog.open) {
      dialog.showModal();
    } else if (activeIndex === null && dialog.open) {
      dialog.close();
    }
  }, [activeIndex]);

  // Sync the native dialog's `close` event (ESC key) back to the store.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      // Only push close to the store if the dialog actually closed
      // because of native ESC — guard against the close()-from-store
      // path firing this listener and causing a setState loop.
      if (useLightboxStore.getState().activeIndex !== null) {
        close();
      }
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [close]);

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || activeIndex === null) {
      previousIndexRef.current = activeIndex;
      return;
    }
    // Only run the FLIP open timeline on a TRANSITION from closed → open.
    // Nav transitions (number → number) are handled in Task 7.
    const wasClosed = previousIndexRef.current === null;
    previousIndexRef.current = activeIndex;
    if (!wasClosed) {
      // Number → number (prev/next) — short cross-fade, no FLIP.
      if (reducedMotion) return;
      gsap.fromTo(figure, { opacity: 0 }, { opacity: 1, duration: dur.micro, ease: easeExpoCSS });
      return;
    }

    // Reduced motion: simple opacity fade, skip FLIP entirely.
    if (reducedMotion) {
      gsap.fromTo(figure, { opacity: 0 }, { opacity: 1, duration: dur.short });
      return;
    }

    if (!sourceRect) return;
    // Capture target rect AFTER the dialog has rendered the figure at
    // its target position. Read it from the live element.
    const target = figure.getBoundingClientRect();
    const dx = sourceRect.left + sourceRect.width / 2 - (target.left + target.width / 2);
    const dy = sourceRect.top + sourceRect.height / 2 - (target.top + target.height / 2);
    const sx = sourceRect.width / target.width;
    const sy = sourceRect.height / target.height;
    // Use the smaller scale so the source-rect aspect doesn't squish
    // the target — visually the figure starts at source size, then
    // grows. Slight aspect mismatch between polaroid frame and full
    // image is acceptable for a 300ms transient.
    const s = Math.min(sx, sy);
    gsap.fromTo(
      figure,
      { x: dx, y: dy, scale: s, opacity: 0 },
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: dur.short,
        ease: easeExpoCSS,
      },
    );
  }, [activeIndex, reducedMotion, sourceRect]);

  // Don't render the dialog content tree at all when closed — keeps
  // the DOM clean for the visual baseline and avoids hidden image
  // network requests.
  if (activeIndex === null || images.length === 0) {
    return <dialog ref={dialogRef} aria-label={t("closeLabel")} className="hidden" />;
  }

  const image = images[activeIndex];
  if (!image) return null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: native <dialog> handles ESC via the `close` event (synced to store above); the backdrop is not focusable so keyboard parity is covered by the close button, not a keydown here.
    <dialog
      ref={dialogRef}
      onClick={onBackdropClick}
      aria-labelledby="lightbox-caption"
      className="m-0 max-h-screen max-w-full bg-transparent backdrop:bg-paper-tint/85 backdrop:backdrop-blur-sm p-0 outline-none"
    >
      <div ref={gridRef} className="grid h-screen w-screen place-items-center px-8 py-8">
        <figure ref={figureRef} className="relative">
          <picture
            className="block border-[2px] border-ink shadow-[6px_6px_0_var(--color-spot-rose)]"
            style={{ aspectRatio: image.aspect }}
          >
            <source type="image/avif" srcSet={image.avifSrc} />
            <source type="image/webp" srcSet={image.webpSrc} />
            <img
              src={image.fullSrc}
              alt={image.alt}
              className="block max-h-[80vh] max-w-[90vw] object-contain"
              style={{ aspectRatio: image.aspect }}
            />
          </picture>
          <figcaption
            id="lightbox-caption"
            className="mt-4 flex items-baseline justify-between font-mono text-[0.75rem] uppercase tracking-[0.2em] text-ink-soft"
          >
            <span>{image.caption}</span>
            <span data-testid="lightbox-counter" aria-live="polite" className="text-ink-muted">
              {t("counterLabel", { current: activeIndex + 1, total: images.length })}
            </span>
          </figcaption>
        </figure>
        <button
          type="button"
          onClick={close}
          aria-label={t("closeLabel")}
          className="absolute top-6 right-6 grid size-12 place-items-center border-[1.5px] border-ink bg-paper text-ink text-2xl leading-none shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none"
        >
          <span aria-hidden="true">×</span>
        </button>
        <button
          type="button"
          onClick={prev}
          aria-label={t("previousLabel")}
          className="-translate-y-1/2 absolute top-1/2 left-6 grid size-12 place-items-center border-[1.5px] border-ink bg-paper text-ink text-2xl leading-none shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[-2px] hover:translate-y-[calc(-50%+2px)] hover:shadow-[5px_3px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label={t("nextLabel")}
          className="-translate-y-1/2 absolute top-1/2 right-6 grid size-12 place-items-center border-[1.5px] border-ink bg-paper text-ink text-2xl leading-none shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[calc(-50%+2px)] hover:shadow-[1px_3px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </dialog>
  );
}
