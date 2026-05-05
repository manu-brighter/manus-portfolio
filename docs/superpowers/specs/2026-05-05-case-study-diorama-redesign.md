# Case Study Diorama Redesign — Design Spec

**Status:** Brainstormed and approved 2026-05-05. Ready for implementation plan.

**Goal:** Replace the failed slideshow-style flex-track Case Study with a horizontal-pan **Diorama**: a single wide comic-style illustration of a photographer's table that the user pans across via horizontal scroll-jack. Cards (project content) sit scattered + overlapping on the table; tools (camera, flash, ruler, pencil, coffee mug, magnifier) are drawn into the illustration; left + right viewport edges show **real fluid-sim ink columns** (dedicated WebGL canvas with continuous edge-splat injection).

**Branch:** `feat/work-casestudy-rework` (continues from current state — full deletion + rebuild of the case-study sub-tree).

**Spec date:** 2026-05-05

**Replaces:** `docs/superpowers/specs/2026-05-04-work-casestudy-rework-design.md` Section 3 (Case Study). Other sections of that spec (Work, Nav, Ultrawide) are already shipped and unaffected.

---

## 1. Why this redesign

5 implementation iterations in T18 (slideshow-style flex track with discrete `StationFrame` items) consistently failed visual review:
- Cards too far apart / too close, never matched the "scattered table" feel
- Decoration items (cliparts, ink-splats) sprinkled around but disconnected from a coherent story
- "Tinte" requirement was never delivered as actual fluid simulation — only fake CSS approximations
- Ultrawide aspect-ratio: tools and decorations rendered at fixed-px sizes appeared tiny on 3840×1600 displays

Manuel's vision (validated via mockup approval): a **single illustrated workspace** where cards float as paper notes and tools are drawn into the scene. This is a **diorama**, not a slideshow.

---

## 2. Architecture

### 2.1 Coordinate system

The diorama lives in a **vh-based coordinate space**: `4200×1000` viewBox, rendered at `height: 100vh` with width auto-scaled to `420vh`. Track total width is therefore consistent in viewport-height units across normal desktop (1920×1080 → 1080px tall × 4536px wide) and ultrawide (3840×1600 → 1600px tall × 6720px wide). Cards, tools, and decorations all scale together.

### 2.2 Layers (back to front)

```
Layer 1 (z-0): Hero-FluidSim canvas (existing, full-viewport persistent)
Layer 2 (z-10): DioramaTrack — wide horizontally-translated container
   ├── Layer 2a: DioramaIllustration (SVG background with table-edge outlines, tools, decorative splats)
   └── Layer 2b: DioramaCards (HTML divs absolute-positioned in vh units, overlapping)
Layer 3 (z-30): InkColumnFluidSim canvas (dedicated WebGL2, dark-ink fluid columns at viewport edges)
Layer 4 (z-50): UI chrome (nav stays at z-50 above everything)
```

### 2.3 Sticky-pin + horizontal-translate

Same mechanic as the previous attempt's `StationContainer`: GSAP `ScrollTrigger.create({ trigger: section, start: "top top", end: '+=${distance}', pin: true, scrub: 0.6, invalidateOnRefresh: true, onUpdate: translate-track-x })`. The track's `scrollWidth` is `420vh` in pixels; viewport width is `100vw` in pixels; distance = `420vh - 100vw` in pixels. ScrollTrigger handles the mechanics; the track translates leftward as user scrolls down.

### 2.4 Mobile + reduced-motion fallback

Below 768px viewport OR `prefers-reduced-motion: reduce`, the diorama unmounts and the section renders as a vertical stack of card content (same content, no illustration, no fluid-sim). Tools (camera, flash etc.) are dropped on mobile — they're decorative-only and the table illustration doesn't translate to a vertical layout.

---

## 3. DioramaIllustration content

A single SVG component (`<DioramaIllustration />`) rendering all of: table-edge outlines, embedded tools, ink-splat decorations. ViewBox `0 0 4200 1000`, preserveAspectRatio `xMidYMid meet`.

### 3.1 Table-edge outlines

Two hand-drawn pen-stroke comic outlines at top + bottom of the table — irregular wavy `path` elements with `stroke-width: 3, stroke: var(--color-ink), fill: none`. Slight variance per segment so it doesn't look mechanical. Top edge ~y=80, bottom edge ~y=920 in viewBox units.

### 3.2 Embedded tools (drawn into the illustration, not separate layers)

