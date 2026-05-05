# Work + Case Study + Nav + Ultrawide Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Work-Section (16:9 cards + Mini-Hero-Reveal on Portfolio-Card), replace CaseStudy with horizontal-scroll Foto-Workplace sequence, add small Nav animations, lift containers per-section for ultrawide consistency.

**Architecture:** Existing primitives (FluidOrchestrator splat-bus, OverprintReveal, FadeIn, container-page-wide) get reused or extended. Two new architectural pieces: (1) a shared GSAP ScrollTrigger pin for Case Study horizontal scroll, (2) one shared WebGL canvas for the Case Study mode-switch ink-flow (`PhotoInkMask` shader pattern adapted). Per-station ink-akzente are CSS+SVG+GSAP only.

**Tech Stack:** Existing — Next.js 16, React 19, TypeScript, Tailwind v4, GSAP + ScrollTrigger (already in deps), next-intl, sharp (asset pipeline). New deps: none.

**Spec reference:** [`docs/superpowers/specs/2026-05-04-work-casestudy-rework-design.md`](../specs/2026-05-04-work-casestudy-rework-design.md)

---

## File structure

### New files

```
src/components/work/
└── PortfolioCardReveal.tsx       # Mini-Hero-Reveal stage on Portfolio-Card

src/components/case-study/
├── StationContainer.tsx          # Sticky-pin + horizontal-scroll wrapper (GSAP ScrollTrigger)
├── PaperWorkplace.tsx            # Editorial detail-layer SVG (scribbles, blots, datum-stamps)
├── Polaroid.tsx                  # Polaroid frame primitive
├── StackNotebook.tsx             # Handwritten notebook page primitive (Station 3)
├── InkTransition.tsx             # 1 shared WebGL canvas for ink-flow at section enter/exit
├── stations/
│   ├── HookStation.tsx           # Station 1
│   ├── WhatStation.tsx           # Station 2
│   ├── StackStation.tsx          # Station 3
│   ├── HighlightStation.tsx      # Stations 4 + 5 (parameterised)
│   └── PublicStation.tsx         # Station 6
└── cliparts/
    ├── Lupe.tsx
    ├── PenScribble.tsx
    ├── TintenSpot.tsx
    └── CoffeeRing.tsx

src/lib/
├── scrollSpy.ts                  # IO-based active-section hook for Nav
└── pathTween.ts                  # Manual SVG `d`-attribute interpolator (avoids paid morphSVG plugin)

src/shaders/case-study-ink/
├── ink-flow.frag.glsl            # Advection of dye field
├── mask-composite.frag.glsl      # Paper alpha composite + halftone fringe
└── splat.frag.glsl               # Reused/copied from photo-ink-mask
```

### Modified files

- `src/components/sections/Work.tsx` — container-page-wide, swap PortfolioCardVisual for PortfolioCardReveal, 16:9 layout
- `src/components/ui/WorkCard.tsx` — aspect-[4/5] → aspect-[16/9], width/height props for `<img>`
- `src/components/sections/CaseStudy.tsx` — rewrite end-to-end
- `src/components/ui/Nav.tsx` — hover underline, click splat-burst, scroll-spy active state
- `src/app/globals.css` — `.nav-item` rules (hover underline + click-blob keyframes)
- `scripts/optimize-assets.mjs` — add joggediballa + portfolio batches
- `messages/{de,en,fr,it}.json` — case-study station keys, nav active aria
- `.claude/CLAUDE.md` — Phase 12 (work-casestudy-rework) deviation entry

### Deleted files

- `src/components/ui/PortfolioCardVisual.tsx` — replaced by real screenshot + PortfolioCardReveal

### Asset moves

- `public/portfolio/portfolio-screenshot-landscape.png` → `public/projects/portfolio/source/homepage-landscape.png`
- All `public/projects/joggediballa/*-lightmode-{landscape,phone}.png` → `public/projects/joggediballa/source/*.png` (move into `source/` subfolder)
- All `public/projects/joggediballa/*-darkmode-landscape.png` → `public/projects/joggediballa/source/_unused/` (kept around but not pipeline'd)
- Existing optimized 4:5 portrait assets in `public/projects/joggediballa/` (admin-dashboard-*, events-*, home-*, overlay-stream-*, shotcounter-*, statistic-*, team-*) — replaced by new 16:9 outputs from optimize-assets

---

## Phase A: Asset pipeline + Container strategy (foundation)

### Task 1: Move source files + extend optimize-assets

**Files:**
- Move: `public/portfolio/portfolio-screenshot-landscape.png` → `public/projects/portfolio/source/homepage-landscape.png`
- Move: `public/projects/joggediballa/*-lightmode-*.png` → `public/projects/joggediballa/source/`
- Move: `public/projects/joggediballa/*-darkmode-*.png` → `public/projects/joggediballa/source/_unused/`
- Modify: `scripts/optimize-assets.mjs`

- [ ] **Step 1.1: Make folder structure + move source files**

```bash
mkdir -p public/projects/portfolio/source
mkdir -p public/projects/joggediballa/source/_unused

# Portfolio source
mv public/portfolio/portfolio-screenshot-landscape.png public/projects/portfolio/source/homepage-landscape.png
rmdir public/portfolio 2>/dev/null || true

# Joggediballa light-mode source files
for f in admin-lightmode-landscape formular-lightmode-phone goennerverwaltung-lightmode-landscape homepage-lightmode-landscape homepage-lightmode-phone statistics-lightmode-landscape twitchoverlay-lightmode-landscape; do
  mv "public/projects/joggediballa/${f}.png" "public/projects/joggediballa/source/${f}.png"
done

# Joggediballa dark-mode (unused for now)
for f in goennerverwaltung-darkmode-landscape homepage-darkmode-landscape team-darkmode-landscape; do
  mv "public/projects/joggediballa/${f}.png" "public/projects/joggediballa/source/_unused/${f}.png"
done
```

- [ ] **Step 1.2: Add joggediballa + portfolio entries to TASKS in optimize-assets.mjs**

Open `scripts/optimize-assets.mjs`. Locate the `const TASKS = [` array. After the photography group, before the closing `];`, append:

```js
  // — Phase 12 · Work-Section Portfolio + Case Study Joggediballa screenshots —
  {
    group: "portfolio",
    source: "public/projects/portfolio/source/homepage-landscape.png",
    outDir: "public/projects/portfolio",
    outName: "homepage",
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 800,
    resize: { width: 2400, height: 1350, fit: "cover" },
    quality: { avif: 60, webp: 80, jpg: 82 },
  },
  // Joggediballa landscape screenshots — all 16:9
  ...["admin-lightmode-landscape", "goennerverwaltung-lightmode-landscape", "homepage-lightmode-landscape", "statistics-lightmode-landscape", "twitchoverlay-lightmode-landscape"].map((slug) => ({
    group: "joggediballa",
    source: `public/projects/joggediballa/source/${slug}.png`,
    outDir: "public/projects/joggediballa",
    outName: slug.replace("-lightmode-landscape", ""),
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 800,
    resize: { width: 2400, height: 1350, fit: "cover" },
    quality: { avif: 60, webp: 80, jpg: 82 },
  })),
  // Joggediballa phone screenshots — 9:16 portrait
  ...["formular-lightmode-phone", "homepage-lightmode-phone"].map((slug) => ({
    group: "joggediballa",
    source: `public/projects/joggediballa/source/${slug}.png`,
    outDir: "public/projects/joggediballa",
    outName: slug.replace("-lightmode-phone", "-phone"),
    widths: [360, 540, 720],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 540,
    resize: { width: 1440, height: 2560, fit: "cover" },
    quality: { avif: 55, webp: 78, jpg: 82 },
  })),
```

- [ ] **Step 1.3: Run optimize-assets**

Run: `node scripts/optimize-assets.mjs portfolio joggediballa`
Expected: success log lines for each entry, output files written to `public/projects/portfolio/` and `public/projects/joggediballa/`.

- [ ] **Step 1.4: Verify outputs**

Run: `ls public/projects/portfolio/ && ls public/projects/joggediballa/ | grep -E "homepage-|admin-|goennerverwaltung-|statistics-|twitchoverlay-|formular-phone|homepage-phone"`
Expected: 3 widths × 3 codecs (avif/webp/jpg) per outName for landscape; 3 widths × 3 codecs for phone.

- [ ] **Step 1.5: Delete old 4:5 portrait outputs**

```bash
# Drop old portrait variants of joggediballa (will be replaced by new 16:9 outputs above)
rm public/projects/joggediballa/{home,admin-dashboard,events,overlay-stream,shotcounter,statistic,team}-{480w,800w,1200w}.{avif,webp,jpg} 2>/dev/null
```

Run: `ls public/projects/joggediballa/ | grep -E "^(home|admin-dashboard|events|overlay-stream|shotcounter|statistic|team)-(480|800|1200)w"`
Expected: empty (all old portrait variants gone).

- [ ] **Step 1.6: Commit**

```bash
git add scripts/optimize-assets.mjs public/projects/
git commit -m "chore(assets): move source files + regenerate Work/CaseStudy screenshots in 16:9 (joggediballa, portfolio)"
```

---

### Task 2: Container-strategy — bump Work to wide

**Files:**
- Modify: `src/components/sections/Work.tsx`

- [ ] **Step 2.1: Swap container-page → container-page-wide on Work section**

In `src/components/sections/Work.tsx`, locate:

```tsx
<section
  id="work"
  aria-labelledby="work-heading"
  className="container-page relative py-20 md:py-28"
>
```

Change to:

```tsx
<section
  id="work"
  aria-labelledby="work-heading"
  className="container-page-wide relative py-20 md:py-28"
>
```

- [ ] **Step 2.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 2.3: Commit (defer until Task 4 lands so Work renders coherently — skip standalone commit)**

---

## Phase B: Work-Section refactor

### Task 3: WorkCard 16:9 aspect refactor

**Files:**
- Modify: `src/components/ui/WorkCard.tsx`

- [ ] **Step 3.1: Change aspect-ratio**

In `src/components/ui/WorkCard.tsx`, locate:

```tsx
className="relative aspect-[4/5] overflow-hidden border-2 border-ink bg-paper-shade will-change-transform"
```

Change to:

```tsx
className="relative aspect-[16/9] overflow-hidden border-2 border-ink bg-paper-shade will-change-transform"
```

- [ ] **Step 3.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 3.3: No commit yet — Task 4 + 5 land together**

---

### Task 4: PortfolioCardReveal component

**Files:**
- Create: `src/components/work/PortfolioCardReveal.tsx`

- [ ] **Step 4.1: Write the component**

Create `src/components/work/PortfolioCardReveal.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { OverprintReveal } from "@/components/motion/OverprintReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PortfolioCardReveal — the meta-stage on the Portfolio-Card.
 *
 * Rest state: the real screenshot of the portfolio homepage.
 * Trigger (first of):
 *   1. IntersectionObserver one-shot at threshold 0.45
 *   2. Pointer hover or keyboard Enter/Space
 *
 * The choreography fires ONCE per session (component lifetime).
 * Subsequent hovers after first fire are no-ops.
 *
 * Reduced-motion: choreography skipped, only static screenshot renders.
 */

const REVEAL_THRESHOLD = 0.45;
const HOLD_MS = 2500; // total visible time of the reveal before retract
const FADE_OUT_MS = 600;

type Props = {
  /** alt text for the static screenshot */
  alt: string;
  /** translation: surname (e.g. "Heller,") */
  surname: string;
  /** translation: given name (e.g. "Manuel.") */
  given: string;
  /** translation: SR-only announcement when reveal plays */
  ariaAnnouncement: string;
};

export function PortfolioCardReveal({ alt, surname, given, ariaAnnouncement }: Props) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    const screenshot = screenshotRef.current;
    const stage = stageRef.current;
    if (!container || !screenshot || !stage) return;

    gsap.set(stage, { opacity: 0 });
    gsap.set(screenshot, { opacity: 1 });

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;

      // Phase 1: dim screenshot, raise stage
      const tl = gsap.timeline();
      tl.to(screenshot, { opacity: 0.5, duration: 0.4, ease: "power2.out" }, 0);
      tl.to(stage, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
      // Phase 2: hold (the OverprintReveal sub-components self-animate via their own IO)
      // Phase 3 — retract: HOLD_MS after the timeline started, fade stage out + restore screenshot
      tl.to(stage, { opacity: 0, duration: FADE_OUT_MS / 1000, ease: "power2.in" }, HOLD_MS / 1000);
      tl.to(screenshot, { opacity: 1, duration: FADE_OUT_MS / 1000, ease: "power2.in" }, HOLD_MS / 1000);
    };

    // Trigger A: IntersectionObserver
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !firedRef.current) fire();
        }
      },
      { threshold: REVEAL_THRESHOLD },
    );
    io.observe(container);

    // Trigger B: pointer hover or Enter/Space
    const onHover = () => fire();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fire();
      }
    };
    container.addEventListener("pointerenter", onHover);
    container.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      container.removeEventListener("pointerenter", onHover);
      container.removeEventListener("keydown", onKey);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      tabIndex={reducedMotion ? -1 : 0}
      aria-label={ariaAnnouncement}
      className="relative h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2"
    >
      {/* Layer 1 — static screenshot */}
      <div ref={screenshotRef} className="absolute inset-0">
        <picture className="block h-full w-full">
          <source
            type="image/avif"
            srcSet="/projects/portfolio/homepage-480w.avif 480w, /projects/portfolio/homepage-800w.avif 800w, /projects/portfolio/homepage-1200w.avif 1200w"
            sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
          />
          <source
            type="image/webp"
            srcSet="/projects/portfolio/homepage-480w.webp 480w, /projects/portfolio/homepage-800w.webp 800w, /projects/portfolio/homepage-1200w.webp 1200w"
          />
          <img
            src="/projects/portfolio/homepage-800w.jpg"
            alt={alt}
            width={800}
            height={450}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover object-top"
          />
        </picture>
      </div>
      {/* Layer 2 — Mini-Hero-Reveal stage */}
      {!reducedMotion ? (
        <div
          ref={stageRef}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-paper/0"
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-baseline gap-2 px-4 text-[clamp(1.5rem,4vw,3rem)]">
            <span className="font-display italic text-ink leading-none">
              <OverprintReveal text={surname} className="inline-block" threshold={0.5} />
            </span>
            <FadeIn className="not-italic inline-block font-display text-ink" delay={0.12} ariaHidden>
              /
            </FadeIn>
            <span className="font-display italic text-ink leading-none">
              <OverprintReveal text={given} className="inline-block" threshold={0.5} delay={0.25} />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 4.3: No commit yet — Task 5 wires it in**

---

### Task 5: Wire Work-Section — swap PortfolioCardVisual for PortfolioCardReveal + add i18n keys

**Files:**
- Modify: `src/components/sections/Work.tsx`
- Delete: `src/components/ui/PortfolioCardVisual.tsx`
- Modify: `messages/{de,en,fr,it}.json`

- [ ] **Step 5.1: Add i18n keys for portfolio reveal**

In `messages/de.json`, locate the `"work"` namespace's `"projects"` array. Find the entry where `id === "portfolio"`. After the `screenshot` field (or before the closing `}`), add:

```json
      "screenshot": {
        "alt": "Screenshot der Portfolio-Homepage von Manuel Heller",
        "caption": "Diese Seite. MMXXVI."
      },
      "reveal": {
        "surname": "Heller,",
        "given": "Manuel.",
        "ariaAnnouncement": "Vorschau-Animation der Hero-Section"
      }
