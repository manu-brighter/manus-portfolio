// src/lib/lightboxStore.ts
import { create } from "zustand";

/**
 * Lightbox state — drives the case-study image-zoom modal.
 *
 * Lifecycle:
 *   closed (activeIndex === null)
 *   ↓ open(index, sourceRect) — captures the source polaroid rect for
 *     the FLIP zoom-from-source animation
 *   open (activeIndex >= 0, sourceRect set)
 *   ↓ close() — zustand-side; the Lightbox component reads this state
 *     change to run the reverse FLIP timeline before unmounting
 *   ↓ prev() / next() — wrap-around navigation in the [0, images.length)
 *     range (per spec §11)
 *
 * Source rect is intentionally re-captured on every open call (and may
 * be re-captured on close, see Lightbox component) because the
 * case-study uses a horizontal scroll-pin: the polaroid's rect on
 * screen can change between open and close if the user pans.
 */

export type LightboxImage = {
  /** High-res JPG fallback URL (used as the canonical src). */
  fullSrc: string;
  /** AVIF srcset URL */
  avifSrc: string;
  /** WebP srcset URL */
  webpSrc: string;
  /** Width / height ratio for the lightbox target rect. */
  aspect: number;
  /** Alt text — same string the source polaroid uses. */
  alt: string;
  /** Single-line caption rendered below the image (datestamp · subject). */
  caption: string;
};

type LightboxState = {
  images: LightboxImage[];
  activeIndex: number | null;
  sourceRect: DOMRect | null;
};

type LightboxActions = {
  setImages: (images: LightboxImage[]) => void;
  open: (index: number, sourceRect: DOMRect) => void;
  close: () => void;
  prev: () => void;
  next: () => void;
};

const INITIAL: LightboxState = {
  images: [],
  activeIndex: null,
  sourceRect: null,
};

export const useLightboxStore = create<LightboxState & LightboxActions>((set, get) => ({
  ...INITIAL,
  setImages: (images) => set({ images }),
  open: (index, sourceRect) => set({ activeIndex: index, sourceRect }),
  close: () => set({ activeIndex: null }),
  prev: () => {
    const { activeIndex, images } = get();
    if (activeIndex === null || images.length === 0) return;
    const total = images.length;
    set({ activeIndex: (activeIndex - 1 + total) % total });
  },
  next: () => {
    const { activeIndex, images } = get();
    if (activeIndex === null || images.length === 0) return;
    set({ activeIndex: (activeIndex + 1) % images.length });
  },
}));
