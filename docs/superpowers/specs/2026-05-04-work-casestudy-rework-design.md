# Work + Case Study + Nav + Ultrawide Rework — Design Spec

**Status:** Brainstormed and approved 2026-05-04. Ready for implementation plan.

**Goal:** Transform the Work-Section from a portrait-card layout into a 16:9 landscape-card editorial spread; rebuild the Joggediballa Case Study as a horizontal-scroll Foto-Entwicklungstisch sequence with ink-flow mode-switching; add small-but-fine Nav animations; lift container width per-section so ultrawide displays don't feel cramped.

**Branch:** `feat/work-casestudy-rework`

**Spec date:** 2026-05-04

---

## 1. Scope

Four cross-cutting topics in one rework, one PR:

1. **Work-Section** restructure (Hero-Card composition + landscape screenshots)
2. **Case Study** rebuild (horizontal scroll-jacked Foto-Entwicklungstisch)
3. **Nav-Bar** hover + click animation
4. **Ultrawide consistency** site-wide container strategy

Manuel's input was an opinionated brief; the brainstorm refined direction across 8 question-rounds. All decisions are recorded below.

---

## 2. Work-Section

### 2.1 Layout

Two cards in a 12-col diagonal staircase (current pattern preserved). Cards become **16:9 landscape** instead of 4:5 portrait. Description (title, year, role, stack, lede, CTA) stays **under** the screenshot — at staircase widths the side-by-side variants tested too small.

```
[Portfolio Card 16:9, col-span-7         ]
                                         .
                                         .
.            [Joggediballa Card 16:9, col-span-7 col-start-6 mt-32]
```

Container: `container-page-wide` (110rem) so ultrawide breathes.

### 2.2 Portfolio-Card — Mini-Hero-Reveal

The Portfolio-Card is meta: it represents *this site*. It does **not** get a fluid-sim mini-canvas (Playground cards already use that pattern; a third would feel repetitive).

**Mechanic:**
- Rest state: real screenshot of the portfolio homepage (`/projects/portfolio/source/homepage-landscape.png` → optimized to 480/800/1200w avif+webp+jpg).
- The Mini-Hero-Choreography fires **once per session**. Trigger source is the **first of**:
  - `IntersectionObserver` one-shot at `threshold: 0.45` (the card enters view while scrolling)
  - Pointer hover over the card (subsequent hovers after first fire are no-ops while choreography is in-flight; once choreography completes, hover does NOT re-trigger — the once-per-session rule holds)
- Choreography content:
  - The screenshot dims to ~50% opacity behind a Riso-paper overlay
  - `<OverprintReveal>` for "Heller," in a smaller font-size (clamp ~1.5rem 4vw 3rem)
  - `<FadeIn>` slash with delay 0.12s
  - `<OverprintReveal>` for "Manuel." with delay 0.25s
  - Plate-Corner-Marks fade in at the four corners
  - After ~2.5s: the choreography reverses — overprint chars fade out, screenshot opacity restores to 100%
- Reduced-motion: choreography skipped, only the static screenshot renders
- The card is keyboard-focusable; if the user is in keyboard-only flow and the IO didn't fire, pressing Enter or Space on the focused card triggers the choreography manually (still subject to once-per-session)

**Click target:** smooth-scroll to `#hero` (existing pattern). Splat-bus dispatch to fluid-sim with `rose` color on click.

### 2.3 JdB-Card — Static + Splat-Bus

JdB-Card stays a static screenshot (no animation on the card itself) but enriches the global Hero-Sim through the splat-bus (Phase-7 pattern).

**Mechanic:**
- Rest state: static screenshot (`/projects/joggediballa/source/homepage-lightmode-landscape.png` → optimized).
- On hover (or focus), the card dispatches `splatBus.dispatchSplat({ x, y, color: amber, dx: 0.05, dy: 0 })` at a low rate (every ~120ms while hovered) — these splats land in the Hero-Fluid-Sim. Visitor sees: hover the JdB-card → amber ink-splats appear in the Hero area above.
- On `pointerleave` the dispatch stops; existing ink dissipates naturally via the orchestrator's velocity-dissipation.
- Reduced-motion: dispatch suppressed entirely.

