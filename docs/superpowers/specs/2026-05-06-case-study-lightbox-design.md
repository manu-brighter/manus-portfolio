# Case Study Lightbox — Design Spec

**Status:** Brainstormed and approved 2026-05-06. Ready for implementation plan.

**Goal:** Make every screenshot/photo in the Case Study section clickable so visitors can see UI details (button labels, statistics, code text) at full resolution. Custom Riso-aesthetic lightbox with FLIP zoom animation, keyboard + touch navigation, and full a11y.

**Branch:** `feat/post-launch-hardening` (continues; this is item #6 of the post-launch sprint).

**Spec date:** 2026-05-06

---

## 1. Why

The Case Study diorama renders 6 screenshots inside small Polaroid frames (max ~70vh wide, often less). UI captures like the Admin-Dashboard or Twitch-Overlay are unreadable at that scale — the whole point of those screenshots (showing the actual product) is lost. A click-to-enlarge lightbox solves this without sacrificing the editorial polaroid layout.

## 2. Scope

**In scope — 6 images become clickable:**
1. Hook-card phone screenshot (`/projects/joggediballa/homepage-phone-{w}.{ext}`, 9:16)
2. Admin-Highlight screenshot (`/projects/joggediballa/admin-{w}.{ext}`, 16:9)
3. Overlay-Highlight screenshot (`/projects/joggediballa/twitchoverlay-{w}.{ext}`, 16:9)
4-6. Public-Layer polaroids: statistics, gönnerverwaltung, formular-phone (mix of 16:9 and 9:16)

**Out of scope:**
- Photography section (the ink-mask-reveal IS the experience there — adding a lightbox would conflict)
- Portrait (no need)
- Sitewide other images (Hero, About-Portrait, Playground card visuals, etc.)
- The mobile/vertical-stack fallback (cards are already nearly full-width there; lightbox value is marginal — but: should still WORK on the fallback, just won't be commonly used. Implementation will be viewport-agnostic anyway.)

## 3. Architecture decisions

### 3.1 Implementation — custom over library

**Rejected:** `yet-another-react-lightbox` (~24KB gz), `photoswipe` (~30KB gz). Pro: battle-tested. Con: generic look conflicts with the Riso aesthetic.

**Chosen:** Custom component using the native `<dialog>` element + GSAP for the FLIP animation. ~150 LOC. Reasons:
- Native `<dialog>` provides free focus trap, ESC-to-close, focus restoration
- Riso aesthetic (paper-tint backdrop, Riso plate offset shadow, halftone overlay) needs custom styling anyway
- Project already ships several custom WebGL/GSAP components (InkWipeOverlay, PhotoInkMask, FluidSim) — custom Lightbox is consistent
- Bundle budget (§8 < 130KB gz initial) is tight; saves ~25KB

### 3.2 Animation — FLIP zoom-from-source

The image animates from its source-polaroid position (captured via `getBoundingClientRect()`) to the centered target rect, scaling up over 300ms (ease.expo from `motion/tokens.ts`). Close reverses it.

Reduced-motion branch: instant show/hide with simple fade (no transform tween).

### 3.3 Navigation — gallery model

ESC = close. ←/→ keys = prev/next. Touch swipe (horizontal) = prev/next on mobile/tablet (dx > 50px threshold). Counter "n / 6" shown.

### 3.4 Close affordances — three of them

ESC (native dialog), backdrop click, X button top-right. Defensive UX: any of the three does the same.

### 3.5 Hover affordance

On polaroids that wrap clickable images:
- `cursor: zoom-in`
- Hover scale 1.02 (350ms ease-out)
- Spot-color shadow grows from `5px 5px` → `8px 8px` to read as "lifted"
- Reduced-motion: cursor only, no scale/shadow change

## 4. Architecture

### 4.1 New files

- `src/lib/lightboxStore.ts` — zustand store. State: `{ images: LightboxImage[]; activeIndex: number | null; sourceRect: DOMRect | null }`. Actions: `open(index, sourceRect)`, `close()`, `prev()`, `next()`. ~40 LOC.
- `src/components/case-study/Lightbox.tsx` — the modal component. Reads from store; mounts a single `<dialog>` at the layout root; runs the GSAP FLIP timeline; wires up keyboard + touch + click handlers. ~150 LOC.

### 4.2 Modified files

- `src/components/case-study/Polaroid.tsx` — accept new optional `onClick?: () => void` prop. If provided, the inner `<div className="...border-ink...">` is rendered as a `<button>` with `cursor: zoom-in`, hover scale, and the onClick handler. Otherwise unchanged (no-op for any future call site that's just a frame).
- `src/components/case-study/cards/HookCard.tsx`, `AdminHighlightCard.tsx`, `OverlayHighlightCard.tsx`, `PublicCard.tsx` — pass `onClick` to their Polaroid usages. Each `onClick` captures the polaroid's `<button>` rect via a ref and calls `lightboxStore.open(index, rect)` with the right index.
- `src/components/sections/CaseStudy.tsx` — assemble the `LightboxImage[]` array (deriving high-res URLs from the same data already in the cards) and call `lightboxStore.setImages(images)` on mount. Render `<Lightbox />` once at the section root.

### 4.3 New i18n keys

In `messages/{de,en,fr,it}.json` under `caseStudy.lightbox`:
- `closeLabel` — aria-label for X button: "Lightbox schließen"
- `previousLabel` — aria-label for prev button: "Vorheriges Bild"
- `nextLabel` — aria-label for next button: "Nächstes Bild"
- `counterLabel` — "{current} / {total}" pattern (next-intl ICU)

### 4.4 New Playwright test

`tests/e2e/case-study-lightbox.spec.ts` — smoke test:
- Click Admin polaroid in case-study → assert dialog opens, image visible
- ESC → assert dialog closes
- Click polaroid → arrow-right key → assert next image showing (advances `aria-label` of img or counter text)
- prefers-reduced-motion → click → assert no transform style applied (or a snapshot of computed style)

## 5. Data shape

```ts
type LightboxImage = {
  /** High-res JPG URL — used for the lightbox view */
  fullSrc: string;
  /** AVIF and WebP URLs for picture-element variants */
  avifSrc: string;
  webpSrc: string;
  /** Aspect ratio (width/height) — used to compute target rect */
  aspect: number;
  /** Alt text */
  alt: string;
  /** Caption shown below the image in the lightbox (datestamp · location) */
  caption: string;
};
```

CaseStudy.tsx assembles 6 of these from the same i18n + URL data already in the cards.

## 6. Lightbox visual

```
+----------------------------------------------------+
| (paper-tint backdrop, ~85% opacity                |
|  + halftone dot grain pattern)                     |
|                                                    |
|        +---------------------------+               |
|        |                           |               |
|   <    |     [HIGH-RES IMAGE]      |    >          |
|        |     (2px ink border       |               |
|        |      + 6px spot-rose      |               |
|        |       offset shadow)      |               |
|        |                           |               |
|        +---------------------------+   [X]         |
|                                                    |
|        ST. MORITZ · 2025                3 / 6      |
|                                                    |
+----------------------------------------------------+
```

- Backdrop: `bg-paper-tint/85` + `backdrop-blur-sm` + halftone CSS pattern (paper-shade dots)
- Image container: max-width 90vw, max-height calculated to leave 4rem caption space below
- Image styling: 2px ink border, 6px spot-rose offset shadow, no transform
- Prev/Next buttons: 48×48 Riso ink-bordered squares with `<` / `>`, vertically centered at viewport edges
- Close X: top-right, 48×48 Riso stamp (paper bg, 2px ink border, X icon)
- Counter: bottom-right, mono small, `text-ink-muted`
- Caption: bottom-left, mono small, `text-ink-soft`

## 7. Animation timeline (FLIP)

**Open:**
1. Capture source rect from polaroid `<button>`'s `getBoundingClientRect()`
2. Render `<dialog>` with `showModal()`. Image starts positioned at source rect (using `position: fixed; top/left/width/height` derived from the rect).
3. Timeline: `gsap.to(image, { top, left, width, height: target, duration: 0.3, ease: ease.expo })`. In parallel: `backdrop.opacity 0 → 0.85`, `closeButton.opacity 0 → 1` after 0.15s offset.
4. Time total: 300ms.

**Close (X / ESC / backdrop):**
1. Capture current source rect (might be different polaroid if user navigated, so re-query the active polaroid's rect)
2. Reverse timeline: image → source rect, backdrop → 0
3. After 300ms, call `dialog.close()` and unmount.

**Prev/Next:**
1. Cross-fade between images (150ms each direction). NO FLIP for nav transitions — only for open/close. Keeps the perception "you stay in the lightbox, the image swaps".

**Reduced-motion:**
- Open: dialog appears with image at target rect, simple `opacity 0 → 1` fade (200ms).
- Close: simple fade out (200ms).
- Prev/Next: instant swap.

## 8. Touch / swipe

`pointerdown` captures `clientX`. On `pointerup`, if absolute `dx > 50` and `dy < 80`: navigate. If close to vertical (`dy > 80`), ignore (allows vertical scroll if the lightbox content is taller — though it shouldn't be).

Tap on image (no movement) does nothing (no conflict with backdrop click — backdrop click is detected as `e.target === backdrop`).

## 9. Accessibility

- `<dialog aria-labelledby={...} aria-describedby={...}>` with caption providing the description.
- `<dialog>` provides focus trap + ESC + restore-focus-to-trigger natively.
- Prev/Next buttons disabled at first/last image (no wrap-around) — or wrap-around (cycle); plan §11 question.
- Counter has `aria-live="polite"` so screen readers announce nav.
- `<img alt={alt}>` matches the polaroid's existing alt — no `aria-hidden`.
- `prefers-reduced-motion` honored (per §7).

## 10. Risks & mitigations

- **GSAP timeline interrupted mid-animation** (e.g., user clicks X while opening). Mitigation: `tl.kill()` on every state change, cleanly tween to current state.
- **ScrollTrigger pin interaction**: case-study has a horizontal-scroll pin. Opening the dialog while pinned must not break the pin. Mitigation: `<dialog>` with `showModal()` shows on top of everything; ScrollTrigger's pin spacer is not affected. Tested in Playwright.
- **Source rect changes between open and close**: if the user pans the diorama horizontally during the lightbox session, the polaroid's source rect at close time differs from open time. Solution: re-query the source rect immediately before closing.
- **Reduced-motion fallback** must not animate. Hard-coded branch in the timeline builder.
- **Visual baseline regression**: existing snapshot test runs at 1280×800 (fallback viewport, height ≤899px). Adding hover/cursor changes to polaroids in the fallback view is invisible (no diff). Adding the Lightbox component (unmounted state) to the DOM might change snapshot if its initial render leaves any DOM. Mitigation: render `null` when `activeIndex === null`. No DOM. Snapshot unchanged.

## 11. Open question to resolve before implementation

Wrap-around at gallery edges? E.g., from image 6, pressing → goes to image 1?

**Default:** YES, wrap around. Standard photo-gallery UX. Counter still reads "1 / 6" not "7 / 6".

If you want strict bounds (disabled buttons at edges), say so before plan time.

## 12. Done definition

- 6 images clickable, each opens lightbox at its own index.
- FLIP zoom animation works smoothly (no jank).
- ESC + backdrop + X all close.
- ←/→ navigate, swipe navigates on touch.
- prefers-reduced-motion honored.
- Counter accurate, aria-live announces nav.
- New Playwright test passes.
- `pnpm ci:local` passes.
- No regression on existing case-study tests or visual snapshot.
