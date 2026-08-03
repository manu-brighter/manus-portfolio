import { create } from "zustand";

/**
 * Top-layer host for the ink cursor.
 *
 * `dialog.showModal()` promotes the dialog into the browser's TOP
 * LAYER, which paints above every normal-flow element regardless of
 * z-index. The InkCursor layers sit at z-[10001] in the body, so
 * inside an open modal they are covered — and because
 * `html[data-ink-cursor] *` hides the native cursor site-wide, the
 * modal ends up with no cursor at all (case-study lightbox).
 *
 * The fix: while a modal is open it registers itself here, and
 * InkCursor portals its canvas + head dot INTO that element so both
 * ride the same top layer. The layers stay `position: fixed`, and a
 * <dialog> establishes no containing block for fixed descendants (no
 * transform/filter on it), so the viewport-relative geometry is
 * unchanged by the move. Blending stays useful too: inside the
 * dialog's stacking context the multiply blend lands on the photo.
 *
 * Register on open, clear on close AND on unmount — a stale host that
 * is `display: none` (the closed lightbox renders a hidden <dialog>)
 * would take the cursor down with it.
 */
type CursorHostStore = {
  /** Element the cursor layers render into; null = default body mount. */
  host: HTMLElement | null;
  setHost: (next: HTMLElement | null) => void;
};

export const useCursorHostStore = create<CursorHostStore>((set) => ({
  host: null,
  setHost: (next) => set({ host: next }),
}));