| Tool | Approx. position (viewBox) | Notes |
|------|----------------------------|-------|
| Camera (Sony α7-style top-down) | (240, 130), 190×108 body | The camera body silhouette enlarged ~30% from prior iteration. Lens centre filled spot-rose. Shutter button on top-right. |
| Hot-shoe flash | (540, 145) rotated 8° | Strobe-window head 90×55, body 46×70, hot-shoe foot 26×10. Power dial detail. NOT a Godox softbox. |
| Pencil | (1100, 110) rotated -20° | 180×14 yellow shaft + black tip + ferrule. |
| Ruler | (1900, 760) rotated 15° | 220×22 with 10 alternating-height tick marks. Replaces scissors (unclear). |
| Lupe (magnifier) | (2050, 380) rotated -12° | Outer ring r=55, inner glass r=44, handle 6px stroke. Positioned over Admin polaroid. Bobs ±2px y in 3s sine loop (existing `Lupe.tsx` GSAP behaviour preserved). |
| Coffee mug top-down | (3000, 130), saucer r=105 | Saucer + cup outer + dark-coffee surface + crema highlight ellipse + handle. NOT behind cards. |

All tools use the existing color tokens (`var(--color-ink)`, `var(--color-spot-*)`).

### 3.3 Ink splat decorations (Riso spot colors)

7 small static SVG shapes scattered across the table illustration:
- 4 main blots (~30-40px) in rose/amber/mint/violet at x=850, 1500, 2400, 3700
- 3 small detached droplets (3-4px) near the main blots

These are **decorative texture**, not animated. They reinforce the "ink dropped here, ink dropped there" feel of an active workspace.

### 3.4 First-card eye-catcher

The Hook station's phone-screenshot polaroid (Card 1, see Section 4) is enlarged from the v3 mockup size to **~240×380** in viewBox units (~24vh tall) to act as a stronger eye-catcher when the user enters the section.

---

## 4. DioramaCards layout

6 cards positioned absolutely within the track. Coordinates in vh units (so `top: 29vh; left: 42vh; width: 24vh; height: 38vh;` is consistent across viewports).

| # | Card | Component | Approx. pos (viewBox) | Width × Height | Rotation | Notes |
|---|------|-----------|------------------------|-----------------|----------|-------|
| 1 | Hook | `HookCard` | (420, 290) | 240 × 380 (eye-catcher size, +20% from v3) | -4° | Phone screenshot polaroid + pull-quote |
| 2 | What | `WhatCard` | (820, 480) | 380 × 220 | +2° | Text-only: facts dl + story prose |
| 3 | Stack | `StackCard` | (1280, 280) | 240 × 280 | -7° | Notebook-style with tech-stack list |
| 4 | Admin | `AdminHighlightCard` | (1620, 380) | 500 × 350 | +3° | 16:9 polaroid (admin-dashboard screenshot) + features list. **Lupe drawn over this one (in DioramaIllustration).** |
| 5 | Overlay | `OverlayHighlightCard` | (2300, 240) | 500 × 340 | -3° | 16:9 polaroid (twitchoverlay) + features list. Slightly overlapping Admin card (deliberate). |
| 6 | Public-Stapel | `PublicCard` | (3200, 460), (3430, 380), (3680, 440) | 280 / 280 / 180 each (rendered as 3 sub-polaroids in one card) | +4° / -2° / +3° | Stats / Members / Form-Phone polaroids — moved 120px left from v3 (closer to Overlay) |

Card content reuses i18n keys from existing `caseStudy.*` namespace + `caseStudy.stations.*` keys (already in messages JSON from T12).

---

## 5. InkColumnFluidSim (the wet-ink columns at viewport edges)

This is the headline visual that previous iterations failed to deliver. **Dedicated WebGL2 canvas** with its own fluid simulation, mounted only while the case-study section is in viewport (ScrollTrigger lifecycle).

### 5.1 Architecture