```

(Adjust the existing `screenshot` block if absent — the alt+caption fields are required.)

Mirror the same `reveal` block into `messages/en.json`, `messages/fr.json`, `messages/it.json` (DE-mirrored body content per established Phase 6/7/8/9 pattern).

- [ ] **Step 5.2: Update Work.tsx imports + Portfolio-Card wiring**

In `src/components/sections/Work.tsx`, replace:

```tsx
import { PortfolioCardVisual } from "@/components/ui/PortfolioCardVisual";
import { WorkCard } from "@/components/ui/WorkCard";
```

With:

```tsx
import { PortfolioCardReveal } from "@/components/work/PortfolioCardReveal";
import { WorkCard } from "@/components/ui/WorkCard";
```

In the same file, locate the Portfolio card render block (uses `find((p) => p.id === "portfolio")` already to get the `portfolio` object). Replace its `media`+`mediaAlt`+`mediaCaption` props with:

```tsx
media={
  portfolio.reveal ? (
    <PortfolioCardReveal
      alt={portfolio.screenshot?.alt ?? portfolio.title}
      surname={portfolio.reveal.surname}
      given={portfolio.reveal.given}
      ariaAnnouncement={portfolio.reveal.ariaAnnouncement}
    />
  ) : (
    /* Fallback for legacy translations missing the reveal block — render
     * the static screenshot so the card still works. */
    <picture className="block h-full w-full">
      <source
        type="image/avif"
        srcSet="/projects/portfolio/homepage-480w.avif 480w, /projects/portfolio/homepage-800w.avif 800w, /projects/portfolio/homepage-1200w.avif 1200w"
        sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
      />
      <source
        type="image/webp"
        srcSet="/projects/portfolio/homepage-480w.webp 480w, /projects/portfolio/homepage-800w.webp 800w, /projects/portfolio/homepage-1200w.webp 1200w"
      />
      <img
        src="/projects/portfolio/homepage-800w.jpg"
        alt={portfolio.screenshot?.alt ?? portfolio.title}
        width={800}
        height={450}
        loading="lazy"
        className="block h-full w-full object-cover object-top"
      />
    </picture>
  )
}
mediaAlt={portfolio.screenshot?.alt}
mediaCaption={portfolio.screenshot?.caption}
```

Type-guard via `portfolio.reveal ?` keeps the implementation safe — `WorkProject.reveal` was made optional in Step 5.3, so the guard catches any future content-edit that drops the block.

- [ ] **Step 5.3: Update WorkProject type to include `reveal` (optional)**

In `src/components/sections/Work.tsx`, extend the `WorkProject` type:

```tsx
type WorkProject = {
  id: string;
  title: string;
  subtitle?: string;
  year: string;
  role: string;
  stack: string[];
  description: string;
  metaNote?: string;
  ctaLabel: string;
  screenshot?: {
    alt: string;
    caption?: string;
  };
  reveal?: {
    surname: string;
    given: string;
    ariaAnnouncement: string;
  };
};
```

Use `portfolio.reveal!.surname` (non-null assert because the JSON schema guarantees it for the portfolio entry) or guard with `portfolio.reveal ? <PortfolioCardReveal ... /> : <FallbackImg />`. Pick the assert for cleanliness.

- [ ] **Step 5.4: Delete PortfolioCardVisual**

```bash
rm src/components/ui/PortfolioCardVisual.tsx
```

- [ ] **Step 5.5: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

Run: `pnpm build`
Expected: clean.

- [ ] **Step 5.6: Commit**

```bash
git add src/components/sections/Work.tsx src/components/ui/WorkCard.tsx src/components/work/PortfolioCardReveal.tsx messages/
git commit -m "feat(work): 16:9 cards, container-page-wide, PortfolioCardReveal mini-hero stage"
git rm src/components/ui/PortfolioCardVisual.tsx
git commit -m "chore(work): drop generative PortfolioCardVisual — replaced by real screenshot + reveal"
```

---

### Task 6: JdB-Card splat-bus on hover — verify existing Phase-7 pattern + update screenshot path

**Files:**
- Modify: `src/components/sections/Work.tsx` (only image paths in the JdB picture block)

- [ ] **Step 6.1: Update Joggediballa screenshot paths**

In `src/components/sections/Work.tsx`, locate the JdB card's `media` prop. The existing `<picture>` references `/projects/joggediballa/home-{480,800,1200}w.{avif,webp,jpg}`. Update to the new 16:9 outputs from Task 1:

```tsx
media={
  <picture className="block h-full w-full">
    <source
      type="image/avif"
      srcSet="/projects/joggediballa/homepage-480w.avif 480w, /projects/joggediballa/homepage-800w.avif 800w, /projects/joggediballa/homepage-1200w.avif 1200w"
      sizes="(min-width: 1024px) 40rem, (min-width: 640px) 60vw, 100vw"
    />
    <source
      type="image/webp"
      srcSet="/projects/joggediballa/homepage-480w.webp 480w, /projects/joggediballa/homepage-800w.webp 800w, /projects/joggediballa/homepage-1200w.webp 1200w"
    />
    <img
      src="/projects/joggediballa/homepage-800w.jpg"
      alt={joggediballa.screenshot?.alt ?? joggediballa.title}
      width={800}
      height={450}
      loading="lazy"
      decoding="async"
      className="block h-full w-full object-cover object-top"
    />
  </picture>
}
```

(Note `width={800} height={450}` — 16:9 aspect; the old 800×1000 portrait values are gone.)

- [ ] **Step 6.2: Verify hover-splat exists in WorkCard**

Read `src/components/ui/WorkCard.tsx` lines 130-180 (hover handlers). The existing Phase-7 implementation already dispatches `splatBus.dispatchSplat` on hover-enter with the card's `splatColor`. **No new code needed.** This step is verification only.

- [ ] **Step 6.3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 6.4: Commit**

```bash
git add src/components/sections/Work.tsx
git commit -m "feat(work): wire JdB-Card to new 16:9 screenshot outputs"
```

---

### Task 7: Manual visual review of Work-Section

**Files:** none (verification only)

- [ ] **Step 7.1: Run dev server**

Run: `pnpm dev` (or `./dev.cmd` on Windows).

- [ ] **Step 7.2: Visual checks at `http://localhost:3000/de`**

Verify in browser:
- Work-Section: 2 cards in 16:9 landscape, diagonal staircase
- Portfolio-Card: real screenshot of homepage, after ~0.5s scroll-into-view OR on hover the Mini-Hero-Reveal plays ("Heller, / Manuel." overprint), holds 2.5s, fades back to screenshot
- Subsequent hovers do NOT replay (once-per-session)
- JdB-Card: static screenshot, on hover amber ink-splats appear in the Hero area when scrolled to top
- Container is wider than other sections on ultrawide (~1760px max instead of ~1536px)

