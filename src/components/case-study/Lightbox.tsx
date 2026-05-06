// src/components/case-study/Lightbox.tsx
"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { useLightboxStore } from "@/lib/lightboxStore";

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
export function Lightbox() {
  const t = useTranslations("caseStudy.lightbox");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const activeIndex = useLightboxStore((s) => s.activeIndex);
  const images = useLightboxStore((s) => s.images);
  const close = useLightboxStore((s) => s.close);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      // Native <dialog> backdrop click bubbles to the dialog itself
      // when the user clicks outside the inner content. Detect via
      // target identity.
      if (e.target === e.currentTarget) {
        close();
      }
    },
    [close],
  );

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
      <div className="grid h-screen w-screen place-items-center px-8 py-8">
        <figure className="relative">
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
      </div>
    </dialog>
  );
}
