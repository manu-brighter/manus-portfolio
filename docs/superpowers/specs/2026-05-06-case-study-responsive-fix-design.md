# Case Study Diorama — Cross-Resolution Responsive Fix

**Status:** Brainstormed and approved 2026-05-06. Ready for implementation plan.

**Goal:** Make the Case Study diorama render correctly across all common
desktop monitor classes (16:9, 16:10, 21:9, 32:9 from FHD up to 4K), not
only Manuel's home 3840×1600 reference. Currently content overflows card
boxes on shorter viewports (2560×1440, 1920×1200, 1920×1080) because the
diorama scales card boxes with `vh` but card-internal padding, gaps, and
font-clamps do not.

**Branch:** `fix/case-study-responsive` (off `main`).

**Spec date:** 2026-05-06

**Builds on:** `docs/superpowers/specs/2026-05-05-case-study-diorama-redesign.md`
(diorama architecture stands; only sizing tokens change).

---

## 1. Why this fix

The Case Study diorama was iterated heavily on Manuel's 3840×1600
home monitor. On smaller-but-common desktop viewports (work setup:
2560×1440 + 1920×1200), card content visibly overflows card
boundaries — text spills into adjacent card regions, polaroids
push the kicker/lede/features list off the bottom edge.

**Root cause** (verified by reading `DioramaCards.tsx` +
`HookCard.tsx` + `AdminHighlightCard.tsx` + `WhatCard.tsx` +
`OverlayHighlightCard.tsx` + `PublicCard.tsx` + `StackCard.tsx` +
`Polaroid.tsx`):

- Card **boxes** are sized in vh: e.g. Admin = `width:72vh, height:68vh`.
  These shrink linearly with viewport height. On 1600p viewport
  (1vh=16px) that's 1152×1088. On 1080p (1vh=10.8px) that's 778×734.
- Card **content** is NOT sized in vh:
  - Padding fixed: `p-4` (16px), gaps `gap-3`/`gap-2` (12/8px)
  - Font-clamps with hard mins: `clamp(0.7rem, 1vh, 0.95rem)`
    pins to 11.2px once viewport drops below 1120p height
  - `Polaroid` uses `p-3 md:p-4` (12-16px) and fixed-px caption/
    datestamp fonts (`text-[0.55rem]` etc.)
- Polaroid aspect-ratios are CSS-locked → polaroid height = card
  width × (9/16 or 16/9). Polaroid scales WITH vh; what's beneath
  it (kicker + h3 + lede + 4-feature ul) does NOT.

**Result:** On smaller viewports, the box shrinks but the content
inside refuses to shrink past its mins → content overflows. Cards
also lack `overflow-hidden`, so the spillage is visible across the
whole track and reads as "everything is broken."

A secondary issue is the **mobile-fallback breakpoint**: only
`max-width: 767px`. A 1366×768 laptop has w=1366 (>767) so it gets
the full diorama with 1vh=7.68px → unusable.

## 2. Scope

**In scope:**
- All sizing tokens inside Case Study cards (padding, gaps,
  font-clamps, image-block heights).
- The `DioramaTrack` mobile-fallback breakpoint.
- `Polaroid` primitive's case-study-relevant sizing (caption,
  datestamp, padding) — this primitive is also used in About's
  Portrait, so changes must be backward-compatible there.

**Out of scope:**
- Layout positions (`CARD_LAYOUT` left/top/width/height in vh) —
  these stay; they're correct.
- `DioramaIllustration` SVG (already vh-driven via viewBox).
- `DioramaLupe` (single GSAP tween, vh-clean).
- Hero, About, Skills, Photography, Playground, Work — untouched.
- The mobile fallback's vertical-stack layout itself (already
  works, just needs a wider breakpoint to catch low-res laptops).

## 3. Approach

**Option chosen: Surgical content-scales-with-vh fix + height-aware
mobile-fallback breakpoint.** The diorama's vh-based architecture
is correct; only its content tokens are out of sync. We:

1. Replace fixed-px paddings/gaps with `clamp(min, Xvh, max)` so
   they track viewport height like the boxes do.
2. Lower font-clamp mins so fonts truly continue scaling on
   smaller viewports — but keep them readable (≥10px floor for
   small mono labels, ≥11px for body, ≥14px for editorial heads).
3. Bump the mobile-fallback breakpoint to also trigger when
   viewport HEIGHT is too short for the diorama to be usable
   (≤899px), so 1366×768, 1280×720, 1600×900 laptop-class displays
   get the vertical-stack instead of a tiny diorama.
4. Add `overflow: hidden` to each card container as belt-and-
   suspenders — if any residual content barely overflows on an
   edge case, it gets clipped within its card boundary instead of
   spilling into siblings.