- **Canvas:** `<canvas>` at `position: fixed; inset: 0; z-index: 30; pointer-events: none`. Mounted on `ScrollTrigger.onEnter` (case-study top hits viewport bottom), unmounted on `onLeave` (case-study bottom hits viewport top). Same lifecycle as the failed Phase-9-style PhotoInkMask but section-scoped.
- **Fluid sim:** simplified version of `src/components/scene/PhotoInkMask.tsx` (Phase 9). Shaders: advect, splat, mask-composite. Reuses `src/lib/gl/compileShader.ts` helper. Reuses existing `src/shaders/ink-mask/{advect,splat,mask}.frag.glsl` (or copies + adapts as needed).
- **Color:** dark ink — RGB `[0.04, 0.02, 0.03]` (matches `--color-ink`).
- **Edge-splat injection:** continuous splat dispatch at left + right viewport edges. Every ~140ms, dispatch 2 splats:
  - Left edge: `x = 0.02`, `y = random in [0.1, 0.9]`, `dx = +0.06` (slight rightward velocity), `dy = small random jitter`, `radius = 0.22`, `strength = 0.55`
  - Right edge: `x = 0.98`, `y = random in [0.1, 0.9]`, `dx = -0.06`, `dy = small random jitter`, `radius = 0.22`, `strength = 0.55`
- **Density advects + dissipates** per orchestrator's `dyeDissipation` (~0.95). Continuous dispatch keeps columns "wet". Slow inward velocity gives the ink a subtle drifting/breathing feel without overwhelming the centre.
- **Frame rate:** runs on the project's shared RAF (`src/lib/raf.ts` `subscribe`) with priority 30 (after hero-sim but before non-fluid effects).

### 5.2 Why dedicated, not Hero-FluidSim

The Hero-FluidSim (Phase 9 deviation: runs everywhere persistent) renders Riso spot-colors. If we dispatched dark-ink splats to the hero-sim, they'd mix with the colored ambient → muddy purple-brown haze instead of clean dark columns. Plus the hero-sim's pointer-driven splats and ambient wandering points would interact unpredictably with edge-density. **A dedicated fluid sim for the case-study isolates the dark-ink behaviour completely.**

### 5.3 WebGL context budget

Worst case during case-study viewing:
- Hero-FluidSim: 1
- Photography PhotoInkMask: 5 (revealed photos)
- Playground card mini-sims: 2
- **Case-study InkColumnFluidSim: 1 (new)**
- Portfolio-card mini-hero-reveal: 0 (CSS-only, Phase 12 sprint 1)

Total: 9 contexts. Well within the ~16 browser soft-limit.

### 5.4 Reduced-motion + mobile

Skip the WebGL canvas entirely. Diorama renders without fluid columns; the section just shows the illustration + cards.

---

## 6. Component file structure

### New files

```
src/components/case-study/
├── DioramaTrack.tsx               # Sticky-pin + horizontal-translate wrapper (replaces StationContainer)
├── DioramaIllustration.tsx        # SVG with table-outlines + tools + decorative splats
├── DioramaCards.tsx               # Absolute-positioned card layer (6 cards composed)
├── InkColumnFluidSim.tsx          # Dedicated WebGL2 canvas for dark-ink columns
└── cards/
    ├── HookCard.tsx               # Card 1 content (was HookStation)
    ├── WhatCard.tsx               # Card 2 content (was WhatStation)
    ├── StackCard.tsx              # Card 3 content (was StackStation)
    ├── AdminHighlightCard.tsx     # Card 4 content (was HighlightStation w/ admin slug)
    ├── OverlayHighlightCard.tsx   # Card 5 content (was HighlightStation w/ overlay slug)
    └── PublicCard.tsx             # Card 6 content (was PublicStation)

src/shaders/case-study-ink/        # If shaders need to differ from existing ink-mask/
└── (only if needed — first try reusing src/shaders/ink-mask/*.glsl)
```

### Files to delete

```
src/components/case-study/
├── StationContainer.tsx           # Replaced by DioramaTrack
├── StationFrame.tsx               # Cards no longer use station-frame wrapper
├── TrackDecor.tsx                 # Decorations now in DioramaIllustration
├── InkSplat.tsx                   # Decorations now in DioramaIllustration
├── PaperWorkplace.tsx             # Already disabled, decorations now in DioramaIllustration
├── CaseStudyInkFlow.tsx           # Already deleted
├── InkSweep.tsx                   # Already deleted
├── InkColumns.tsx                 # Already deleted
├── InkTransition.tsx              # Replaced by InkColumnFluidSim
├── stations/                      # All 5 station components replaced by cards/* (content reused)
└── cliparts/                      # Drawings now in DioramaIllustration; component files dropped
```

### Files to modify

- `src/components/sections/CaseStudy.tsx` — full rewrite to compose DioramaTrack + DioramaIllustration + DioramaCards + InkColumnFluidSim
- Possibly: `src/lib/gl/compileShader.ts` — no changes expected, just consumed
- Possibly: `src/lib/raf.ts` — no changes expected, just consumed

### Files unchanged