Stop dev server.

- [ ] **Step 7.3: Reduced-motion check**

DevTools → Rendering → Emulate CSS prefers-reduced-motion: `reduce`. Reload. Verify:
- Portfolio-Card shows only static screenshot, no reveal
- JdB-Card hover does NOT dispatch splats
- All else still readable

- [ ] **Step 7.4: No commit (verification only)**

---

## Phase C: Case Study primitives

### Task 8: Polaroid component

**Files:**
- Create: `src/components/case-study/Polaroid.tsx`

- [ ] **Step 8.1: Write the component**

Create `src/components/case-study/Polaroid.tsx`:

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { PlateCornerMarks } from "@/components/about/PlateCornerMarks";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Polaroid — editorial photo-frame primitive used by Case Study stations 1, 2, 4, 5, 6.
 *
 * Layers: paper-tint frame with 2px ink border, slight rotation (±3°), spot-color
 * offset shadow, optional caption strip below the photo, optional plate-corner-marks
 * (existing About primitive recycled).
 *
 * Under `prefers-reduced-motion: reduce`, rotation is forced to 0° per
 * spec §7 (vestibular-safety). The shadow and frame remain.
 */

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
};

const SPOT_VAR: Record<Props["spot"], string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
};

export function Polaroid({
  aspect,
  rotate = 0,
  spot,
  children,
  caption,
  datestamp,
  className,
}: Props) {
  const reducedMotion = useReducedMotion();
  const effectiveRotate = reducedMotion ? 0 : rotate;
  const cssVars = { "--polaroid-spot": SPOT_VAR[spot] } as CSSProperties;
  return (
    <figure
      className={`plate-corners relative inline-block bg-paper-tint p-3 md:p-4 ${className ?? ""}`}
      style={{ ...cssVars, transform: `rotate(${effectiveRotate}deg)`, boxShadow: `5px 5px 0 ${SPOT_VAR[spot]}` }}
    >
      <PlateCornerMarks />
      <div className="relative overflow-hidden border-[1.5px] border-ink" style={{ aspectRatio: aspect }}>
        {children}
      </div>
      {datestamp ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-2 font-mono text-[0.55rem] tracking-[0.16em] text-ink-muted"
        >
          {datestamp}
        </span>
      ) : null}
      {caption ? (
        <figcaption className="mt-2 font-mono text-[0.625rem] tracking-[0.18em] text-ink-muted uppercase md:text-[0.7rem]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
```

- [ ] **Step 8.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 8.3: Commit**

```bash
git add src/components/case-study/Polaroid.tsx
git commit -m "feat(case-study): Polaroid frame primitive"
```

---

### Task 9: StackNotebook component

**Files:**
- Create: `src/components/case-study/StackNotebook.tsx`

- [ ] **Step 9.1: Write the component**

Create `src/components/case-study/StackNotebook.tsx`:

```tsx
import type { ReactNode } from "react";

/**
 * StackNotebook — handwritten notebook page primitive for Station 3 (Tech Stack).
 *
 * Visual: paper-tint background with subtle ruled lines (SVG pattern), slight rotation,
 * page-curl corner (CSS clip-path), spot-color note-corner.
 */

type Props = {
  /** Heading (the notebook page title) */
  heading: string;
  /** List items rendered as bullet entries with mono-font. */
  items: ReactNode;
  /** Rotation in degrees */
  rotate?: number;
};

export function StackNotebook({ heading, items, rotate = -1.5 }: Props) {
  return (
    <article
      className="relative bg-paper-tint p-6 md:p-8"
      style={{
        transform: `rotate(${rotate}deg)`,
        boxShadow: "4px 4px 0 var(--color-ink), 2px 2px 0 var(--color-spot-amber)",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)",
      }}
    >
      {/* Ruled lines pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent 0, transparent 22px, var(--color-ink) 22px, var(--color-ink) 23px)",
        }}
      />
      {/* Page-curl corner accent */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 size-5"
        style={{ background: "var(--color-paper-shade)" }}
      />
      <h3 className="relative font-mono text-[0.75rem] uppercase tracking-[0.2em] text-ink">
        {heading}
      </h3>
      <div className="relative mt-4 font-mono text-sm leading-7 text-ink">
        {items}
      </div>
    </article>
  );
}
```

- [ ] **Step 9.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 9.3: Commit**

```bash
git add src/components/case-study/StackNotebook.tsx
git commit -m "feat(case-study): StackNotebook primitive for tech-stack station"
```

---

### Task 10: Four cliparts (Lupe, PenScribble, TintenSpot, CoffeeRing)

**Files:**
- Create: `src/components/case-study/cliparts/Lupe.tsx`
- Create: `src/components/case-study/cliparts/PenScribble.tsx`
- Create: `src/components/case-study/cliparts/TintenSpot.tsx`
- Create: `src/components/case-study/cliparts/CoffeeRing.tsx`

All four are inline SVG, < 3kb each, use `var(--color-ink)` and spot-colors via props.

- [ ] **Step 10.1: Lupe (magnifier)**

Create `src/components/case-study/cliparts/Lupe.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Lupe — magnifier clipart, gently bobs ±2px y in a 3s sine loop when in viewport.
 */
export function Lupe({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const tl = gsap.to(el, {
      y: -2,
      duration: 1.5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <svg
      ref={ref}
      width={56}
      height={56}
      viewBox="0 0 56 56"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: "rotate(-12deg)" }}
    >
      <title>Magnifier</title>
      <g fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinecap="round">
        <circle cx={22} cy={22} r={14} />
        <circle cx={22} cy={22} r={10} stroke="var(--color-spot-amber)" strokeWidth={1} />
        <path d="M 32 32 L 46 46" />
        <path d="M 30 34 L 36 28" strokeWidth={3} stroke="var(--color-ink)" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 10.2: PenScribble**

Create `src/components/case-study/cliparts/PenScribble.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PenScribble — circular scribble that "draws itself" once on viewport-entry.
 */
export function PenScribble({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            gsap.to(path, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" });
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(path);
    return () => {
      io.disconnect();
    };
  }, [reducedMotion]);

  return (
    <svg
      width={64}
      height={48}
      viewBox="0 0 64 48"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <title>Pen scribble</title>
      <path
        ref={pathRef}
        d="M 8 24 Q 20 8, 32 16 T 56 12 Q 48 28, 28 32 T 12 36"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 10.3: TintenSpot**

Create `src/components/case-study/cliparts/TintenSpot.tsx`:

```tsx
"use client";

/**
 * TintenSpot — inkblot, gentle opacity pulse 0.6→0.9→0.6 in 4s loop via CSS keyframes.
 */
export function TintenSpot({ className, spot = "rose" }: { className?: string; spot?: "rose" | "amber" | "mint" | "violet" }) {
  return (
    <svg
      width={48}
      height={48}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ animation: "ink-spot-pulse 4s ease-in-out infinite" }}
    >
      <title>Ink spot</title>
      <ellipse cx={24} cy={24} rx={18} ry={14} fill={`var(--color-spot-${spot})`} opacity="0.55" />
      <ellipse cx={28} cy={20} rx={6} ry={4} fill={`var(--color-spot-${spot})`} opacity="0.85" />
      <circle cx={36} cy={32} r={3} fill={`var(--color-spot-${spot})`} opacity="0.5" />
    </svg>
  );
}
```

(The `@keyframes ink-spot-pulse` is added to globals.css in Task 16.)

- [ ] **Step 10.4: CoffeeRing**

Create `src/components/case-study/cliparts/CoffeeRing.tsx`:

```tsx
/**
 * CoffeeRing — static elliptical ring stain, light brown. No animation.
 */
export function CoffeeRing({ className }: { className?: string }) {
  return (
    <svg
      width={80}
      height={56}
      viewBox="0 0 80 56"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: "rotate(8deg)" }}
    >
      <title>Coffee ring</title>
      <ellipse
        cx={40}
        cy={28}
        rx={32}
        ry={20}
        fill="none"
        stroke="#8b6f47"
        strokeWidth={2.5}
        opacity={0.32}
      />
      <ellipse
        cx={40}
        cy={28}
        rx={28}
        ry={17}
        fill="none"
        stroke="#8b6f47"
        strokeWidth={1}
        opacity={0.18}
      />
    </svg>
  );
}
```

- [ ] **Step 10.5: Verify all four**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 10.6: Commit**

```bash
git add src/components/case-study/cliparts/
git commit -m "feat(case-study): four cliparts (Lupe, PenScribble, TintenSpot, CoffeeRing)"
```

---

### Task 11: PaperWorkplace background SVG layer

**Files:**
- Create: `src/components/case-study/PaperWorkplace.tsx`

- [ ] **Step 11.1: Write the component**

Create `src/components/case-study/PaperWorkplace.tsx`:

```tsx
/**
 * PaperWorkplace — full-bleed editorial detail-layer behind the Case Study stations.
 *
 * Renders one large absolutely-positioned SVG with scribble-pen lines, datum-stamps,
 * inkblots, and scratch-marks. The stations + cliparts overlay this layer.
 *
 * The SVG scrolls horizontally with the stations as a single continuous "table".
 * Width is intentionally large (4× viewport ≈ 6000px) to span all 6 stations; the
 * parent StationContainer translates this layer with the rest of the horizontal track.
 */

const SCRIBBLE_PATHS = [
  // Hand-drawn-looking pen lines
  "M 50 200 Q 200 180, 400 220 T 800 200 Q 1000 240, 1200 200",
  "M 1500 600 Q 1700 580, 1900 620 T 2400 600",
  "M 3000 400 Q 3200 380, 3400 420 T 3800 400",
  "M 4500 700 Q 4700 680, 4900 720 T 5400 700",
];

const DATESTAMPS = [
  { x: 800, y: 100, text: "2024.06" },
  { x: 2400, y: 750, text: "2024.11" },
  { x: 3700, y: 200, text: "2025.03" },
  { x: 5200, y: 850, text: "2025.10" },
];

const INKBLOTS = [
  { cx: 1100, cy: 850, rx: 60, ry: 40, color: "rose" },
  { cx: 2700, cy: 200, rx: 80, ry: 50, color: "amber" },
  { cx: 4100, cy: 750, rx: 70, ry: 45, color: "mint" },
  { cx: 5400, cy: 350, rx: 75, ry: 48, color: "violet" },
];

const SCRATCHES = [
  { x1: 200, y1: 600, x2: 220, y2: 580 },
  { x1: 220, y1: 590, x2: 240, y2: 570 },
  { x1: 1900, y1: 300, x2: 1925, y2: 285 },
  { x1: 1920, y1: 295, x2: 1945, y2: 280 },
  { x1: 4400, y1: 500, x2: 4420, y2: 480 },
];

export function PaperWorkplace() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 6000 1000"
      preserveAspectRatio="none"
    >
      <title>Paper workplace texture</title>
      {SCRIBBLE_PATHS.map((d) => (
        <path
          key={d.slice(0, 16)}
          d={d}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.18}
        />
      ))}
      {DATESTAMPS.map((s) => (
        <text
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          fontFamily="monospace"
          fontSize={18}
          letterSpacing="0.2em"
          fill="var(--color-spot-amber)"
          opacity={0.4}
        >
          {s.text}
        </text>
      ))}
      {INKBLOTS.map((b) => (
        <ellipse
          key={`${b.cx}-${b.cy}`}
          cx={b.cx}
          cy={b.cy}
          rx={b.rx}
          ry={b.ry}
          fill={`var(--color-spot-${b.color})`}
          opacity={0.18}
          style={{ filter: "blur(8px)" }}
        />
      ))}
      {SCRATCHES.map((s) => (
        <line
          key={`${s.x1}-${s.y1}`}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="var(--color-ink)"
          strokeWidth={0.8}
          opacity={0.25}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 11.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 11.3: Commit**

```bash
git add src/components/case-study/PaperWorkplace.tsx
git commit -m "feat(case-study): PaperWorkplace background detail-layer SVG"
```

---

## Phase D: Case Study stations

### Task 12: i18n keys for Case Study stations

**Files:**
- Modify: `messages/{de,en,fr,it}.json`

The existing `caseStudy.*` namespace already has the bulk (hook, context, platform, highlights, publicLayer, reflection, footerLink). We add per-station extras (datestamps, scribble-text on the polaroids).

- [ ] **Step 12.1: Append station-specific keys to messages/de.json**

Locate the `caseStudy` namespace. After the existing `footerLink` entry (last entry), add:

```json
    "stations": {
      "hook": {
        "datestamp": "2022.05",
        "polaroidCaption": "Joggediballa · Mobile · Live"
      },
      "what": {
        "datestamp": "2022 →",
        "polaroidCaption": "Verein · gegründet 2022"
      },
      "stack": {
        "heading": "Stack-Notiz",
        "rule": "Was ich nehme, warum"
      },
      "highlightAdmin": {
        "datestamp": "Admin · v3",
        "polaroidCaption": "Admin-Dashboard · Daily Driver"
      },
      "highlightOverlay": {
        "datestamp": "Twitch-Overlay",
        "polaroidCaption": "Schlag-den-Kassier · Live-Stream"
      },
      "publicShots": [
        { "datestamp": "Stats", "caption": "Statistik · Mitglieder & Saisons" },
        { "datestamp": "Members", "caption": "Gönnerverwaltung · CRM-Light" },
        { "datestamp": "Form", "caption": "Anmeldeformular · Mobile" }
      ]
    }
```

- [ ] **Step 12.2: Mirror to en/fr/it**

Apply the same diff verbatim to `messages/en.json`, `messages/fr.json`, `messages/it.json` (DE-mirrored body content per Phase 6/7/8/9 pattern).

- [ ] **Step 12.3: Verify JSON parses**

Run: `pnpm exec biome format --write messages/`
Expected: 4 files, no errors.

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 12.4: Commit**

```bash
git add messages/
git commit -m "feat(i18n): add caseStudy.stations.* keys, DE-mirror across en/fr/it"
```

---

### Task 13: Five station components

**Files:**
- Create: `src/components/case-study/stations/HookStation.tsx`
- Create: `src/components/case-study/stations/WhatStation.tsx`
- Create: `src/components/case-study/stations/StackStation.tsx`
- Create: `src/components/case-study/stations/HighlightStation.tsx` (used twice — Admin + Overlay)
- Create: `src/components/case-study/stations/PublicStation.tsx`

Each station is a self-contained component. They all return content that fits inside a `Station` slot — but for now we don't wrap them in a `Station` wrapper component (the parent StationContainer handles layout). Each component takes its translation namespace via props (server-component-friendly).

- [ ] **Step 13.1: HookStation (Station 1)**

Create `src/components/case-study/stations/HookStation.tsx`:

```tsx
import { Polaroid } from "@/components/case-study/Polaroid";

type Props = {
  hookText: string;
  datestamp: string;
  polaroidCaption: string;
};

export function HookStation({ hookText, datestamp, polaroidCaption }: Props) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-8 px-12 md:flex-row md:items-center md:gap-16">
      <Polaroid
        aspect="9/16"
        rotate={-3}
        spot="rose"
        datestamp={datestamp}
        caption={polaroidCaption}
        className="w-[260px] shrink-0 md:w-[320px]"
      >
        <picture className="block h-full w-full">
          <source
            type="image/avif"
            srcSet="/projects/joggediballa/homepage-phone-360w.avif 360w, /projects/joggediballa/homepage-phone-540w.avif 540w, /projects/joggediballa/homepage-phone-720w.avif 720w"
          />
          <source
            type="image/webp"
            srcSet="/projects/joggediballa/homepage-phone-360w.webp 360w, /projects/joggediballa/homepage-phone-540w.webp 540w, /projects/joggediballa/homepage-phone-720w.webp 720w"
          />
          <img
            src="/projects/joggediballa/homepage-phone-540w.jpg"
            alt="Joggediballa Homepage Mobile"
            width={540}
            height={960}
            loading="lazy"
            className="block h-full w-full object-cover"
          />
        </picture>
      </Polaroid>
      <blockquote className="max-w-md font-display italic text-ink text-[clamp(1.5rem,3vw,2.5rem)] leading-[1.2] tracking-[-0.01em]">
        <span aria-hidden="true" className="mr-1 text-spot-amber">«</span>
        {hookText}
        <span aria-hidden="true" className="ml-1 text-spot-amber">»</span>
      </blockquote>
    </div>
  );
}
```

- [ ] **Step 13.2: WhatStation (Station 2)**

Create `src/components/case-study/stations/WhatStation.tsx`:

```tsx
type Fact = { key: string; value: string };

type Props = {
  label: string;
  facts: Fact[];
  storyParas: string[];
};

export function WhatStation({ label, facts, storyParas }: Props) {
  return (
    <div className="flex h-full max-w-3xl flex-col items-start justify-center gap-8 px-12">
      <h3 className="type-h3 text-ink">{label}</h3>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3">
        {facts.map((f) => (
          <div key={f.key} className="contents">
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
              {f.key}
            </dt>
            <dd className="type-body-sm text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-4">
        {storyParas.map((p) => (
          <p key={p.slice(0, 32)} className="type-body text-ink-soft">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 13.3: StackStation (Station 3)**

Create `src/components/case-study/stations/StackStation.tsx`:

```tsx
import { StackNotebook } from "@/components/case-study/StackNotebook";
import { PenScribble } from "@/components/case-study/cliparts/PenScribble";

type StackRow = { tech: string; use: string; why: string };

type Props = {
  heading: string;
  rule: string;
  intro: string;
  modules: string;
  stack: StackRow[];
};

export function StackStation({ heading, rule, intro, modules, stack }: Props) {
  return (
    <div className="relative flex h-full max-w-2xl flex-col justify-center gap-6 px-12">
      <p className="type-body text-ink-soft">{intro}</p>
      <StackNotebook
        heading={heading}
        items={
          <ul className="space-y-2">
            {stack.map((row) => (
              <li key={row.tech} className="flex items-baseline gap-3">
                <span className="font-medium text-ink">{row.tech}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-soft">{row.use}</span>
              </li>
            ))}
          </ul>
        }
      />
      <p className="type-body-sm text-ink-muted italic">{modules}</p>
      <PenScribble className="absolute -top-4 right-4 hidden md:block" />
      <span className="absolute right-12 bottom-4 hidden font-mono text-[0.65rem] tracking-[0.2em] text-ink-muted md:block">
        {rule}
      </span>
    </div>
  );
}
```

- [ ] **Step 13.4: HighlightStation (Stations 4 + 5, parameterised)**

Create `src/components/case-study/stations/HighlightStation.tsx`:

```tsx
import { Polaroid } from "@/components/case-study/Polaroid";

type Feature = { title: string; body: string };

type Props = {
  kicker: string;
  title: string;
  lede: string;
  features: Feature[];
  screenshotSlug: string;
  screenshotAlt: string;
  datestamp: string;
  polaroidCaption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate?: number;
};

export function HighlightStation({
  kicker,
  title,
  lede,
  features,
  screenshotSlug,
  screenshotAlt,
  datestamp,
  polaroidCaption,
  spot,
  rotate = 2,
}: Props) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-8 px-12 md:flex-row md:items-center md:gap-12">
      <Polaroid
        aspect="16/9"
        rotate={rotate}
        spot={spot}
        datestamp={datestamp}
        caption={polaroidCaption}
        className="w-full shrink-0 md:w-[460px]"
      >
        <picture className="block h-full w-full">
          <source
            type="image/avif"
            srcSet={`/projects/joggediballa/${screenshotSlug}-480w.avif 480w, /projects/joggediballa/${screenshotSlug}-800w.avif 800w, /projects/joggediballa/${screenshotSlug}-1200w.avif 1200w`}
          />
          <source
            type="image/webp"
            srcSet={`/projects/joggediballa/${screenshotSlug}-480w.webp 480w, /projects/joggediballa/${screenshotSlug}-800w.webp 800w, /projects/joggediballa/${screenshotSlug}-1200w.webp 1200w`}
          />
          <img
            src={`/projects/joggediballa/${screenshotSlug}-800w.jpg`}
            alt={screenshotAlt}
            width={800}
            height={450}
            loading="lazy"
            className="block h-full w-full object-cover object-top"
          />
        </picture>
      </Polaroid>
      <div className="max-w-md space-y-5">
        <p className="type-label inline-flex items-center gap-2 text-ink">
          <span aria-hidden="true" className="inline-block size-2" style={{ background: `var(--color-spot-${spot})` }} />
          {kicker}
        </p>
        <h3 className="font-display italic text-ink text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.015em]">
          {title}
        </h3>
        <p className="type-body text-ink-soft">{lede}</p>
        <ul className="space-y-4">
          {features.map((f) => (
            <li key={f.title} className="border-l-2 border-ink pl-3">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-ink">{f.title}</p>
              <p className="mt-1 type-body-sm text-ink-soft">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 13.5: PublicStation (Station 6)**

Create `src/components/case-study/stations/PublicStation.tsx`:

```tsx
import { Polaroid } from "@/components/case-study/Polaroid";

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  alt: string;
  datestamp: string;
  caption: string;
  spot: "rose" | "amber" | "mint" | "violet";
  rotate: number;
};

type Props = {
  publicShots: PublicShot[];
  reflectionLabel: string;
  reflectionBody: string;
  footerLabel: string;
  footerDomain: string;
  footerUrl: string;
  footerExternal: string;
};

export function PublicStation({
  publicShots,
  reflectionLabel,
  reflectionBody,
  footerLabel,
  footerDomain,
  footerUrl,
  footerExternal,
}: Props) {
  return (
    <div className="flex h-full max-w-5xl flex-col justify-center gap-12 px-12">
      <div className="flex flex-wrap items-center gap-8">
        {publicShots.map((s) => {
          const sizes =
            s.aspect === "9/16"
              ? "/projects/joggediballa/${slug}-phone"
              : "/projects/joggediballa/${slug}";
          const widths = s.aspect === "9/16" ? [360, 540, 720] : [480, 800, 1200];
          const fallbackW = s.aspect === "9/16" ? 540 : 800;
          const renderHeight = s.aspect === "9/16" ? 960 : 450;
          const renderWidth = s.aspect === "9/16" ? 540 : 800;
          return (
            <Polaroid
              key={s.slug}
              aspect={s.aspect}
              rotate={s.rotate}
              spot={s.spot}
              datestamp={s.datestamp}
              caption={s.caption}
              className={s.aspect === "9/16" ? "w-[180px]" : "w-[300px]"}
            >
              <picture className="block h-full w-full">
                <source
                  type="image/avif"
                  srcSet={widths.map((w) => `/projects/joggediballa/${s.slug}-${w}w.avif ${w}w`).join(", ")}
                />
                <source
                  type="image/webp"
                  srcSet={widths.map((w) => `/projects/joggediballa/${s.slug}-${w}w.webp ${w}w`).join(", ")}
                />
                <img
                  src={`/projects/joggediballa/${s.slug}-${fallbackW}w.jpg`}
                  alt={s.alt}
                  width={renderWidth}
                  height={renderHeight}
                  loading="lazy"
                  className="block h-full w-full object-cover object-top"
                />
              </picture>
            </Polaroid>
          );
        })}
      </div>
      <div className="border-l-2 border-spot-amber pl-6">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted">
          {reflectionLabel}
        </p>
        <p className="mt-3 font-display italic text-ink text-[clamp(1.25rem,2.4vw,1.875rem)] leading-[1.3]">
          {reflectionBody}
        </p>
      </div>
      <div className="flex items-baseline gap-4">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted">
          {footerLabel}
        </p>
        <a
          href={footerUrl}
          target="_blank"
          rel="noreferrer noopener external"
          className="group inline-flex items-baseline gap-3 border-b-2 border-ink font-display italic text-ink text-[clamp(1.25rem,2.5vw,1.75rem)] leading-none tracking-[-0.01em] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint"
        >
          {footerDomain}
          <span aria-hidden="true" className="font-mono text-base not-italic">↗</span>
          <span className="sr-only">{footerExternal}</span>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 13.6: Verify all stations**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 13.7: Commit**

```bash
git add src/components/case-study/stations/
git commit -m "feat(case-study): five station components (Hook, What, Stack, Highlight×2, Public)"
```

---

## Phase E: Case Study scroll mechanics

### Task 14: pathTween helper (manual SVG d-attribute interpolator)

**Files:**
- Create: `src/lib/pathTween.ts`

- [ ] **Step 14.1: Write the helper**

Create `src/lib/pathTween.ts`:

```ts
/**
 * Manual SVG `d`-attribute interpolator. Avoids the paid GSAP morphSVG plugin.
 *
 * Constraints: input paths must have the same point-count and the same
 * command sequence (M, L, Q, C). The interpolator parses each command's
 * coordinates, lerps pair-wise, and re-emits the path string.
 *
 * Use case: Case Study per-station ink-akzent. Each station has 4-5
 * keyframe paths (blob → rectangle), all hand-authored to match.
 */

type Cmd = { type: string; coords: number[] };

const CMD_RE = /([MLQCmlqc])\s*([-\d.,\s]*)/g;

function parsePath(d: string): Cmd[] {
  const cmds: Cmd[] = [];
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: classic regex-iter pattern
  while ((m = CMD_RE.exec(d)) !== null) {
    const type = m[1] ?? "";
    const coordsStr = (m[2] ?? "").trim();
    if (!coordsStr) {
      cmds.push({ type, coords: [] });
      continue;
    }
    const coords = coordsStr
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    cmds.push({ type, coords });
  }
  return cmds;
}

function emitPath(cmds: Cmd[]): string {
  return cmds
    .map((c) => {
      if (c.coords.length === 0) return c.type;
      // Format with up to 2 decimals, drop trailing zeros
      const coords = c.coords.map((n) => Number(n.toFixed(2)).toString()).join(" ");
      return `${c.type} ${coords}`;
    })
    .join(" ");
}

/**
 * Linear interpolate between two paths. `t` is 0..1.
 *
 * Throws if the paths are not point-compatible (different command sequence
 * or different coord count per command).
 */
export function lerpPath(a: string, b: string, t: number): string {
  const ca = parsePath(a);
  const cb = parsePath(b);
  if (ca.length !== cb.length) {
    throw new Error(`pathTween: command count mismatch (${ca.length} vs ${cb.length})`);
  }
  const out: Cmd[] = ca.map((cmdA, i) => {
    const cmdB = cb[i];
    if (!cmdB) throw new Error(`pathTween: missing command at index ${i}`);
    if (cmdA.type !== cmdB.type) {
      throw new Error(`pathTween: command type mismatch at ${i}: ${cmdA.type} vs ${cmdB.type}`);
    }
    if (cmdA.coords.length !== cmdB.coords.length) {
      throw new Error(`pathTween: coord count mismatch at command ${i}`);
    }
    const coords = cmdA.coords.map((va, j) => {
      const vb = cmdB.coords[j];
      return vb === undefined ? va : va + (vb - va) * t;
    });
    return { type: cmdA.type, coords };
  });
  return emitPath(out);
}
```

- [ ] **Step 14.2: Write a unit test**

Create `tests/unit/pathTween.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { lerpPath } from "@/lib/pathTween";

describe("lerpPath", () => {
  it("returns a at t=0", () => {
    const a = "M 0 0 L 100 100";
    const b = "M 50 50 L 200 200";
    expect(lerpPath(a, b, 0)).toMatch(/^M 0 0 L 100 100$/);
  });

  it("returns b at t=1", () => {
    const a = "M 0 0 L 100 100";
    const b = "M 50 50 L 200 200";
    expect(lerpPath(a, b, 1)).toMatch(/^M 50 50 L 200 200$/);
  });

  it("interpolates midpoint at t=0.5", () => {
    const a = "M 0 0 L 100 100";
    const b = "M 100 100 L 200 200";
    expect(lerpPath(a, b, 0.5)).toMatch(/^M 50 50 L 150 150$/);
  });

  it("throws on command-type mismatch", () => {
    expect(() => lerpPath("M 0 0", "L 0 0", 0.5)).toThrow(/command type mismatch/);
  });

  it("throws on command-count mismatch", () => {
    expect(() => lerpPath("M 0 0", "M 0 0 L 1 1", 0.5)).toThrow(/command count mismatch/);
  });
});
```

- [ ] **Step 14.3: Run the test**

Run: `pnpm vitest run tests/unit/pathTween.test.ts`
Expected: 5/5 passing.

If the project doesn't have vitest configured: skip the test file, the helper is small + verifiable by visual review.

- [ ] **Step 14.4: Commit**

```bash
git add src/lib/pathTween.ts tests/unit/pathTween.test.ts
git commit -m "feat(lib): pathTween — manual SVG d-attribute interpolator (avoids paid morphSVG)"
```

---

### Task 15: StationContainer (sticky pin + horizontal scroll)

**Files:**
- Create: `src/components/case-study/StationContainer.tsx`

- [ ] **Step 15.1: Write the component**

Create `src/components/case-study/StationContainer.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * StationContainer — wraps the 6 Case Study stations, pins the section
 * vertically, translates the inner track horizontally as the user scrolls.
 *
 * Mobile (<768px): pin disabled, stations stack vertically in normal flow.
 * Reduced-motion: same as mobile — vertical stack, no scroll-jack.
 */

type Props = {
  /** The 6 stations as children. Each is rendered as a flex item in the horizontal track. */
  children: ReactNode;
};

const MOBILE_BREAKPOINT = 768;

export function StationContainer({ children }: Props) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const trackWidth = track.scrollWidth;
    const viewportWidth = section.clientWidth;
    const distance = trackWidth - viewportWidth;
    if (distance <= 0) return; // nothing to scroll

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${distance}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: (self) => {
        gsap.set(track, { x: -distance * self.progress });
      },
    });

    return () => {
      trigger.kill();
      gsap.set(track, { x: 0 });
    };
  }, [reducedMotion, isMobile]);

  // Vertical (mobile/reduced-motion) layout: stations stacked vertically.
  if (isMobile || reducedMotion) {
    return (
      <section
        id="case-study"
        aria-labelledby="case-study-heading"
        className="relative py-20"
      >
        <div className="flex flex-col gap-20">{children}</div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="case-study"
      aria-labelledby="case-study-heading"
      className="relative h-screen overflow-hidden"
    >
      <div ref={trackRef} className="flex h-full" style={{ width: "max-content" }}>
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 15.2: Verify GSAP/ScrollTrigger import works**

Run: `pnpm typecheck && pnpm lint`
Expected: clean. (`gsap/ScrollTrigger` is already a path GSAP exposes — Phase 10 used it for InkWipeOverlay.)

- [ ] **Step 15.3: Commit**

```bash
git add src/components/case-study/StationContainer.tsx
git commit -m "feat(case-study): StationContainer — sticky-pin + horizontal scroll-jack via GSAP ScrollTrigger"
```

---

### Task 16: Per-station ink-akzente (CSS keyframes + SVG-mask path-tween)

**Files:**
- Modify: `src/app/globals.css` (add `@keyframes ink-spot-pulse`)
- Modify: `src/components/case-study/stations/HookStation.tsx` and the others — add an `<svg>` mask layer driven by `pathTween`

This task adds the per-station ink-akzent that fires when a station enters the viewport during horizontal scroll. We use a Station-level wrapper that handles the IO + path-tween, so each individual station component stays simple.

- [ ] **Step 16.1: Add `@keyframes ink-spot-pulse` to globals.css**

In `src/app/globals.css`, locate the closing `}` of `@layer components`. Before it, append:

```css
  /* Case Study — ink-spot pulse for the TintenSpot clipart. */
  @keyframes ink-spot-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.9; }
  }
```

- [ ] **Step 16.2: Create the StationFrame wrapper**

Create `src/components/case-study/StationFrame.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { lerpPath } from "@/lib/pathTween";

/**
 * StationFrame — per-station wrapper that fires an ink-akzent on viewport entry.
 *
 * Visual: a hidden SVG-mask path morphs from "spread ink-blob" → "rectangle = the
 * station's bounding box" via `lerpPath`. The masked station content fades to
 * full opacity as the path settles. Spot-color rotates per station.
 */

type Props = {
  spot: "rose" | "amber" | "mint" | "violet";
  children: ReactNode;
  /** Optional explicit width (px). Default: 100vw. */
  width?: number;
};

const BLOB_PATH =
  "M 100 250 Q 50 100, 250 80 Q 450 60, 470 200 Q 490 350, 350 380 Q 200 410, 100 250 Z";
const RECT_PATH =
  "M 0 0 Q 0 0, 250 0 Q 500 0, 500 0 Q 500 250, 500 500 Q 250 500, 0 500 Q 0 250, 0 0 Z";

export function StationFrame({ spot, children, width }: Props) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const uid = useId();
  const maskId = `station-mask-${uid}`;

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    const path = pathRef.current;
    if (!container || !path) return;

    let progress = 0;
    let frameRequested = false;

    const update = () => {
      frameRequested = false;
      path.setAttribute("d", lerpPath(BLOB_PATH, RECT_PATH, progress));
    };

    const tween = gsap.to(
      { p: 0 },
      {
        p: 1,
        duration: 1.4,
        ease: "power2.inOut",
        paused: true,
        onUpdate() {
          progress = this.targets()[0].p;
          if (!frameRequested) {
            frameRequested = true;
            window.requestAnimationFrame(update);
          }
        },
      },
    );

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            tween.play();
          } else {
            tween.reverse();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(container);

    return () => {
      io.disconnect();
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen flex-shrink-0"
      style={{ width: width ?? "100vw" }}
    >
      {!reducedMotion ? (
        <svg className="absolute size-0" aria-hidden="true">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="500" height="500" fill="black" />
              <path ref={pathRef} d={BLOB_PATH} fill="white" />
            </mask>
          </defs>
        </svg>
      ) : null}
      <div
        className="relative h-full w-full"
        style={!reducedMotion ? { mask: `url(#${maskId})`, WebkitMask: `url(#${maskId})` } : undefined}
      >
        {children}
      </div>
      {/* Persistent wet-ink detail beside the station */}
      {!reducedMotion ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-8 bottom-12 size-12 rounded-full opacity-40 blur-[8px]"
          style={{ backgroundColor: `var(--color-spot-${spot})` }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 16.3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 16.4: Commit**

```bash
git add src/app/globals.css src/components/case-study/StationFrame.tsx
git commit -m "feat(case-study): StationFrame — per-station ink-akzent via SVG-mask path-tween"
```

---

### Task 17: WebGL InkTransition (1 shared canvas for mode-switch)

**Files:**
- Create: `src/shaders/case-study-ink/ink-flow.frag.glsl`
- Create: `src/shaders/case-study-ink/mask-composite.frag.glsl`
- Create: `src/components/case-study/InkTransition.tsx`

The shaders are simplified copies of `PhotoInkMask`'s shaders (Phase 9). The TS component manages the WebGL2 context, FBOs, and ScrollTrigger lifecycle.

- [ ] **Step 17.1: Write the advection shader**

Create `src/shaders/case-study-ink/ink-flow.frag.glsl`:

```glsl
#version 300 es
// Ink-flow advection — simplified Photo-Ink-Mask (Phase 9) for
// the Case Study mode-switch ink-transition. Density advects along
// a fixed velocity field with right-to-left bias on enter, reversed
// on exit.

precision highp float;

uniform sampler2D uDensity;
uniform vec2 uResolution;
uniform float uDt;
uniform float uDirection; // -1.0 = enter (flow right-to-left), +1.0 = exit (flow left-to-right)
uniform float uDissipation;

in vec2 vUv;
out vec4 fragColor;

// Cheap pseudo-curl noise: produces a gently swirling velocity field.
vec2 swirl(vec2 uv, float phase) {
  float a = sin(uv.y * 6.28318 + phase) * 0.05;
  float b = cos(uv.x * 6.28318 + phase) * 0.05;
  return vec2(a, b);
}

void main() {
  vec2 swirlVel = swirl(vUv, uDt);
  vec2 baseVel = vec2(uDirection * 0.4, 0.0);
  vec2 vel = baseVel + swirlVel;
  vec2 prev = vUv - vel * uDt;
  vec4 dens = texture(uDensity, prev);
  fragColor = dens * uDissipation;
}
```

- [ ] **Step 17.2: Write the mask-composite shader**

Create `src/shaders/case-study-ink/mask-composite.frag.glsl`:

```glsl
#version 300 es
// Composes paper-color over the case-study scene with alpha derived
// from (1 - density). Gives the visual: when ink density is high,
// paper covers the scene; when density dissipates, the scene shows
// through. Halftone fringe at the boundary for Riso feel.

precision highp float;

uniform sampler2D uDensity;
uniform vec3 uPaperColor;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float d = texture(uDensity, vUv).a;
  // Halftone fringe: small dot pattern at the alpha-transition zone.
  float dotX = step(0.5, fract(vUv.x * 100.0));
  float dotY = step(0.5, fract(vUv.y * 100.0));
  float halftone = (dotX + dotY) * 0.5;
  float fringe = smoothstep(0.1, 0.5, d) * (1.0 - smoothstep(0.5, 0.9, d));
  float alpha = clamp(d + fringe * halftone * 0.3, 0.0, 1.0);
  fragColor = vec4(uPaperColor, alpha);
}
```

- [ ] **Step 17.3: Write the InkTransition component**

Create `src/components/case-study/InkTransition.tsx`:

```tsx
"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { compileShader } from "@/lib/gl/compileShader";
import { useReducedMotion } from "@/hooks/useReducedMotion";

import flowSrc from "@/shaders/case-study-ink/ink-flow.frag.glsl";
import maskSrc from "@/shaders/case-study-ink/mask-composite.frag.glsl";
import quadSrc from "@/shaders/common/quad.vert.glsl";

/**
 * InkTransition — 1 shared WebGL2 canvas overlaid on the Case Study
 * section. Plays an ink-flow choreography on section enter (right-to-
 * left flow → covers content) and the reverse on exit.
 */

type Props = {
  /** ScrollTrigger trigger element ref; we attach onEnter/onLeave hooks to it. */
  triggerRef: React.RefObject<HTMLElement | null>;
};

const PAPER_COLOR = [240 / 255, 232 / 255, 220 / 255]; // #f0e8dc

export function InkTransition({ triggerRef }: Props) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const trigger = triggerRef.current;
    const canvas = canvasRef.current;
    if (!trigger || !canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Compile the two passes
    const flowProg = compileShader(gl, quadSrc, flowSrc);
    const maskProg = compileShader(gl, quadSrc, maskSrc);
    if (!flowProg || !maskProg) return;

    // === FBO ping-pong + render loop ===
    // The FBO allocation, splat injection, and advection loop are
    // structurally identical to `src/components/scene/PhotoInkMask.tsx`.
    // Copy the following blocks from PhotoInkMask.tsx to here:
    //
    //   1. The FBO double-buffer setup (look for `createFBO()` calls
    //      and the `densityRead` / `densityWrite` swap dance —
    //      typically lines 80-140 of PhotoInkMask.tsx).
    //   2. The uniform-binding helper (`gl.getUniformLocation` + cache).
    //   3. The render-pass logic: bind `flowProg` → set uniforms
    //      (uResolution, uDt, uDirection, uDissipation, uDensity sampler) →
    //      draw fullscreen-quad → swap FBOs.
    //   4. The composite pass: bind `maskProg` → set uPaperColor uniform
    //      and uDensity sampler → draw to default framebuffer (canvas).
    //
    // Adaptations for THIS file:
    //  - shader sources are the two `ink-flow.frag.glsl` /
    //    `mask-composite.frag.glsl` defined above (NOT PhotoInkMask's
    //    advect / splat / mask shaders)
    //  - the advection shader takes a `uDirection` uniform that this
    //    component sets per the ScrollTrigger lifecycle (-1 on enter,
    //    +1 on exit)
    //  - PhotoInkMask injects splats from pointer events; the case-
    //    study version injects ONE big splat at section-enter (right
    //    edge of viewport, full vertical extent) and lets advection +
    //    dissipation drive the visual. Implement the splat as a one-
    //    shot in the `onEnter` handler (also one in `onEnterBack`):
    //    bind a splat shader (re-use PhotoInkMask's `splat.frag.glsl`
    //    or copy as `src/shaders/case-study-ink/splat.frag.glsl`),
    //    set uniforms (uTarget = right edge, uRadius = ~0.6, uColor =
    //    paper-color RGB), draw, swap FBOs.
    //  - DO NOT call `gl.getExtension("WEBGL_lose_context")?.loseContext()`
    //    on cleanup — preserve the Phase 9 lesson (StrictMode trap).
    //    Just delete programs/buffers/textures/VAOs and let GC handle
    //    the canvas-detach.
    //
    // The PhotoInkMask file is ~250 lines total; the relevant FBO + render
    // loop is ~150 lines. Estimated implementation time for this section:
    // 60-90 minutes including shader-debugging.

    let direction = -1;
    let active = false;
    const opacityRef = { current: 0 };

    const st = ScrollTrigger.create({
      trigger,
      start: "top center",
      end: "bottom center",
      onEnter: () => {
        direction = -1;
        active = true;
        opacityRef.current = 1;
      },
      onLeave: () => {
        direction = +1;
        active = true;
      },
      onEnterBack: () => {
        direction = -1;
        active = true;
        opacityRef.current = 1;
      },
      onLeaveBack: () => {
        direction = +1;
        active = true;
      },
    });

    // RAF loop — render only while active
    let raf = 0;
    let prevTs = performance.now();
    const tick = (ts: number) => {
      const dt = (ts - prevTs) / 1000;
      prevTs = ts;
      if (active) {
        // Run advection + composite passes (FBO ping-pong omitted for plan brevity)
        // Reference: src/components/scene/PhotoInkMask.tsx render loop
        canvas.style.opacity = String(opacityRef.current);
        if (direction === +1) {
          opacityRef.current = Math.max(0, opacityRef.current - dt / 1.2);
          if (opacityRef.current === 0) active = false;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      st.kill();
      gl.deleteProgram(flowProg);
      gl.deleteProgram(maskProg);
      // Don't loseContext() — Phase 9 lesson preserved (StrictMode double-invoke trap)
    };
  }, [reducedMotion, triggerRef]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
      style={{ opacity: 0 }}
    />
  );
}
```

(The full FBO ping-pong + uniform-binding code mirrors `PhotoInkMask.tsx`. The implementer should copy the relevant blocks — initFBOs, splat-pass binding, advection loop — and change only the shader paths + uDirection uniform.)

- [ ] **Step 17.4: Verify shader files load**

Run: `pnpm typecheck && pnpm lint`
Expected: clean. The Turbopack GLSL `as: "*.js"` rule from Phase 4 already handles `.glsl` imports.

- [ ] **Step 17.5: Commit**

```bash
git add src/shaders/case-study-ink/ src/components/case-study/InkTransition.tsx
git commit -m "feat(case-study): InkTransition WebGL canvas + ink-flow + mask-composite shaders"
```

---

### Task 18: Rewrite CaseStudy.tsx — compose station components into StationContainer

**Files:**
- Modify: `src/components/sections/CaseStudy.tsx`

- [ ] **Step 18.1: Rewrite the file**

Replace the entire contents of `src/components/sections/CaseStudy.tsx` with:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { CoffeeRing } from "@/components/case-study/cliparts/CoffeeRing";
import { Lupe } from "@/components/case-study/cliparts/Lupe";
import { TintenSpot } from "@/components/case-study/cliparts/TintenSpot";
import { InkTransition } from "@/components/case-study/InkTransition";
import { PaperWorkplace } from "@/components/case-study/PaperWorkplace";
import { StationContainer } from "@/components/case-study/StationContainer";
import { StationFrame } from "@/components/case-study/StationFrame";
import { HighlightStation } from "@/components/case-study/stations/HighlightStation";
import { HookStation } from "@/components/case-study/stations/HookStation";
import { PublicStation } from "@/components/case-study/stations/PublicStation";
import { StackStation } from "@/components/case-study/stations/StackStation";
import { WhatStation } from "@/components/case-study/stations/WhatStation";

type Fact = { key: string; value: string };
type StackRow = { tech: string; use: string; why: string };
type Feature = { title: string; body: string };
type Highlight = {
  id: string;
  kicker: string;
  title: string;
  lede: string;
  screenshot: string;
  screenshotAlt: string;
  features: Feature[];
};
type StationDateCaption = { datestamp: string; polaroidCaption?: string };
type PublicShotI18n = { datestamp: string; caption: string };

const PUBLIC_SHOT_CONFIG: { slug: string; aspect: "16/9" | "9/16"; spot: "mint" | "violet" | "rose" | "amber"; rotate: number }[] = [
  { slug: "statistics", aspect: "16/9", spot: "mint", rotate: -2 },
  { slug: "goennerverwaltung", aspect: "16/9", spot: "violet", rotate: 3 },
  { slug: "formular-phone", aspect: "9/16", spot: "rose", rotate: -1 },
];

export function CaseStudy() {
  const t = useTranslations("caseStudy");
  const triggerRef = useRef<HTMLDivElement>(null);

  const facts = t.raw("context.facts") as Fact[];
  const storyParas = t.raw("context.story") as string[];
  const stack = t.raw("platform.stack") as StackRow[];
  const highlights = t.raw("highlights.items") as Highlight[];
  const hookStation = t.raw("stations.hook") as StationDateCaption;
  const whatStation = t.raw("stations.what") as StationDateCaption;
  const stackStation = t.raw("stations.stack") as { heading: string; rule: string };
  const highlightAdmin = t.raw("stations.highlightAdmin") as StationDateCaption;
  const highlightOverlay = t.raw("stations.highlightOverlay") as StationDateCaption;
  const publicShotsI18n = t.raw("stations.publicShots") as PublicShotI18n[];

  // Highlight items by id (prevents fragile array-index lookup if order changes in JSON)
  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  return (
    <div ref={triggerRef} className="relative">
      <PaperWorkplace />
      {/* Decorative cliparts */}
      <Lupe className="absolute top-1/3 left-[42%] z-10" />
      <CoffeeRing className="absolute top-1/2 left-[33%] z-10" />
      <TintenSpot spot="rose" className="absolute right-[8%] bottom-1/4 z-10" />
      <h2 id="case-study-heading" className="sr-only">
        {t("headline")}
      </h2>
      <InkTransition triggerRef={triggerRef} />
      <StationContainer>
        <StationFrame spot="rose">
          <HookStation
            hookText={t("hook")}
            datestamp={hookStation.datestamp}
            polaroidCaption={hookStation.polaroidCaption ?? ""}
          />
        </StationFrame>
        <StationFrame spot="amber">
          <WhatStation
            label={t("context.label")}
            facts={facts}
            storyParas={storyParas}
          />
        </StationFrame>
        <StationFrame spot="mint">
          <StackStation
            heading={stackStation.heading}
            rule={stackStation.rule}
            intro={t("platform.intro")}
            modules={t("platform.modules")}
            stack={stack}
          />
        </StationFrame>
        {adminHighlight ? (
          <StationFrame spot="rose">
            <HighlightStation
              kicker={adminHighlight.kicker}
              title={adminHighlight.title}
              lede={adminHighlight.lede}
              features={adminHighlight.features}
              screenshotSlug="admin"
              screenshotAlt={adminHighlight.screenshotAlt}
              datestamp={highlightAdmin.datestamp}
              polaroidCaption={highlightAdmin.polaroidCaption ?? ""}
              spot="rose"
              rotate={2}
            />
          </StationFrame>
        ) : null}
        {overlayHighlight ? (
          <StationFrame spot="amber">
            <HighlightStation
              kicker={overlayHighlight.kicker}
              title={overlayHighlight.title}
              lede={overlayHighlight.lede}
              features={overlayHighlight.features}
              screenshotSlug="twitchoverlay"
              screenshotAlt={overlayHighlight.screenshotAlt}
              datestamp={highlightOverlay.datestamp}
              polaroidCaption={highlightOverlay.polaroidCaption ?? ""}
              spot="amber"
              rotate={-2}
            />
          </StationFrame>
        ) : null}
        <StationFrame spot="violet">
          <PublicStation
            publicShots={PUBLIC_SHOT_CONFIG.map((cfg, i) => ({
              ...cfg,
              alt: `${t("publicLayer.label")} ${i + 1}`,
              datestamp: publicShotsI18n[i]?.datestamp ?? "",
              caption: publicShotsI18n[i]?.caption ?? "",
            }))}
            reflectionLabel={t("reflection.label")}
            reflectionBody={t("reflection.body")}
            footerLabel={t("footerLink.label")}
            footerDomain={t("footerLink.domain")}
            footerUrl={t("footerLink.url")}
            footerExternal={t("footerLink.external")}
          />
        </StationFrame>
      </StationContainer>
    </div>
  );
}
```

- [ ] **Step 18.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

Run: `pnpm build`
Expected: clean. (Missing message keys would surface here.)

- [ ] **Step 18.3: Manual visual review**

Run: `pnpm dev`. Open `http://localhost:3000/de`, scroll to the Case Study.
Verify:
- Section pins, horizontal scroll-jacks 6 stations
- Each station has the ink-akzent on entry (mask-blob morphs to rectangle)
- PaperWorkplace details visible (scribbles, datum-stamps, blots)
- Cliparts (Lupe bobs, CoffeeRing static, TintenSpot pulses)
- Mobile (DevTools 375×800): vertical stack, no scroll-jack
- Reduced-motion: vertical stack, no animations

Stop dev server.

- [ ] **Step 18.4: Commit**

```bash
git add src/components/sections/CaseStudy.tsx
git commit -m "feat(case-study): rewrite as horizontal-scroll Foto-Workplace with 6 stations"
```

---

## Phase F: Nav animations

### Task 19: scroll-spy hook for active-section state

**Files:**
- Create: `src/lib/scrollSpy.ts`

- [ ] **Step 19.1: Write the hook**

Create `src/lib/scrollSpy.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * useScrollSpy — observes a list of element IDs and returns the one
 * currently most visible (highest IntersectionObserver intersectionRatio).
 *
 * Used by Nav to mark the active section.
 */
export function useScrollSpy(ids: string[], rootMargin = "-20% 0px -60% 0px"): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio);
        }
        // Pick id with highest ratio (must be > 0)
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActive(best);
      },
      { rootMargin, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const el of elements) io.observe(el);
    return () => io.disconnect();
  }, [ids, rootMargin]);

  return active;
}
```

- [ ] **Step 19.2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 19.3: Commit**

```bash
git add src/lib/scrollSpy.ts
git commit -m "feat(lib): scrollSpy hook for active-section state"
```

---

### Task 20: Nav hover underline + click splat-burst

**Files:**
- Modify: `src/components/ui/Nav.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 20.1: Add CSS rules**

In `src/app/globals.css`, inside the `@layer components` block (after the other component classes, before closing `}`), append:

```css
  /* Nav-item hover underline + click-burst */
  .nav-item {
    position: relative;
    padding-bottom: 4px;
  }

  .nav-item::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 1.5px;
    background: var(--color-ink);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 320ms cubic-bezier(0.7, 0, 0.2, 1);
  }

  .nav-item:hover::after,
  .nav-item:focus-visible::after {
    transform: scaleX(1);
  }

  .nav-item-active::after {
    transform: scaleX(1);
    background: var(--color-spot-rose);
  }

  /* Click-burst blob — appended on click, removed onAnimationEnd */
  .nav-burst {
    position: absolute;
    pointer-events: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    filter: blur(4px);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.6) rotate(var(--burst-rotate, 0deg));
    animation: nav-burst-anim 600ms ease-out forwards;
  }

  @keyframes nav-burst-anim {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6) rotate(var(--burst-rotate, 0deg));
    }
    50% {
      opacity: 0.7;
      transform: translate(-50%, -50%) scale(1.4) rotate(var(--burst-rotate, 0deg));
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.4) rotate(var(--burst-rotate, 0deg));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-burst { display: none; }
  }
```

- [ ] **Step 20.2: Update Nav.tsx**

Replace the contents of `src/components/ui/Nav.tsx` with:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { dispatchSplat, type SplatColorName } from "@/lib/fluidBus";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { useScrollSpy } from "@/lib/scrollSpy";

/**
 * Top navigation — hover underline + click splat-burst (Phase 12 rework).
 */

const NAV_ITEMS = [
  { href: "#about", key: "about", spot: "rose" as SplatColorName },
  { href: "#work", key: "work", spot: "amber" as SplatColorName },
  { href: "#playground", key: "playground", spot: "mint" as SplatColorName },
  { href: "#contact", key: "contact", spot: "violet" as SplatColorName },
] as const;

const SECTION_IDS = NAV_ITEMS.map((i) => i.href.slice(1));

export function Nav() {
  const t = useTranslations();
  const currentLocale = useLocale();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const activeSection = useScrollSpy(SECTION_IDS);

  const handleClick = (e: React.PointerEvent<HTMLAnchorElement>, spot: SplatColorName) => {
    if (reducedMotion) return;

    // Append blob to nav-item
    const anchor = e.currentTarget;
    const blob = document.createElement("span");
    blob.className = "nav-burst";
    blob.style.left = `${e.clientX - anchor.getBoundingClientRect().left}px`;
    blob.style.top = `${e.clientY - anchor.getBoundingClientRect().top}px`;
    blob.style.backgroundColor = `var(--color-spot-${spot})`;
    blob.style.setProperty("--burst-rotate", `${Math.floor(Math.random() * 60 - 30)}deg`);
    anchor.appendChild(blob);
    blob.addEventListener("animationend", () => blob.remove(), { once: true });

    // Dispatch splat to hero-sim
    dispatchSplat({ x: 0.5, y: 0.85, color: spot, dx: 0, dy: -0.05 });
  };

  return (
    <nav
      aria-label={t("nav.ariaLabel")}
      className="sticky top-0 z-50 border-paper-line border-b bg-paper/90 backdrop-blur-sm"
    >
      <div className="container-page flex items-center justify-between gap-6 py-4">
        <Link href="/" className="type-label-stamp" aria-label={t("brand.aria")}>
          {t("brand.label")}
        </Link>

        <div className="flex items-center gap-6 md:gap-10">
          <ul className="hidden items-center gap-5 md:flex md:gap-7">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.href.slice(1);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`nav-item type-label text-ink relative inline-block ${isActive ? "nav-item-active" : ""}`}
                    onPointerDown={(e) => handleClick(e, item.spot)}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {t(`nav.items.${item.key}`)}
                  </a>
                </li>
              );
            })}
          </ul>

          <ul aria-label={t("localeSwitcher.ariaLabel")} className="flex items-center gap-1.5">
            {routing.locales.map((locale) => {
              const isActive = locale === currentLocale;
              const name = t(`localeSwitcher.locales.${locale satisfies Locale}`);
              const label = isActive
                ? t("localeSwitcher.currentLabel", { name })
                : t("localeSwitcher.switchLabel", { name });

              return (
                <li key={locale}>
                  <Link
                    href={pathname}
                    locale={locale}
                    hrefLang={locale}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={label}
                    className={`type-label no-underline transition-colors ${
                      isActive ? "text-ink" : "text-ink-muted hover:text-ink-soft"
                    }`}
                  >
                    {locale.toUpperCase()}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 20.3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 20.4: Manual visual review**

Run: `pnpm dev`. Hover nav-items: thin underline draws in. Click an item: spot-colored blob appears, smooth-scroll happens, hero-sim shows colored ink-splat. Active section's underline persists in spot-rose. Reduced-motion: hover still shows underline (CSS transition is allowed) but click-burst is hidden.

Stop dev server.

- [ ] **Step 20.5: Commit**

```bash
git add src/app/globals.css src/components/ui/Nav.tsx
git commit -m "feat(nav): hover underline + click splat-burst with hero-sim dispatch"
```

---

## Phase G: Verification + docs

### Task 21: Full ci:local + a11y suite

**Files:** none (verification only)

- [ ] **Step 21.1: Run pnpm ci:local**

Run: `pnpm ci:local`
Expected: lint clean, typecheck clean, build clean, Playwright shows ≥49 passing + the 2 documented pre-existing failures (overprint reduced-motion, playground trailing-slash).

If new failures appear: investigate per axe rule, fix, re-run.

- [ ] **Step 21.2: A11y suite**

Run: `pnpm build && E2E_TARGET=prod pnpm test:a11y`
Expected: 16/16 passing.

- [ ] **Step 21.3: Iris-Xe sanity (manual, on Manuel's work laptop)**

This is for Manuel to perform on his Iris-Xe machine. Acceptance: continuous frametime < 25ms (≥ 40fps) during home + case-study scroll.

If frametime drops below the budget on case-study WebGL:
- Inspect `useGPUCapability().capability.tier`
- If `low` or `minimal`: drop the WebGL InkTransition, render only the per-station CSS+SVG ink-akzente
- Implement a `tier`-gated render in `<InkTransition>`: `if (tier === "low" || tier === "minimal") return null`

- [ ] **Step 21.4: No commit (verification only)**

---

### Task 22: CLAUDE.md — Phase 12 work-casestudy-rework deviations

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 22.1: Append Phase 12 section**

In `.claude/CLAUDE.md`, after the Phase 11 polish-rework section (last existing section), append:

```markdown

## Phase 12 deviations — Work + Case Study + Nav + Ultrawide rework

Driven by `docs/superpowers/specs/2026-05-04-work-casestudy-rework-design.md`.
Plan at `docs/superpowers/plans/2026-05-04-work-casestudy-rework.md`.

- **Work-Section cards in 16:9 landscape, not 4:5 portrait**. The
  diagonal-staircase layout stays. Containers bumped to
  `container-page-wide` (110rem) so the cards breathe on ultrawide.
- **Portfolio-Card uses real screenshot + Mini-Hero-Reveal stage**,
  not the previous generative SVG (`PortfolioCardVisual` deleted).
  The reveal fires once per session — first of (a) IntersectionObserver
  enter at `threshold: 0.45` or (b) pointer hover / Enter-Space. Plays
  the OverprintReveal "Heller, / Manuel." choreography over the
  dimmed screenshot. Reduced-motion: skipped, only static screenshot
  renders.
- **JdB-Card splat-bus on hover stays as the Phase 7 pattern** — no
  changes to the mechanic, just new 16:9 screenshot paths.
- **`scripts/optimize-assets.mjs` extended with two new groups**:
  `portfolio` (1 entry) and `joggediballa` (5 landscape + 2 phone
  source files). Source files moved into per-project `source/`
  subfolders for consistency. Old 4:5 portrait outputs deleted.
- **Case Study rebuilt as horizontal-scroll Foto-Workplace** (Hybrid C
  scroll-mechanic): vertical scroll → sticky-pin enters → ink-flow
  transition (1 shared WebGL canvas) → horizontal scroll-jack moves
  6 stations sideways → ink-flow reverse on exit → vertical scroll
  resumes. GSAP ScrollTrigger `pin: true, scrub: 0.6` is the spine.
- **6 stations linear** (B + 3 public shots): Hook-Polaroid → Was-ist-
  JdB → Stack-Werkzeugnotiz → Highlight Admin → Highlight Overlay →
  Public-Stapel + Reflection + Footer-Link. Photo-Workplace
  aesthetic = paper-editorial detail-layer (variant C from spec).
- **Per-station ink-akzente are CSS+SVG-mask+pathTween, NOT WebGL**.
  `<StationFrame>` wrapper holds a hidden SVG-mask path that morphs
  from "spread ink-blob" to "rectangle = the station's bounding box"
  using `lerpPath` (custom interpolator at `src/lib/pathTween.ts`,
  avoids the paid GSAP morphSVG plugin). Each station gets a small
  always-on "wet ink" detail beside it as well. Cost: 0 WebGL
  contexts per station — the whole layer is CSS+SVG only.
- **Mode-switch ink-flow is 1 shared WebGL canvas**, not 6 per-station
  canvases. `<InkTransition>` mounts one canvas, listens to the
  ScrollTrigger of the case-study section, plays an ink-flow
  choreography on enter (right-to-left direction) and reverse on
  exit. Lifecycle bound to ScrollTrigger's onEnter/onLeave/
  onEnterBack/onLeaveBack — context lives only while the section is
  in the viewport band. Combined with hero (1) + photography (5) +
  playground (2) the worst-case context count is 9 — safely under the
  ~16 browser soft-limit.
- **Mobile (<768px) and reduced-motion both fall back to vertical
  stack**. Same render path: `<StationContainer>` switches to a
  flex-col stack, no ScrollTrigger, no WebGL. All 6 stations remain;
  no content cutting (M1 from spec).
- **Path-tween implementation note**: `lerpPath` requires same
  command-sequence + same coord-count between source and target paths.
  Hand-author keyframes accordingly (4-5 frames per blob → rectangle
  morph). The 5 unit tests in `tests/unit/pathTween.test.ts` lock this
  contract. If a regression breaks compatibility, those tests fail
  loudly.
- **Nav hover underline (variant A from spec)** via pseudo-element
  `transform: scaleX(0) → scaleX(1)`, 320ms `cubic-bezier(0.7, 0, 0.2, 1)`
  (`ease.riso`). Active-section detection via `useScrollSpy` hook
  (IntersectionObserver-based, root-margin tuned to bias toward the
  most-visible section). Active item gets a persistent rose underline.
- **Nav click splat-burst** dispatches an inline blob (CSS keyframe,
  600ms scale+fade) AND a hero-sim splat via `dispatchSplat`.
  Section-color mapping: `about=rose`, `work=amber`, `playground=mint`,
  `contact=violet`. Both effects skipped under reduced-motion.
- **Ultrawide consistency, section-by-section** (variant B from spec):
  Hero stays 96rem (asymmetric-signature look depends on it); Work
  upgraded to 110rem; Case Study uses full-viewport-width during
  pinned state; Photography untouched (already mixed); Playground/
  Contact/Footer/Nav stay 96rem. NO global `--container-max` change
  to avoid shifting other validated layouts.
- **Translation deferred** for new `caseStudy.stations.*` keys and
  `work.projects.0.reveal.*` — DE source mirrored across EN/FR/IT,
  matches Phase 6/7/8/9/11 pattern. Nav `aria-current` translation
  stays per-locale (existing pattern).
- **Old `PortfolioCardVisual.tsx` deleted**. The generative SVG was
  always meant as a placeholder until the site itself shipped (Phase 7
  comment said so explicitly). The screenshot exists now → drop the
  placeholder.
- **Old `home-{480,800,1200}w.*` portrait outputs in
  `public/projects/joggediballa/` are deleted**, replaced by 16:9
  outputs from the new pipeline. Source PNGs live in
  `public/projects/joggediballa/source/`. The 3 `*-darkmode-*` source
  files are kept in `source/_unused/` for potential future use but
  are not run through optimize-assets.
```

- [ ] **Step 22.2: Verify lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 22.3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: CLAUDE.md — Phase 12 deviations (work + case-study + nav + ultrawide)"
```

---

### Task 23: Final review + push readiness

**Files:** none (verification only)

- [ ] **Step 23.1: Re-run pnpm ci:local one last time**

Run: `pnpm ci:local`
Expected: lint clean, typecheck clean, build clean, Playwright ≥49 passing + 2 pre-existing failures.

- [ ] **Step 23.2: Manuel visual final review**

1. Open `http://localhost:3000/de`
2. Scroll Work-Section: 2 cards in 16:9, Portfolio-Card plays Mini-Hero-Reveal once on enter, JdB-Card hover dispatches amber splats to hero-sim
3. Scroll into Case Study: section pins, ink-flow plays, 6 stations scroll sideways, per-station ink-akzent fires on entry, cliparts visible (Lupe bobs, CoffeeRing static, TintenSpot pulses), PaperWorkplace details visible
4. Scroll past end: ink-flow reverse, section releases, vertical scroll resumes to Photography
5. Hover any nav-item: underline draws in. Click: spot-colored burst + hero-sim splat
6. Locale-switch DE → EN → FR → IT: nav active state persists, no loader replays (Phase 11)
7. F5 hard-reload: loader plays (Phase 11)
8. Reduced-motion (DevTools toggle): all animations off, content readable, vertical case-study
9. Ultrawide (resize to 3440×1440): Work breathes at 110rem, hero stays 96rem, case-study fills viewport during pinned state

If any visual issue found that doesn't match the spec — open a follow-up task, do not amend this plan.

- [ ] **Step 23.3: Iris-Xe sanity (Manuel only)**

Run on Manuel's work laptop. Performance → record 5s scroll across home + case-study. Acceptance: frametime < 25ms (≥ 40fps). If degraded, fall back per Task 21.3.

- [ ] **Step 23.4: No commit (verification only)**

---

## Summary of commits

When the plan is complete, the git log should show this sequence:

```
chore(assets): move source files + regenerate Work/CaseStudy screenshots in 16:9 (joggediballa, portfolio)
feat(work): 16:9 cards, container-page-wide, PortfolioCardReveal mini-hero stage
chore(work): drop generative PortfolioCardVisual — replaced by real screenshot + reveal
feat(work): wire JdB-Card to new 16:9 screenshot outputs
feat(case-study): Polaroid frame primitive
feat(case-study): StackNotebook primitive for tech-stack station
feat(case-study): four cliparts (Lupe, PenScribble, TintenSpot, CoffeeRing)
feat(case-study): PaperWorkplace background detail-layer SVG
feat(i18n): add caseStudy.stations.* keys, DE-mirror across en/fr/it
feat(case-study): five station components (Hook, What, Stack, Highlight×2, Public)
feat(lib): pathTween — manual SVG d-attribute interpolator (avoids paid morphSVG)
feat(case-study): StationContainer — sticky-pin + horizontal scroll-jack via GSAP ScrollTrigger
feat(case-study): StationFrame — per-station ink-akzent via SVG-mask path-tween
feat(case-study): InkTransition WebGL canvas + ink-flow + mask-composite shaders
feat(case-study): rewrite as horizontal-scroll Foto-Workplace with 6 stations
feat(lib): scrollSpy hook for active-section state
feat(nav): hover underline + click splat-burst with hero-sim dispatch
docs: CLAUDE.md — Phase 12 deviations (work + case-study + nav + ultrawide)
```

~18 commits, ~14-20 hours of focused implementation work.