**Why this over alternatives:**

- *Custom `--u` unit (`min(1vh, Xvw)`)*: bigger refactor, every
  coordinate gets rewritten. The 4200:1000 (4.2:1) track is
  height-dominant in practice — width is rarely the constraint
  on common ratios (16:9 down to 16:10). Not worth the surface
  area.
- *Section min-height floor (`max(100vh, 720px)`)*: doesn't fix
  the content-overflow — cards still overflow inside themselves
  because content is fixed-px. Also breaks the 100vh-pin contract
  on actually-short viewports. Rejected.

## 4. Sizing token replacements

### 4.1 Cards (the 6 files in `src/components/case-study/cards/`)

**Container padding:**
- `p-4` → `p-[clamp(0.625rem,1.6vh,1rem)]`
  - 1600p: 25.6px → clamps to 16px (max). Identical to current.
  - 1200p: 19.2px → no clamp. Slightly tighter than current 16px.
  - 1080p: 17.3px → no clamp. Same.
  - Floor 10px on tiny viewports — but those go to fallback anyway.

**Card-internal column gaps:**
- `gap-4` → `gap-[clamp(0.625rem,1.5vh,1rem)]`
  - 1600p: 24px → clamps to 16px. Identical to current.
  - 1200p: 18px → no clamp. Slightly tighter than current 16px.
  - 1080p: 16.2px → no clamp. Same.
- `gap-3` → `gap-[clamp(0.5rem,1.2vh,0.75rem)]`
  - 1600p: 19.2px → clamps to 12px. Identical to current.
  - 1200p: 14.4px → no clamp. Slightly tighter.
  - 1080p: 13px → no clamp. Same as current.
- `gap-2` → `gap-[clamp(0.375rem,0.9vh,0.5rem)]`
  - 1600p: 14.4px → clamps to 8px. Identical.
  - 1200p: 10.8px → no clamp.
  - 1080p: 9.7px → no clamp.

**Sub-pixel decoration spacing stays fixed:**
- `space-y-1` (4px), `mt-0.5` (2px), `mt-1` (4px), `pl-2` (8px),
  `border-l`/`border-l-2` — keep absolute. These are too small
  for vh-scaling to be meaningful (a 4px → 5px shift is not a
  layout-relevant difference) and using vh-clamps here would
  add noise without benefit.

**Font-clamp mins lowered (mono small labels):**
- Current: `clamp(0.625rem, 0.9vh, 0.875rem)` — already 10px floor. ✓ keep.
- Current: `clamp(0.7rem, 1vh, 0.95rem)` (11.2px) → `clamp(0.625rem, 1vh, 0.95rem)` (10px floor).
- Current: `clamp(0.75rem, 1.05vh, 1rem)` (12px) → `clamp(0.6875rem, 1.05vh, 1rem)` (11px floor).
- Current: `clamp(0.8rem, 1.1vh, 1.05rem)` (12.8px) → `clamp(0.75rem, 1.1vh, 1.05rem)` (12px floor).
- Current: `clamp(0.95rem, 1.4vh, 1.4rem)` (15.2px) → `clamp(0.875rem, 1.4vh, 1.4rem)` (14px floor).
- Current: `clamp(1rem, 1.5vh, 1.4rem)` (16px) → `clamp(0.9375rem, 1.5vh, 1.4rem)` (15px floor).
- Current: `clamp(1.1rem, 1.5vh, 1.5rem)` (17.6px) → `clamp(1rem, 1.5vh, 1.5rem)` (16px floor).
- Current: `clamp(1.2rem, 1.75vh, 1.75rem)` (19.2px) → `clamp(1.0625rem, 1.75vh, 1.75rem)` (17px floor).
- Current: `clamp(1.25rem, 2.25vh, 1.875rem)` (20px) → `clamp(1.125rem, 2.25vh, 1.875rem)` (18px floor).

**`overflow-hidden` on every top-level card div** (the `<div className="flex h-full ...">` inside each card component) — belt-and-suspenders against residual spill.

### 4.2 `Polaroid.tsx`

Polaroid is shared with About-Portrait, so changes must not
regress that. The portrait wraps Polaroid with explicit pixel
sizing (parent constrains width); the case-study cards pass it
`w-full` of a vh-sized parent. We can scale Polaroid's internals
in vh because both code paths still resolve to the parent's
chosen width.

- Padding `p-3 md:p-4` → `p-[clamp(0.5rem,1.2vh,1rem)]`
  - At md+ on About-Portrait the explicit pixel parent gives
    ~600px width → 1vh on a 1080p viewport = 10.8px → padding
    13px. Acceptable; previously 16px. Visual diff on portrait
    is minor and fine.
