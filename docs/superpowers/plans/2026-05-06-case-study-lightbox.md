# Case Study Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 6 Case-Study screenshots clickable; open a custom Riso-aesthetic lightbox with FLIP zoom-from-source animation, keyboard + touch navigation, and full accessibility.

**Architecture:** New zustand store (`lightboxStore`) tracks active image index + source rect; new `<Lightbox>` component mounts a native `<dialog>` at the CaseStudy section root, runs a GSAP FLIP timeline, and wires up keyboard/touch/click nav. Polaroid primitive gains an optional `onClick` prop that turns its inner frame into a `<button>` with hover-zoom affordance. The 4 card components pass `onClick` handlers that capture rects and call store actions.

**Tech Stack:** React 19, TypeScript, zustand (already used), GSAP (already used), native `<dialog>` element, Tailwind CSS arbitrary values, Playwright for smoke tests.

**Spec:** `docs/superpowers/specs/2026-05-06-case-study-lightbox-design.md`

**Branch:** `feat/post-launch-hardening` (already checked out, lightbox is item #6 of the post-launch sprint).

**Wrap-around at gallery edges:** confirmed YES (per spec §11; default behaviour, decided 2026-05-06).

---

## Pre-flight assumptions (verified during planning)

- zustand is an existing dep — `src/lib/inkWipeStore.ts` and `src/lib/sceneVisibility.ts` show the pattern (`create(set => ({...}))` + named exported hook).
- Motion tokens at `src/lib/motion/tokens.ts` — `ease.expo` is a CubicBezier tuple `[0.16, 1, 0.3, 1]`, `dur.short = 0.28`, `dur.micro = 0.14`. GSAP accepts cubic-bezier tuples directly via `gsap.parseEase` or as ``cubic-bezier(${a}, ${b}, ${c}, ${d})``.
- `useReducedMotion` hook lives at `src/hooks/useReducedMotion.ts`.
- Polaroid is exclusively used by case-study cards (verified during the responsive-fix branch); making `onClick` optional has no cross-section ripple.
- Native `<dialog>` is supported in all browsers we ship to (Chrome 37+, Firefox 98+, Safari 15.4+). No polyfill needed.

## File Structure

**New files:**
- `src/lib/lightboxStore.ts` — zustand store, ~50 LOC
- `src/components/case-study/Lightbox.tsx` — modal component, ~200 LOC
- `tests/e2e/case-study-lightbox.spec.ts` — Playwright smoke, ~80 LOC

**Modified files:**
- `src/components/case-study/Polaroid.tsx` — add `onClick?: () => void`, conditionally render as `<button>` with hover scale
- `src/components/case-study/cards/HookCard.tsx` — pass `onClick` to its Polaroid call
- `src/components/case-study/cards/AdminHighlightCard.tsx` — same
- `src/components/case-study/cards/OverlayHighlightCard.tsx` — same
- `src/components/case-study/cards/PublicCard.tsx` — same (3 polaroids)
- `src/components/sections/CaseStudy.tsx` — assemble image array, populate store, mount `<Lightbox />`
- `messages/de.json` (+ EN/FR/IT mirrors) — new `caseStudy.lightbox` namespace

## Code organisation principle

Lightbox.tsx will grow toward 200 LOC. That's still focused (one responsibility: rendering + animating the modal), but I want to extract pure helpers into the same file as small named functions — NOT a new module — because they're tightly coupled to the component's rendering shape. Specifically:
- `targetRectFor(aspect)` — computes the centered target rect from window size + image aspect
- `clampToBounds(targetRect)` — leaves 4rem caption space below
- `useFlipAnimation(...)` — custom hook for the GSAP timeline lifecycle

Tests (Playwright) will treat the lightbox as a black box — no need to test the helpers in isolation.

---

### Task 1: Playwright smoke test (TDD red)

**Files:**
- Create: `tests/e2e/case-study-lightbox.spec.ts`

**Why:** This test pins the contract upfront — clicking a polaroid opens a dialog with the right image, ESC closes, ←/→ navigate. Will FAIL on current code (no lightbox exists yet) — that's the red signal driving Tasks 2-9.

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/case-study-lightbox.spec.ts
import { expect, test } from "@playwright/test";

test.describe("@case-study lightbox", () => {
  // Lightbox lives inside the desktop diorama branch only.
  // 1920x1080 satisfies the height-aware breakpoint added in
  // fix/case-study-responsive (height >= 900).
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("clicking the admin polaroid opens the lightbox", async ({ page }) => {
    await page.goto("/de/");
    const adminPolaroid = page
      .locator("article", { has: page.getByText(/Admin-Dashboard|Highlight 01|Sichtbarstes/) })
      .locator("button[aria-haspopup='dialog']")
      .first();
    await adminPolaroid.scrollIntoViewIfNeeded();
    await adminPolaroid.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    // Counter should read "n / 6"
    await expect(dialog.locator("[data-testid='lightbox-counter']")).toHaveText(/\/\s*6/);
  });

  test("ESC closes the open lightbox", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("right-arrow advances to the next image (with wrap-around)", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const counter = page.locator("dialog[open] [data-testid='lightbox-counter']");
    await expect(counter).toHaveText(/^\s*1\s*\/\s*6\s*$/);
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText(/^\s*2\s*\/\s*6\s*$/);
  });

  test("backdrop click closes the lightbox", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    // Click far from the image — top-left corner of the dialog should be backdrop.
    await dialog.click({ position: { x: 5, y: 5 } });
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("reduced-motion: no FLIP transform applied", async ({ page, browserName: _ }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const img = page.locator("dialog[open] img").first();
    await expect(img).toBeVisible();
    // After 250ms (longer than the reduced-motion fade), the transform must
    // still be none (no scale/translate left over from FLIP).
    await page.waitForTimeout(250);
    const transform = await img.evaluate((el) => getComputedStyle(el).transform);
    expect(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify all 5 tests fail**

Run: `pnpm exec playwright test tests/e2e/case-study-lightbox.spec.ts --reporter=list`

Expected: all 5 FAIL — clickable polaroid button doesn't exist on the page yet (`button[aria-haspopup='dialog']` returns 0 matches).

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/e2e/case-study-lightbox.spec.ts
git commit -m "$(cat <<'EOF'
test / case-study-lightbox : Add smoke test pinning the lightbox contract

- 5 cases: open via click, ESC close, ArrowRight nav, backdrop click,
  reduced-motion no-transform
- All red until Tasks 2-9 land

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `messages/de.json` — add `caseStudy.lightbox` namespace
- Modify: `messages/en.json`, `messages/fr.json`, `messages/it.json` — DE-source mirror

- [ ] **Step 1: Locate the closing brace of `caseStudy` namespace**

Find the existing `caseStudy.footerLink` block (that's where Task 8 of the responsive-fix branch added work). The lightbox namespace sits as a sibling of `footerLink`.

- [ ] **Step 2: Add lightbox keys to `messages/de.json`**

Insert after the existing `caseStudy.footerLink` block (or as a sibling — find the right closing brace):

```json
    "lightbox": {
      "closeLabel": "Lightbox schließen",
      "previousLabel": "Vorheriges Bild",
      "nextLabel": "Nächstes Bild",
      "counterLabel": "{current} / {total}"
    },
```

- [ ] **Step 3: Mirror identically into `en.json`, `fr.json`, `it.json`**

Same JSON block, same DE strings (project pattern: DE source mirrored across locales; proper translation deferred per CLAUDE.md Phase 6 deviations).

- [ ] **Step 4: Verify JSON validity**

Run: `pnpm typecheck` (must pass — next-intl compile would fail on bad JSON).

- [ ] **Step 5: Commit**

```bash
git add messages/de.json messages/en.json messages/fr.json messages/it.json
git commit -m "$(cat <<'EOF'
chore / i18n : Add caseStudy.lightbox namespace (close/prev/next/counter)

- DE source; en/fr/it mirrored per project pattern

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: lightboxStore

**Files:**
- Create: `src/lib/lightboxStore.ts`

- [ ] **Step 1: Write the store**

```ts
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
```

- [ ] **Step 2: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/lib/lightboxStore.ts` — must pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/lightboxStore.ts
git commit -m "$(cat <<'EOF'
feat / case-study-lightbox : Add zustand store for lightbox state

- LightboxImage data shape; activeIndex + sourceRect state
- Actions: setImages / open / close / prev / next
- prev/next wrap around at gallery edges (per spec)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Polaroid onClick + hover affordance

**Files:**
- Modify: `src/components/case-study/Polaroid.tsx`

- [ ] **Step 1: Add `onClick` prop type**

In the `Props` type (around line 18-34), add the new optional field:

```tsx
type Props = {
  /** Aspect-ratio of the inner photo. "16/9" for landscape, "9/16" for phone. */
  aspect: "16/9" | "9/16" | "4/3";
  /** Rotation in degrees (±3 is the typical desktop range). 0 disables.
   * Forced to 0 under prefers-reduced-motion. */
  rotate?: number;
  /** Spot-color for offset shadow + plate-corner accent. */
  spot: "rose" | "amber" | "mint" | "violet";
  /** Photo content (`<picture>` or `<img>`). */
  children: ReactNode;
  /** Caption strip rendered below the photo (mono-font, dated/tagged feel). */
  caption?: string;
  /** Decorative datestamp ("2024.06"). Rendered top-right of frame. */
  datestamp?: string;
  /** Pass-through className for outer wrapper (sizing). */
  className?: string;
  /** When provided, the inner image-frame becomes a <button> that
   *  triggers this handler on click. The button is the FLIP source —
   *  the lightbox captures its bounding rect for the zoom animation.
   *  When omitted (legacy / non-clickable), the frame stays a <div>. */
  onClick?: () => void;
};
```

- [ ] **Step 2: Conditionally render the inner frame as a button**

Replace the existing inner-frame `<div>` (around line 65-70):

OLD:
```tsx
      <div
        className="relative overflow-hidden border-[1.5px] border-ink"
        style={{ aspectRatio: aspect }}
      >
        {children}
      </div>
```

NEW:
```tsx
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-haspopup="dialog"
          className="group relative block w-full overflow-hidden border-[1.5px] border-ink cursor-zoom-in transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none motion-reduce:hover:scale-100"
          style={{ aspectRatio: aspect }}
        >
          {children}
        </button>
      ) : (
        <div
          className="relative overflow-hidden border-[1.5px] border-ink"
          style={{ aspectRatio: aspect }}
        >
          {children}
        </div>
      )}
```

- [ ] **Step 3: Update the function signature to accept onClick**

Find the destructured props in the function body and add `onClick`:

OLD:
```tsx
export function Polaroid({
  aspect,
  rotate = 0,
  spot,
  children,
  caption,
  datestamp,
  className,
}: Props) {
```

NEW:
```tsx
export function Polaroid({
  aspect,
  rotate = 0,
  spot,
  children,
  caption,
  datestamp,
  className,
  onClick,
}: Props) {
```

- [ ] **Step 4: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/Polaroid.tsx` — must pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/case-study/Polaroid.tsx
git commit -m "$(cat <<'EOF'
feat / case-study-lightbox : Polaroid accepts onClick to become a button

- New optional onClick prop; when provided, the inner image-frame
  renders as <button type=button aria-haspopup=dialog> with cursor
  zoom-in, hover scale 1.02 (motion-reduce safe), and a spot-mint
  focus ring
- Outer figure layout unchanged; downstream cards stay backwards-compat
  unless they pass onClick

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Lightbox component — open/close + image display (no animation yet)

**Files:**
- Create: `src/components/case-study/Lightbox.tsx`

- [ ] **Step 1: Write the skeleton component**

```tsx
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
    return (
      <dialog
        ref={dialogRef}
        aria-label={t("closeLabel")}
        className="hidden"
      />
    );
  }

  const image = images[activeIndex];
  if (!image) return null;

  return (
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
```

- [ ] **Step 2: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/Lightbox.tsx` — must pass.

The Playwright test won't pass yet (no card wires the click handler, no polaroid has `aria-haspopup='dialog'`); that lands in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/components/case-study/Lightbox.tsx
git commit -m "$(cat <<'EOF'
feat / case-study-lightbox : Add Lightbox component skeleton

- Native <dialog> with paper-tint/85 backdrop + halftone-friendly blur,
  showModal()/close() driven by lightboxStore.activeIndex
- Renders <picture> (avif/webp/jpg) + caption + counter; close button
  top-right with Riso paper/ink stamp styling
- Native dialog gives free focus trap, ESC handling, focus restore
- Empty <dialog className="hidden"/> when closed -- keeps DOM clean and
  the visual-baseline snapshot stable
- Animation, prev/next nav, swipe land in Tasks 6-8

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: FLIP open/close animation + reduced-motion fallback

**Files:**
- Modify: `src/components/case-study/Lightbox.tsx`

- [ ] **Step 1: Add the FLIP timeline hook**

At the top of `Lightbox.tsx`, after the existing imports, add the GSAP + reduced-motion + tokens imports:

```tsx
import gsap from "gsap";
import { ease, dur } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/hooks/useReducedMotion";
```

- [ ] **Step 2: Convert ease tuple to GSAP cubic-bezier**

Add a small helper at module scope (above the component function):

```tsx
const easeExpoCSS = `cubic-bezier(${ease.expo[0]}, ${ease.expo[1]}, ${ease.expo[2]}, ${ease.expo[3]})`;
```

- [ ] **Step 3: Wire up the FLIP effect inside the component**

Add the following `useEffect` block inside `Lightbox` AFTER the existing `useEffect` that toggles `showModal`/`close`. This effect runs whenever `activeIndex` changes from null → number (open) or number → null (close), or between numbers (nav). The animation only plays for the open transition; nav transitions are a simple cross-fade (Task 7), and close runs in reverse.

```tsx
  const reducedMotion = useReducedMotion();
  const sourceRect = useLightboxStore((s) => s.sourceRect);
  const figureRef = useRef<HTMLElement | null>(null);
  const previousIndexRef = useRef<number | null>(null);

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
    if (!wasClosed) return;

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
```

- [ ] **Step 4: Add `ref={figureRef}` to the `<figure>`**

Update the existing `<figure>` element:

OLD:
```tsx
        <figure className="relative">
```

NEW:
```tsx
        <figure ref={figureRef} className="relative">
```

- [ ] **Step 5: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/Lightbox.tsx` — must pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/case-study/Lightbox.tsx
git commit -m "$(cat <<'EOF'
feat / case-study-lightbox : FLIP zoom-from-source open animation

- On open transition, GSAP timeline tweens the figure from
  sourceRect (captured at click time) to its centred target rect
  over dur.short (280ms) with ease.expo
- Uses Math.min(scaleX, scaleY) to avoid aspect-squish during the
  transient
- Reduced-motion branch: simple opacity fade, no transform
- Close animation (reverse) lands in Task 7 alongside nav

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Prev/Next navigation + counter + keyboard

**Files:**
- Modify: `src/components/case-study/Lightbox.tsx`

- [ ] **Step 1: Add prev/next subscriptions and keyboard handler**

Inside the Lightbox component, after the existing `close` selector:

```tsx
  const prev = useLightboxStore((s) => s.prev);
  const next = useLightboxStore((s) => s.next);
```

Then add a new useEffect for keyboard nav (above the existing showModal effect):

```tsx
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
```

- [ ] **Step 2: Add prev/next buttons next to the figure**

After the existing close button (just before the closing `</div>` of the grid container), add:

```tsx
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
```

- [ ] **Step 3: Add a cross-fade for nav transitions**

Modify the existing FLIP effect to handle the nav case (number → number transition). Below the `if (!wasClosed) return;` line, add a nav branch BEFORE the early return:

REPLACE:
```tsx
    const wasClosed = previousIndexRef.current === null;
    previousIndexRef.current = activeIndex;
    if (!wasClosed) return;
```

WITH:
```tsx
    const wasClosed = previousIndexRef.current === null;
    previousIndexRef.current = activeIndex;
    if (!wasClosed) {
      // Number → number (prev/next) — short cross-fade, no FLIP.
      if (reducedMotion) return;
      gsap.fromTo(
        figure,
        { opacity: 0 },
        { opacity: 1, duration: dur.micro, ease: easeExpoCSS },
      );
      return;
    }
```

- [ ] **Step 4: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/Lightbox.tsx` — must pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/case-study/Lightbox.tsx
git commit -m "$(cat <<'EOF'
feat / case-study-lightbox : Prev/next navigation + keyboard + counter

- Window-level keydown handler for ArrowLeft / ArrowRight (only when
  open); calls store.prev() / store.next() with wrap-around
- Two Riso-stamp prev/next buttons at the vertical centre of left/right
  edges; respect motion-reduce
- Counter already wired to store.activeIndex via t() in Task 5;
  aria-live=polite announces nav to AT users
- Number→number transition uses dur.micro (140ms) opacity cross-fade,
  not FLIP (FLIP is reserved for open/close per spec §7)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Touch swipe navigation

**Files:**
- Modify: `src/components/case-study/Lightbox.tsx`

- [ ] **Step 1: Add a pointer-tracker effect**

After the keyboard-nav useEffect, add:

```tsx
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
```

- [ ] **Step 2: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/Lightbox.tsx` — must pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/case-study/Lightbox.tsx
git commit -m "$(cat <<'EOF'
feat / case-study-lightbox : Touch swipe navigation

- Dialog-level pointerdown/pointerup tracker, gated on pointerType
  touch | pen so mouse drags don't accidentally navigate
- 50px horizontal threshold to commit; reject predominantly-vertical
  swipes (dy > 80px) so vertical scroll attempts don't trigger nav

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Wire up cards + CaseStudy.tsx assembly

**Files:**
- Modify: `src/components/case-study/cards/HookCard.tsx`
- Modify: `src/components/case-study/cards/AdminHighlightCard.tsx`
- Modify: `src/components/case-study/cards/OverlayHighlightCard.tsx`
- Modify: `src/components/case-study/cards/PublicCard.tsx`
- Modify: `src/components/sections/CaseStudy.tsx`

This task is bigger — single commit at the end because the changes are coupled (cards expect indices that CaseStudy assembles).

**The image-index contract:**

The lightbox image array is assembled in CaseStudy.tsx in this fixed order:
- 0: Hook (Joggediballa-Mobile-Homepage)
- 1: Admin (Admin-Dashboard screenshot)
- 2: Overlay (Twitch-Overlay screenshot)
- 3: Public-shot 0 (statistics)
- 4: Public-shot 1 (gönnerverwaltung)
- 5: Public-shot 2 (formular-phone)

Total images: 6. Cards receive their starting `lightboxIndex` via prop.

- [ ] **Step 1: HookCard — accept `onPolaroidClick` prop and forward to Polaroid**

Modify `src/components/case-study/cards/HookCard.tsx`. Add to Props (around line 3):

```tsx
type Props = {
  hookText: string;
  datestamp: string;
  polaroidCaption: string;
  onPolaroidClick?: () => void;
};
```

In the function destructure + Polaroid call site, pass through:

OLD:
```tsx
export function HookCard({ hookText, datestamp, polaroidCaption }: Props) {
```

NEW:
```tsx
export function HookCard({ hookText, datestamp, polaroidCaption, onPolaroidClick }: Props) {
```

And on the existing `<Polaroid>` element, add `onClick={onPolaroidClick}`:

OLD:
```tsx
        <Polaroid
          aspect="9/16"
          rotate={0}
          spot="rose"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
        >
```

NEW:
```tsx
        <Polaroid
          aspect="9/16"
          rotate={0}
          spot="rose"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
          onClick={onPolaroidClick}
        >
```

- [ ] **Step 2: AdminHighlightCard — same pattern**

Modify `src/components/case-study/cards/AdminHighlightCard.tsx`. Add `onPolaroidClick` to Props and pass to Polaroid:

```tsx
type Props = {
  kicker: string;
  title: string;
  lede: string;
  features: Feature[];
  screenshotAlt: string;
  datestamp: string;
  polaroidCaption: string;
  onPolaroidClick?: () => void;
};
```

```tsx
export function AdminHighlightCard({
  kicker,
  title,
  lede,
  features,
  screenshotAlt,
  datestamp,
  polaroidCaption,
  onPolaroidClick,
}: Props) {
```

```tsx
        <Polaroid
          aspect="16/9"
          rotate={0}
          spot="rose"
          datestamp={datestamp}
          caption={polaroidCaption}
          className="w-full"
          onClick={onPolaroidClick}
        >
```

- [ ] **Step 3: OverlayHighlightCard — same pattern**

Identical edits to `src/components/case-study/cards/OverlayHighlightCard.tsx` (Props + destructure + onClick pass-through).

- [ ] **Step 4: PublicCard — accept an array of click handlers (3 polaroids)**

Modify `src/components/case-study/cards/PublicCard.tsx`. The 3 polaroids in the row map by index, so accept an `onShotClick` callback that takes the shot index:

```tsx
type Props = {
  shots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
  onShotClick?: (shotIndex: number) => void;
};
```

```tsx
export function PublicCard({
  shots,
  reflectionLabel,
  reflectionBody,
  footerLabel,
  footerDomain,
  footerUrl,
  footerExternal,
  onShotClick,
}: Props) {
```

In the `shots.map((s, i) => ...)` body, find the `<Polaroid>` element and add `onClick`:

OLD:
```tsx
              <Polaroid
                aspect={s.aspect}
                rotate={0}
                spot={s.spot}
                datestamp={s.datestamp}
                caption={s.caption}
                className="w-full"
              >
```

NEW:
```tsx
              <Polaroid
                aspect={s.aspect}
                rotate={0}
                spot={s.spot}
                datestamp={s.datestamp}
                caption={s.caption}
                className="w-full"
                onClick={onShotClick ? () => onShotClick(i) : undefined}
              >
```

- [ ] **Step 5: CaseStudy.tsx — assemble image array, populate store, mount Lightbox**

Modify `src/components/sections/CaseStudy.tsx`. Add at the top of the imports:

```tsx
import { useEffect, useMemo } from "react";
import { Lightbox } from "@/components/case-study/Lightbox";
import { type LightboxImage, useLightboxStore } from "@/lib/lightboxStore";
```

(`useMemo` may already be imported if not; add it if missing.)

After the existing `publicShots` derivation in the function body, ADD:

```tsx
  // Image set for the lightbox — fixed order: hook (0), admin (1),
  // overlay (2), public shots 3/4/5. Each entry uses the largest
  // available width as the lightbox source.
  const lightboxImages = useMemo<LightboxImage[]>(() => {
    const out: LightboxImage[] = [
      {
        fullSrc: "/projects/joggediballa/homepage-phone-720w.jpg",
        avifSrc: "/projects/joggediballa/homepage-phone-720w.avif",
        webpSrc: "/projects/joggediballa/homepage-phone-720w.webp",
        aspect: 540 / 960,
        alt: "Joggediballa Homepage Mobile",
        caption: hookStation.polaroidCaption ?? "",
      },
    ];
    if (adminHighlight) {
      out.push({
        fullSrc: "/projects/joggediballa/admin-1200w.jpg",
        avifSrc: "/projects/joggediballa/admin-1200w.avif",
        webpSrc: "/projects/joggediballa/admin-1200w.webp",
        aspect: 800 / 450,
        alt: adminHighlight.screenshotAlt,
        caption: highlightAdmin.polaroidCaption ?? "",
      });
    }
    if (overlayHighlight) {
      out.push({
        fullSrc: "/projects/joggediballa/twitchoverlay-1200w.jpg",
        avifSrc: "/projects/joggediballa/twitchoverlay-1200w.avif",
        webpSrc: "/projects/joggediballa/twitchoverlay-1200w.webp",
        aspect: 800 / 450,
        alt: overlayHighlight.screenshotAlt,
        caption: highlightOverlay.polaroidCaption ?? "",
      });
    }
    publicShots.forEach((s) => {
      const isPortrait = s.aspect === "9/16";
      const fallbackW = isPortrait ? 720 : 1200;
      out.push({
        fullSrc: `/projects/joggediballa/${s.slug}-${fallbackW}w.jpg`,
        avifSrc: `/projects/joggediballa/${s.slug}-${fallbackW}w.avif`,
        webpSrc: `/projects/joggediballa/${s.slug}-${fallbackW}w.webp`,
        aspect: isPortrait ? 540 / 960 : 800 / 450,
        alt: s.alt,
        caption: s.caption,
      });
    });
    return out;
  }, [
    adminHighlight,
    overlayHighlight,
    highlightAdmin.polaroidCaption,
    highlightOverlay.polaroidCaption,
    hookStation.polaroidCaption,
    publicShots,
  ]);

  const setLightboxImages = useLightboxStore((s) => s.setImages);
  const openLightbox = useLightboxStore((s) => s.open);
  useEffect(() => {
    setLightboxImages(lightboxImages);
  }, [lightboxImages, setLightboxImages]);

  const onPolaroidClick = (index: number) => (event: React.MouseEvent<HTMLElement>) => {
    // The Polaroid's onClick receives no event args; we close over `event`
    // via the parent click. Capture rect from the event's currentTarget.
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    openLightbox(index, rect);
  };
```

Wait — but Polaroid's `onClick: () => void` signature has no event arg per Task 4. Need a different rect-capture strategy. Use a ref-based approach OR change Polaroid to pass the event.

ADJUSTED: Polaroid forwards event-less onClick. So we capture rect via a ref placed on the wrapping article element. Replace the click-handler block above with:

```tsx
  const setLightboxImages = useLightboxStore((s) => s.setImages);
  const openLightbox = useLightboxStore((s) => s.open);
  useEffect(() => {
    setLightboxImages(lightboxImages);
  }, [lightboxImages, setLightboxImages]);

  // Click handler factory: looks up the polaroid button via its
  // data-lightbox-index attribute, captures its bounding rect, then
  // opens the lightbox.
  const handleOpen = (index: number) => () => {
    if (typeof document === "undefined") return;
    const el = document.querySelector<HTMLElement>(
      `button[data-lightbox-index="${index}"]`,
    );
    const rect = el?.getBoundingClientRect();
    if (!rect) return;
    openLightbox(index, rect);
  };
```

We will set `data-lightbox-index` on each Polaroid button via a small follow-up: instead of threading more props, lift the responsibility into Polaroid OR just pass a `data-` via a wrapping span. Simpler: pass the `lightboxIndex` to each card and have THE CARD set the data attribute on its Polaroid wrapping element via a wrapping `<div data-lightbox-index={...}>`. But Polaroid is the button.

Let's instead make Polaroid accept a `data-*` rest prop OR add a `lightboxIndex?: number` prop that, when present, decorates the button with `data-lightbox-index`. That's a minor Polaroid extension — better do it now.

ADD to Polaroid Props (this is an ADDENDUM to Task 4 — apply in Task 9 if you skipped it earlier):

```tsx
  /** When provided, decorates the inner button with
   *  data-lightbox-index, used by the parent CaseStudy to look up the
   *  source rect at open time. */
  lightboxIndex?: number;
```

In Polaroid.tsx, on the conditional `<button>`:

OLD:
```tsx
        <button
          type="button"
          onClick={onClick}
          aria-haspopup="dialog"
```

NEW:
```tsx
        <button
          type="button"
          onClick={onClick}
          aria-haspopup="dialog"
          data-lightbox-index={lightboxIndex}
```

And destructure `lightboxIndex` in the props.

- [ ] **Step 6: Wire `lightboxIndex` through the cards**

In each card component (HookCard, AdminHighlightCard, OverlayHighlightCard, PublicCard), add a `lightboxIndex?: number` prop that passes through to Polaroid. For PublicCard with 3 polaroids, accept a `lightboxBaseIndex?: number` instead, and pass `lightboxBaseIndex + i` to each Polaroid.

Concrete edits per card:
- **HookCard:** add `lightboxIndex?: number` to Props, pass to Polaroid as `lightboxIndex={lightboxIndex}`.
- **AdminHighlightCard:** same.
- **OverlayHighlightCard:** same.
- **PublicCard:** add `lightboxBaseIndex?: number` to Props. In the `shots.map((s, i) => ...)` body, on the Polaroid, add `lightboxIndex={lightboxBaseIndex !== undefined ? lightboxBaseIndex + i : undefined}`.

- [ ] **Step 7: CaseStudy.tsx — pass click handlers + indices to cards**

In CaseStudy.tsx's `<DioramaCards />` call, the cards are populated via props that DioramaCards then forwards. Open `src/components/case-study/DioramaCards.tsx` and audit — it already takes admin/overlay/public props verbatim. We need DioramaCards.tsx to forward the new `onPolaroidClick` and `lightboxIndex` props to each card.

Modify `src/components/case-study/DioramaCards.tsx`:

In the Props type, add the four new fields:

```tsx
  hookOnClick?: () => void;
  adminOnClick?: () => void;
  overlayOnClick?: () => void;
  publicOnShotClick?: (shotIndex: number) => void;
```

In the JSX, pass these and the corresponding indices to each card:
- HookCard: `lightboxIndex={0}` and `onPolaroidClick={props.hookOnClick}`
- AdminHighlightCard: `lightboxIndex={1}` and `onPolaroidClick={props.adminOnClick}`
- OverlayHighlightCard: `lightboxIndex={2}` and `onPolaroidClick={props.overlayOnClick}`
- PublicCard: `lightboxBaseIndex={3}` and `onShotClick={props.publicOnShotClick}`

Same wiring also applies to the **mobileFallback** block in `CaseStudy.tsx` (the vertical-stack rendering passes individual cards directly; pass `lightboxIndex` + `onPolaroidClick` there too).

In CaseStudy.tsx, supply the click handlers from the factory to BOTH branches:

For the mobileFallback — wrap each card with `lightboxIndex={N}` and `onPolaroidClick={handleOpen(N)}`. For the desktop diorama — pass `hookOnClick={handleOpen(0)}`, `adminOnClick={handleOpen(1)}`, `overlayOnClick={handleOpen(2)}`, `publicOnShotClick={(i) => handleOpen(3 + i)()}`.

Finally, mount the Lightbox once at the section level. The current CaseStudy.tsx renders `<DioramaTrack mobileFallback={mobileFallback}>...</DioramaTrack>`. Add `<Lightbox />` AFTER the DioramaTrack closing tag — wrap both in a fragment:

```tsx
  return (
    <>
      <DioramaTrack mobileFallback={mobileFallback}>
        ...
      </DioramaTrack>
      <Lightbox />
    </>
  );
```

(This places the dialog outside the section but inside the page, which is what we want — the dialog should sit at the top of the stacking context, not inside the diorama's pinned section which has `overflow-hidden`.)

- [ ] **Step 8: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint` — must pass.

- [ ] **Step 9: Run the Playwright suite**

Run: `pnpm exec playwright test tests/e2e/case-study-lightbox.spec.ts --reporter=list`

Expected: all 5 tests PASS.

If any test fails, diagnose and fix in this task before committing.

- [ ] **Step 10: Commit**

```bash
git add src/components/case-study/ src/components/sections/CaseStudy.tsx
git commit -m "$(cat <<'EOF'
feat / case-study-lightbox : Wire up cards, assemble image array, mount Lightbox

- Polaroid gains lightboxIndex prop -> data-lightbox-index attribute
  used by the source-rect lookup at open time
- HookCard / AdminHighlightCard / OverlayHighlightCard / PublicCard
  accept onPolaroidClick (or onShotClick + lightboxBaseIndex) and
  forward to Polaroid
- DioramaCards forwards the four click handlers to its 6 polaroids
- CaseStudy assembles the 6-image LightboxImage array (hook, admin,
  overlay, three public shots), pushes to lightboxStore on mount,
  and supplies handlers via a handleOpen(index) factory that resolves
  the source rect via document.querySelector at click time
- Mounted <Lightbox /> at the section root inside a fragment with
  DioramaTrack so the dialog sits above the pinned section's
  overflow-hidden context

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Final CI gate

**Files:** none (verification only)

- [ ] **Step 1: Run full local CI**

Run: `pnpm ci:local`

Expected: all stages pass — lint, typecheck, build, full Playwright suite incl. case-study + lightbox + visual baseline.

If the visual baseline diff trips at 1280×800 (height fallback viewport, where the lightbox isn't reachable but Polaroid hover affordances live), inspect the diff. The Polaroid hover styles only apply on hover, so an idle screenshot should be unchanged. If a change appears, document and update the snapshot:

```bash
pnpm test:visual --update-snapshots
git add tests/visual/
git commit -m "$(cat <<'EOF'
test / case-study-lightbox : Update visual baseline if Polaroid changes drifted

(only commit if a real diff appears at idle state)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

If no diff, skip the snapshot commit.

- [ ] **Step 2: Manual smoke (Manuel)**

Manuel runs `pnpm dev` and tests:
- Click each of the 6 polaroids in case-study → lightbox opens to the right image
- ESC, X button, backdrop click all close
- ←/→ navigate with wrap-around
- Counter reads correctly (1/6 through 6/6)
- Hover shows zoom-in cursor + scale on polaroids
- Reduced-motion (DevTools) — opens with simple fade, no FLIP
- Mobile (DevTools touch device): swipe left/right navigates

If any visual issue, report back to fix before merging.

---

## Self-review checklist

- [x] **Spec coverage:**
  - §3 decisions (custom, FLIP, gallery nav, all-3 close affordances, hover affordance) → Tasks 4, 5, 6, 7
  - §4 architecture (lightboxStore, Lightbox.tsx, modified files) → Tasks 3, 5-9
  - §5 data shape (LightboxImage) → Task 3
  - §6 visual layout (paper-tint backdrop, Riso plate shadow, Riso-stamp buttons) → Tasks 5, 7
  - §7 animation timeline (FLIP open/close, cross-fade nav, reduced-motion) → Tasks 6, 7
  - §8 touch swipe → Task 8
  - §9 a11y (dialog labelledby, aria-live counter, keyboard) → Tasks 5, 7
  - §11 wrap-around at edges (confirmed YES) → Task 3 (modulo arithmetic)
  - §12 done definition → Task 10
- [x] **Placeholder scan:** no TBD/TODO/"implement later". Code blocks complete.
- [x] **Type consistency:**
  - `LightboxImage` defined in Task 3 used in Task 9 with same fields.
  - `setImages`/`open`/`close`/`prev`/`next` action names match across Tasks 3, 5, 7, 9.
  - `onClick`/`onPolaroidClick`/`onShotClick`/`lightboxIndex`/`lightboxBaseIndex` prop names consistent across cards.
- [x] **Spec-decision close mechanism:** Task 5 implements onClick on backdrop + native ESC. Task 5 close button. Three close affordances all covered.