**Click target:** smooth-scroll to `#case-study`. Splat-bus dispatch with `amber` on click (already wired in Phase-7 `WorkCard.onClick`).

### 2.4 Screenshot specs (Work)

| Slot | Source path | Aspect | Source resolution | Browser viewport |
|------|------------|--------|-------------------|------------------|
| Portfolio-Card | `public/projects/portfolio/source/homepage-landscape.png` | 16:9 | 2400×1350 | 1600×900 viewport, top-of-page |
| JdB-Card | `public/projects/joggediballa/source/homepage-lightmode-landscape.png` | 16:9 | already delivered | n/a (Manuel's source) |

### 2.5 Files

- Modify: `src/components/sections/Work.tsx` (container-page-wide, layout cleanups)
- Modify: `src/components/ui/WorkCard.tsx` (16:9 aspect, drop portrait specifics)
- New: `src/components/work/PortfolioCardReveal.tsx` (Mini-Hero-Reveal client component)
- Replace: `public/projects/joggediballa/home-{480,800,1200}w.*` → regenerated 16:9 from `homepage-lightmode-landscape.png`
- New: `public/projects/portfolio/{homepage-{480,800,1200}w.{avif,webp,jpg}}` from new source
- Delete: `src/components/ui/PortfolioCardVisual.tsx` (generative SVG — replaced by real screenshot + reveal)

---

## 3. Case Study (Joggediballa)

### 3.1 Scroll-Mechanik (Hybrid C)

User scrolls vertically toward the Case Study. The transition is choreographed:

| Phase | What happens |
|-------|--------------|
| **Approach** | Section enters viewport. Standard vertical scroll. |
| **Lock** | When the Case Study heading hits ~50% of the viewport, vertical scroll **freezes** (sticky position) and the ink-transition starts. Lock takes ~600ms to fully engage. |
| **Ink-in** | The 1 shared WebGL ink-canvas plays an "ink flows from right" choreography (~1.2s). The 6 stations materialize from ink-blots (per-station SVG-mask animations, Section 3.4). |
| **Horizontal-scroll** | Section is sticky. `wheel` events translate horizontal-scroll position. User scrolls 6 stations sideways. |
| **Ink-out** | Upon hitting horizontal-scroll-end, the reverse plays: stations dissolve back to ink, ink flows leftward off-screen. ~1.2s. |
| **Release** | Sticky lock releases, vertical scroll resumes naturally on the section after Case Study (Photography). |

**Implementation details:**
- The sticky-lock-and-translate is GSAP `ScrollTrigger` (already in deps; `pin: true`, `scrub: true`).
- The wheel-to-horizontal mapping uses `ScrollTrigger`'s pin + horizontal-translate-of-inner-content pattern (well-documented GSAP showcase).
- Touch on tablet: native horizontal swipe within the pinned area; `wheel` for desktop trackpad/scroll.
- Mobile (`<768px`): see Section 3.6.

### 3.2 6 Stations

Linear left-to-right inside the pinned scroll-jacked container. Each station is a self-contained component with the Foto-Workplace aesthetic.

| # | Name | Content | Visual |
|---|------|---------|--------|
| 1 | **Hook-Polaroid** | Pull-quote (existing `caseStudy.hook` text) | 9:16 phone-screenshot polaroid (`homepage-lightmode-phone.png`) with quote text overlaid as a "scribble note" attached to the polaroid edge |
| 2 | **Was-ist-JdB** | Existing facts dl + first paragraph of story | Polaroid frame with logo, facts as "datum-stamps" stacked beside |
| 3 | **Stack-Werkzeugnotiz** | Tech-stack (existing 6-row table data) | Handwritten notebook page with the stack rendered as scribbled list, 1-2 ink-blots, paper-curl corner |
| 4 | **Highlight: Admin** | Existing admin highlight (kicker, title, lede, 3 features) | 16:9 polaroid (`admin-lightmode-landscape.png`) with 3 features as scribble-circled annotations on or beside the polaroid |
| 5 | **Highlight: Overlay-Stream** | Existing overlay highlight | Same shape as 4, with `twitchoverlay-lightmode-landscape.png` |
| 6 | **Public-Stapel + Reflection + Link** | 3 polaroids stacked + reflection pull-quote + footer external-link | Polaroid stack: 2 landscape (`statistics-lightmode-landscape`, `goennerverwaltung-lightmode-landscape`) + 1 portrait phone (`formular-lightmode-phone`). Reflection floats below as a pull-quote. Live-link as a stamped "address card" |

Existing `caseStudy.*` i18n keys are mostly reusable; new keys for station labels and any added scribble-text. DE source mirrored across EN/FR/IT (matches Phase 6/7/8/9/11 pattern).

### 3.3 Foto-Workplace Aesthetic (Variante C — Paper-Editorial)

The "table" is the existing paper-bg with **Detail-Layer** drawn on top:
- Subtle scribble-pen lines (SVG paths) snaking across the section
- Datum-stamps (mono-font dates like `2024.06`, `2024.11`) as faded ink-stamps in spot-amber 0.5 opacity
- 3-4 ink-blots in spot-rose / spot-mint / spot-violet, blurred, low-opacity (0.25)
- A coffee-ring (light-brown/amber stroke ellipse) somewhere between station 3 and 4 as if the cup sat there earlier
- Scratch-marks (short ink-lines, cross-hatch-style) at random positions

These render as **one absolute SVG layer** behind the stations (positioned full-bleed within the sticky container). They scroll horizontally with the stations as a whole — the table is one continuous surface.

### 3.4 Werkzeug-Cliparts (Variante C — Minimal-Curated)

5 dezent placed clipart elements as inline SVG (hand-drawn-style, scribble-feel, mono-line):

| # | Tool | Where | Function |
|---|------|-------|----------|
| 1 | **Lupe** (magnifier) | Hovering over Station 4's admin polaroid | Decorative; slight wobble animation when station is in viewport (idle bob ±2px y, 3s loop) |
| 2 | **Pen-scribble** | Edge of Station 3 (stack-notebook) | Decorative; "writes" one circle scribble when station enters viewport (SVG `pathLength` animation) |
| 3 | **Plate-corner-marks** (existing primitive) | Corner of each polaroid in stations 1, 4, 5, 6 | Existing component; 4× per polaroid |
| 4 | **Tinten-Spot** (ink-drop) | Beside Station 6's reflection block | Decorative; pulses opacity 0.6→0.9→0.6 in 4s loop |
| 5 | **Coffee-Ring** | Between Station 3 and Station 4 | Decorative; static |

All 5 are inline SVG, < 3kb each, reuse `--color-spot-*` and `--color-ink` for fill/stroke.

### 3.5 Ink-Transition (Variante B-economic)

Two layers of ink behavior:

**Layer 1 — Mode-Switch (1 shared WebGL canvas):**
- A single `WebGL2RenderingContext` for the case-study section, mounted only when ScrollTrigger fires the section's `onEnter`. Cleaned up on `onLeave` (or section unmount).
- Two shaders: `ink-flow.frag.glsl` (advection of dye field with velocity preset for "right-to-left flow at section enter, left-to-right at exit") + `mask-composite.frag.glsl` (paper-color RGB + alpha from `1 - density`, halftone fringe at boundary).
- Shaders adapted from existing `PhotoInkMask` pattern (Phase 9). No new architecture.
- Lifecycle:
  - `onEnter` (ScrollTrigger): instantiate context, run ink-in choreography for 1.2s
  - `onLeaveBack` (ScrollTrigger, scroll-up past): play ink-out choreography for 1.2s, then dispose context
  - `onLeave` (forward past end): play ink-out, dispose context
- Cost: 1 additional WebGL context, alive only during case-study viewport time. Stays within the 16-context browser soft-limit when combined with hero, photography (5), playground mini-sims (2), portfolio mini-hero (0 — uses CSS, see 2.2). Total: 1 + 5 + 2 + 1 (case study) = 9 contexts max, comfortable.

**Layer 2 — Per-station ink-akzente (CSS + SVG-mask + GSAP, no WebGL):**
- Each station has an associated SVG-mask "blob" and an entry/exit choreography:
  - On `IntersectionObserver` enter: SVG `<path>` `d`-attribute interpolates from "spread ink-blob" to "rectangle clip mask = the station rectangle". Implementation: 4-5 hand-authored keyframe paths with the same point-count, `gsap.to` driving a custom interpolator that lerps each `M`/`Q`/`C` control point pair-wise. (`gsap.morphSVG` is a Club-GreenSock paid plugin — we implement the path-tween manually to avoid the dependency.)
  - Per-station spot-color blob in the dominant station color (rose/amber/mint/violet rotating)
  - On exit (station leaves viewport horizontally), SVG-path interpolates back to ink-blob
- Each station also has a small persistent "wet ink" detail (a 0.4-opacity ink-spot beside it, gently breathing via CSS keyframes) — keeps the photo-workplace alive between transitions.

### 3.6 Mobile (M1)

Below `768px` viewport:
- Sticky scroll-lock + horizontal-scroll **disabled entirely**
- The 6 stations stack **vertically** as a normal long-form section
- Polaroids reduce rotation from ±3° to ±1° (less visual chaos in narrow column)
- Detail-Layer (scribbles, blots) rendered but density halved to avoid noise on small screens
- WebGL ink-transition skipped; per-station entry uses simple CSS opacity + slight Y-translate (240ms ease-out)
- All content present — no `M3` content-cutting

Detection: CSS media query `(min-width: 768px)` for the sticky-lock CSS, plus a runtime `window.matchMedia('(min-width: 768px)').matches` check inside `useEffect` gating the WebGL canvas mount and ScrollTrigger setup. (No new `useMediaQuery` hook needed — direct `matchMedia` plus a `change` listener for resize/orientation handling.)

### 3.7 Files

- Major rewrite: `src/components/sections/CaseStudy.tsx`
- New: `src/components/case-study/StationContainer.tsx` (sticky pin + horizontal-scroll wrapper)
- New: `src/components/case-study/Station.tsx` (per-station shell with IO + ink-akzent)
- New: `src/components/case-study/InkTransition.tsx` (the 1 shared WebGL canvas + shaders)
- New: `src/components/case-study/PaperWorkplace.tsx` (the editorial detail-layer SVG)
- New: `src/components/case-study/Polaroid.tsx` (polaroid frame primitive — used by stations 1, 2, 4, 5, 6)
- New: `src/components/case-study/StackNotebook.tsx` (handwritten notebook for station 3)
- New: `src/components/case-study/cliparts/{Lupe,PenScribble,TintenSpot,CoffeeRing}.tsx` (4 SVG cliparts; Plate-Corner-Marks reused from `src/components/about/`)
- New: `src/shaders/case-study-ink/ink-flow.frag.glsl`, `mask-composite.frag.glsl`
- Modify: `messages/{de,en,fr,it}.json` (add station labels, scribble-text keys; DE source, EN/FR/IT mirrored)

### 3.8 Screenshot pipeline

All Joggediballa source files in `public/projects/joggediballa/source/`. Run `optimize-assets.mjs` to generate 480w/800w/1200w avif+webp+jpg into `public/projects/joggediballa/`. Replace existing 4:5 portrait variants.

For Portfolio-Card source: move `public/portfolio/portfolio-screenshot-landscape.png` → `public/projects/portfolio/source/homepage-landscape.png`, run optimize-assets to generate `public/projects/portfolio/homepage-{480,800,1200}w.{avif,webp,jpg}`.

`scripts/optimize-assets.mjs` may need a config addition for the new `joggediballa` and `portfolio` slug-batches. Existing pattern from Phase 9 (panorama tweak).

---

## 4. Nav-Bar Animation

### 4.1 Hover (Variante A — Underline-Draw)

- Each nav-item is a `<a>` with `position: relative; padding-bottom: 4px`.
- Pseudo-element `::after`: thin underline (1.5px), `transform-origin: left`, `transform: scaleX(0)`, `transition: transform 320ms cubic-bezier(0.7, 0, 0.2, 1)` (`ease.riso`).
- On `:hover` and `:focus-visible`: `transform: scaleX(1)`.
- Active item (matching current section per scroll-spy or current route): persistent `scaleX(1)` with `background: var(--color-spot-rose)`.

Active-section detection uses a simple IntersectionObserver-based scroll-spy: section IDs `#about`, `#work`, `#playground`, `#contact` observed; the most-visible one (highest `intersectionRatio`) marks its nav-item active.

### 4.2 Click (Section-Spot-Colored Ink-Splat-Burst)

On `pointerdown` (not `click`, so it fires before the smooth-scroll starts):

1. **Inline visual**: A small absolute-positioned `<span>` blob is appended to the nav-item, sized 24×24px, rotated to a random angle, filled with the section spot-color, blurred 4px, scaled from 0.6 → 1.4 → 0 over 600ms with opacity 0 → 0.7 → 0. Removed from DOM via `onAnimationEnd`. Pure CSS keyframes.
2. **Splat-bus dispatch**: `splatBus.dispatchSplat({ x: 0.5, y: 0.85, color: SPOT_COLORS[sectionId], dx: 0, dy: -0.05 })`. The splat lands at the bottom-center of the hero-sim viewport (since hero is at viewport top), with an upward velocity.

Section-to-color mapping:

| Section | Spot |
|---------|------|
| `about` | rose |
| `work` | amber |
| `playground` | mint |
| `contact` | violet |

**Reduced-motion:** the inline visual is skipped (no animation). Splat-bus dispatch is also skipped (it would still trigger fluid motion in the hero, which conflicts with reduced-motion intent).

### 4.3 Files

- Modify: `src/components/ui/Nav.tsx` (active-section state, click handler, hover CSS, click visual)
- Modify: `src/app/globals.css` (`.nav-item` class with hover underline + click-blob keyframes)
- New: `src/lib/scrollSpy.ts` (IntersectionObserver-based active-section hook)

---

## 5. Ultrawide Container Strategy

Per-section container assignment:

| Section | Container | Rationale |
|---------|-----------|-----------|
| Hero | `container-page` (96rem) | Asymmetric right-aligned signature look — wider container shifts the hero too far from center |
| About header | `container-page` (96rem) | header is reading content, 65ch line-length holds |
| About blocks | `container-page-wide` (110rem) | already in place per Phase 11 polish-rework |
| About object-grid | `container-page-wide` (110rem) | already in place |
| About portrait | `container-page-wide` (110rem) | already in place |
| Skills | `container-page` (96rem) | type-list, line-length matters |
| **Work** | **`container-page-wide` (110rem)** | **change** — 16:9 cards profit from horizontal breathing room |
| **Case Study** | **full-viewport-width** | **change** — horizontal scroll-jacked, takes the whole viewport during pinned state |
| Photography slot 1, 3, 5 | full-bleed | already in place |
| Photography slot 2, 4 | `container-page` (96rem) | already in place, paired-text columns |
| Playground | `container-page` (96rem) | 2 cards + reading text, no benefit from extra width |
| Contact | `container-page` (96rem) | form + reading content |
| Legal pages | `container-page` (96rem) | reading content |
| 404 | `container-page` (96rem) | reading content |
| Footer / Nav | `container-page` (96rem) | 96rem matches the section it sits beneath in most cases |

**No global `--container-max` change.** All shifts are scoped to specific sections via the `.container-page-wide` utility (already exists in globals.css from Phase 11) or full-bleed positioning.

### 5.1 Files

- Modify: `src/components/sections/Work.tsx` (`container-page` → `container-page-wide`)
- Modify: `src/components/sections/CaseStudy.tsx` (full-viewport-width per pinned-section pattern)
- Verification: run a visual sweep on all sections at 3440×1440 viewport — no regressions

---

## 6. Performance Budget

- **WebGL contexts in worst case** (case-study mounted, photography revealed, playground hovered): hero (1) + photography (5) + playground (2) + case-study (1) = 9 contexts. Browser soft-limit ~16. Comfortable.
- **GSAP timelines**: ScrollTrigger 1 (case-study pin), per-station IO-fired tweens 6, hero choreography 1, work-card portfolio reveal 1, photography reveal 5, playground 2, nav click 1× per click. Total active concurrent timelines under 20 even peak — well within GSAP's design.
- **DOM weight on case-study**: 6 stations + 5 cliparts + paper-detail-layer SVG ≈ ~120 elements. Acceptable.
- **Iris-Xe target**: 40fps floor on home + case-study scroll. Manuel verifies on his work laptop after implementation. If the case-study WebGL canvas drops the budget, fall back to CSS-only ink-transition (variant A from brainstorm) on `low`/`minimal` GPU tiers via `useGPUCapability`.

---

## 7. Accessibility

- **Case Study horizontal-scroll**: respect `prefers-reduced-motion` — disable scroll-jack entirely; render stations vertically (same as mobile M1). User can read all content without forced-motion.
- **Polaroid rotations**: max ±3° desktop, ±1° mobile, **0°** under reduced-motion. Avoid vestibular-trigger.
- **Nav active-section indicator**: persistent rose underline already accessible (color + position). Visible focus ring from existing site CSS preserved on `:focus-visible`.
- **Splat-bus dispatch on nav click**: skipped entirely under reduced-motion (avoids fluid splash that fights the motion-reduction intent).
- **Mini-Hero-Reveal on Portfolio-Card**: skipped under reduced-motion. Static screenshot only.
- **Alt-text strategy**: every screenshot has a descriptive alt. Polaroid frames are decorative (`aria-hidden`); the actual image inside has the alt.
- **axe rules to watch**: `landmark-complementary-is-top-level` (no `<aside>` inside `<section>` — the case-study lessons from About apply), `image-alt`, `color-contrast` (Riso paper backgrounds + ink text checked at AA 4.5:1).

---

## 8. i18n

DE source + EN/FR/IT mirrored, matches Phase 6/7/8/9/11-sprint pattern. Shell strings (nav items, alt-text patterns) translated per-locale. New keys live in:
- `caseStudy.stations.<id>.{label, scribbleText, polaroidCaption}`
- `nav.activeStateAria` (for screen-reader announcement of active section)
- `work.cards.portfolio.{altState, revealAriaAnnouncement}` (for the mini-hero reveal SR text)

Translation-defer note: the new `caseStudy.stations.*` keys have substantial body content. Per Phase 6/7/8/9 pattern, DE content is mirrored across all locales until a dedicated translation pass.

---

## 9. Testing

- **Playwright e2e**:
  - Work: cards render at 16:9 ratio, click on Portfolio scrolls to hero, click on JdB scrolls to case-study, splat-bus dispatch fires on click (mock the bus)
  - Case Study: section enters viewport → sticky-mode engaged, horizontal-scroll moves stations, scroll past end releases lock and resumes vertical scroll, mobile-viewport (375×800) renders vertically with no scroll-jack
  - Nav: hover triggers underline (visual snapshot), click triggers spot-colored splat-bus dispatch (mocked), active section underline updates on scroll
- **A11y suite**: axe passes 16 tests (4 locales × 2 motion preferences × 2 routes); reduced-motion variant of Case Study fully readable

- **Manual visual review** (Manuel):
  - Work cards on ultrawide (3440×1440) — no longer cramped
  - Case Study horizontal scroll feel — ink-transition timing not aggressive
  - Nav-click ink burst feels right (subtle, not intrusive)
  - Mobile case-study readability

---

## 10. Open follow-ups (out of scope)

- The 5 placeholder About/Stamps SVGs (camera/audi/jdb/...) — Manuel will replace with custom icons in a separate pass (acknowledged in Phase 11 polish-rework).
- A proper translation pass for all DE-mirrored body content (Phase 6/7/8/9/11-sprint accumulated debt).
- Iris-Xe profiling pass once case-study WebGL is live; if frame-budget drops below 40fps, fall back to CSS-only variant per Section 6.

---

## 11. Implementation order (rough)

1. Asset pipeline first — move Portfolio screenshot, regenerate Joggediballa screenshots in 16:9
2. Work-Section card refactor (16:9, portfolio mini-hero-reveal, JdB splat-bus)
3. Container-strategy adjustments (Work → wide; verify others stay correct)
4. Case Study scaffolding — StationContainer (sticky + horizontal-scroll), 6 station components without ink yet
5. Foto-Workplace aesthetic layer (PaperWorkplace SVG, cliparts)
6. Ink-transition layers (Layer 2 first — CSS+SVG-mask per-station ink-akzente; Layer 1 — WebGL mode-switch)
7. Mobile fallback (vertical-stack, no scroll-jack)
8. Nav animations (hover underline, click splat-bus integration)
9. i18n keys + DE-mirror
10. ci:local + a11y + manual review + commit + PR

---

## Decision-record summary

| # | Topic | Decision | Variants considered |
|---|-------|----------|---------------------|
| 1 | Scope | One spec, one branch, one PR | A=mega, B=split-2, C=split-3 |
| 2 | Card aspect | 16:9 landscape | 4:3, 16:10 |
| 3 | Card composition | Screenshot top, description bottom | side-by-side, alternating |
| 4 | Portfolio-Card effect | Mini-Hero-Reveal-as-stage | mini-sim (rejected — repeats Playground), Riso-color-cycle, long-scroll-preview |
| 5 | JdB-Card effect | Splat-bus enrichment (Phase-7 pattern) | Riso-plate-drift, slideshow, magnifier |
| 6 | Case Study mechanic | Hybrid C — vertical → ink-transition gate → sticky horizontal scroll → ink-out → vertical resumed | scroll-jack only (A), click-to-enter overlay (B) |
| 7 | Case Study content | Compact 6 stations (B + 3 public shots) | full-1:1 (8 sections), restructured-as-storyboard |
| 8 | Workplace aesthetic | Paper-Editorial with Detail-Layer (C) | wood-table, cork-board |
| 9 | Werkzeug-cliparts | Minimal-Curated 5 elements (C) | Photo-pure (A), Code-Studio-hybrid (B) |
| 10 | Ink-transition | B-economic (per-station CSS+SVG+GSAP, 1 shared WebGL for mode-switch) | A=once-only, B-full=WebGL-per-station |
| 11 | Mobile case study | M1 — full vertical stack | M2 native swipe, M3 cut-content |
| 12 | Screenshots: Hook | `homepage-lightmode-phone.png` | full-page laptop |
| 13 | Screenshots: Public | 2 laptop + 1 phone | all-laptop |
| 14 | Light vs dark mode | Light only | mixed-mode |
| 15 | Nav hover | A — Underline-draw 320ms | B=misreg-ghost, C=stamp-press, D=ink-fill |
| 16 | Nav click | spot-colored ink-splat-burst + splat-bus dispatch | underline-explosion, fluid-wave |
| 17 | Ultrawide | B — Section-by-section bump | A=global, C=full-redesign |