- Caption `text-[0.625rem] md:text-[0.7rem]` → `text-[clamp(0.5625rem,0.75vh,0.7rem)]`
  - 9-11.2px range. Acceptable at all relevant viewports.
- Datestamp `text-[0.55rem]` → `text-[clamp(0.5rem,0.65vh,0.6rem)]`
  - 8-9.6px. Datestamp is decorative, was already <11px before.
- `boxShadow: 5px 5px 0 ...` (rotation-offset shadow) — keep as-is. Pixel-fixed shadow on a rotated card looks correct at any size; scaling it would give barely-visible 3px shadows on small viewports.
- `border-[1.5px]` — keep. Sub-pixel borders are a different problem; 1.5px is the current "Riso plate" signature thickness Manuel approved.

### 4.3 `DioramaTrack.tsx` — fallback breakpoint

Replace:
```ts
const MOBILE_BREAKPOINT = 768;
// ...
const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
```

With:
```ts
const MOBILE_MAX_WIDTH = 768;
const FALLBACK_MAX_HEIGHT = 900;  // covers 1366x768, 1600x900, 1280x720
// ...
const mq = window.matchMedia(
  `(max-width: ${MOBILE_MAX_WIDTH - 1}px), (max-height: ${FALLBACK_MAX_HEIGHT - 1}px)`
);
```

The comma in matchMedia is OR. State variable renamed `isMobile`
→ `useFallback` for honesty (it's not mobile-only anymore). All
downstream usages updated accordingly.

## 5. Validation matrix

Tested via `pnpm dev` + browser DevTools device emulation OR
real-window resize. Each row needs a visual confirmation before
the implementation is signed off.

| Resolution | Mode | Acceptance criteria |
|---|---|---|
| 3840×2160 (4K UHD) | Diorama | Cards roomy, max-clamps cap fonts, no regression vs 3840×1600. |
| 3840×1600 (Manu home) | Diorama | **Reference — must match current pre-fix appearance pixel-perfect.** |
| 3440×1440 (UWQHD ultrawide) | Diorama | Cards same content sizing as 2560×1440 (height equal). Less horizontal scroll. |
| 2560×1440 (QHD) | Diorama | **Primary target.** No content overflow. All 6 cards readable. |
| 1920×1200 (16:10) | Diorama | **Primary target.** No overflow, clean kicker→features visible on Admin/Overlay. |
| 1920×1080 (FHD) | Diorama | **Floor target.** Content readable, fonts not below 10px. |
| 1600×900 | Fallback | Vertical stack, no diorama mounted. |
| 1366×768 (laptop) | Fallback | Vertical stack. |
| 1280×720 (HD laptop) | Fallback | Vertical stack. |
| 390×844 (iPhone) | Fallback | Bestehende Mobile-Variante; should not regress. |

## 6. Risks & mitigations

- **About-Portrait Polaroid regression.** Polaroid is shared. The
  explicit-pixel-sized parent on About-Portrait means Polaroid's
  vh-based padding will produce smaller padding on shorter
  viewports than before. Mitigation: spot-check About-Portrait
  at 1920×1080 + 2560×1440 during validation; if visibly worse,
  bump the Polaroid clamp mins or branch with a `compact?: boolean`
  prop. Adding the prop is cheap and preserves backward-compat.
- **`prefers-reduced-motion` users on small desktop.** Reduced-
  motion already routes through the fallback path (good). No new
  surface area.
- **Lighthouse perf score.** No new continuous animations, no
  new Canvas, no extra JS. Should be neutral or slightly better
  (smaller fallback breakpoint means more devices skip the
  ScrollTrigger pin). Rerun `pnpm lighthouse` only if there's
  a visible runtime regression.
- **Existing Phase-12 deviation comment in CLAUDE.md** mentions
  vh-based coordinate system as a fix to ultrawide-vs-normal
  scaling. This change refines that fix; the deviation block
  needs a brief addendum noting that content tokens are now
  also vh-aware, and the fallback breakpoint is height-aware.

## 7. Rollback plan

The change is purely token-level and contained to
`src/components/case-study/**`. Reverting the branch reverts the
behaviour. No data, no migrations, no API surface.

## 8. Done definition

- All 6 cards + Polaroid use vh-aware padding/gaps/fonts per §4.
- DioramaTrack fallback triggers on width≤767 OR height≤899 per §4.3.
- All 10 rows of §5 validation matrix pass visual review.
- `pnpm ci:local` (lint + typecheck + build + test) passes.
- CLAUDE.md Phase 12 deviations updated with one-paragraph
  addendum referencing this spec.
- Commit message follows the project pattern (`fix:` conventional).