- `messages/{de,en,fr,it}.json` — `caseStudy.*` and `caseStudy.stations.*` keys remain valid (cards consume same keys via destructure)
- `src/components/case-study/Polaroid.tsx` — primitive reused inside cards
- `src/components/case-study/StackNotebook.tsx` — primitive reused inside StackCard
- `src/lib/pathTween.ts` — unused now but kept (minimal cost, may help future ink-effects)

---

## 7. Tooling, dependencies, performance

- **No new npm dependencies.** GSAP + ScrollTrigger + sharp + Tailwind already in place.
- **Frame budget:** the InkColumnFluidSim adds 1 WebGL context running RAF-priority-30 with a 256² FBO. On Iris-Xe (Manuel's work laptop) this should comfortably stay under 2ms/frame. If it doesn't, fall back to a CSS-only "static dark columns" rendering at the same z-index.
- **Bundle:** no new GLSL files if reusing `ink-mask/*.glsl`; +200 bytes for new TS components.

---

## 8. Accessibility

- The diorama section keeps its `<section id="case-study" aria-labelledby="case-study-heading">` wrapper.
- The `<h2>` headline stays as `sr-only` (visual headline is the in-illustration cards).
- Each card is a `<figure>` or `<article>` with appropriate `aria-label` from i18n.
- Tools and decorative ink-splats in the SVG are `aria-hidden="true"` (purely decorative).
- Mobile/reduced-motion fallback renders all card content as a normal vertical stack with proper heading hierarchy.
- Focus order: cards in source order. Skip-link `#hero` already provides bypass per existing site nav.

---

## 9. i18n

All existing `caseStudy.*` and `caseStudy.stations.*` keys remain valid. No new keys added; cards consume the same data, just rendered in different layout. Translation-defer pattern (DE-mirrored across EN/FR/IT) continues from prior iterations.

---

## 10. Testing

- **Playwright e2e:** new test `tests/e2e/case-study-diorama.spec.ts` — verifies sticky-pin engages on enter, horizontal scroll reaches the end (track-x = -distance), section unpins on exit, mobile renders vertical stack.
- **Axe a11y:** no regression — same 16/16 passing target.
- **Manual visual review (Manuel):** hard-reload after implementation, verify against the v3 mockup at `.superpowers/brainstorm/289-1777980346/content/diorama-v3.html`.
- **Iris-Xe sanity:** Manuel runs locally, target frametime < 25ms during pinned scroll.

---

## 11. Open follow-ups (out of scope for this redesign)

- Real fluid simulation that produces card-spawning visuals (cards visually "emerging from ink") — that requires DOM-card alpha compositing through a shader mask, which is its own substantial WebGL project. Current spec uses dark-ink columns as visual context, not interactive card-spawning.
- Animated tool details (e.g. flash strobe-flash effect on enter) — drawn-static for v1.
- Per-station ink-akzent effects (the SVG-mask path-tween from prior attempts) — dropped; the Diorama doesn't need per-card decoration since the whole illustration provides cohesion.

---

## 12. Decision-record

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Diorama (single illustration) instead of slideshow (flex-track) | Slideshow approach failed 5 iterations to capture "scattered table" feel |
| 2 | vh-based coordinate system | Consistent across normal + ultrawide displays |
| 3 | Tools drawn into illustration (not random sprinkled cliparts) | Story coherence — visitor reads "this is a photographer's workspace" immediately |
| 4 | Dedicated WebGL fluid-sim for ink columns (NOT hero-sim) | Color isolation: dark ink columns vs hero-sim's Riso colors |
| 5 | Dark ink for columns | Contrast against paper, matches comic-outline aesthetic, semantically "echte Tinte" |
| 6 | Hot-shoe flash, not Godox softbox | Manuel feedback: simpler shape, clearer reading |
| 7 | Ruler instead of scissors | Manuel feedback: scissors didn't read clearly at small size |
| 8 | Coffee mug top-down + bigger | Manuel feedback: top-down perspective matches the rest of the table-view |
| 9 | Hook polaroid bigger as eye-catcher | Manuel feedback: first card sets the tone |
| 10 | Public-Stapel polaroids enlarged + moved closer to Overlay | Manuel feedback: screenshots unreadable at small size; gap too big |
| 11 | Mobile / reduced-motion: vertical stack, no diorama | Established pattern from prior iterations |
| 12 | Delete StationContainer / StationFrame / cliparts files | Diorama doesn't use those primitives; content moves to inline SVG |

---
