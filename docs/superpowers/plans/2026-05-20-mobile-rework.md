# Mobile Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Awwwards-grade WOW factor to Mobile — three distributed FluidSim spots (Hero, Case-Study, Photography), vertical scrolly replacement for the horizontal diorama, and compression of the longest sections (Photography 5→1, About 4→2 PullQuotes) — without changing Desktop.

**Architecture:** Mode-Split. Desktop keeps its global fixed-position FluidSim. Mobile gets three per-section scroll-attached Sim canvases (IO-paused when out of view), a horizontal Photography swiper, and a vertical CaseStudyMobileScrolly. Routing happens via `useCoarsePointer` + viewport-width check. Structural divergence (Photography swiper, Case-Study scrolly) gets its own `*Mobile.tsx` component lazy-loaded via `next/dynamic`; compression-only sections (About, Hero) use inline-branching.

**Tech Stack:** Next 16 App Router, React 19, R3F (`@react-three/fiber`), GSAP + ScrollTrigger, Tailwind v4, next-intl, Playwright (Mobile Chrome + visual project), Biome.

**Spec:** `docs/superpowers/specs/2026-05-20-mobile-rework-design.md`

---

## Prerequisite (NOT in this plan)

**SF-3 — FluidOrchestrator Factory Pattern** must merge before Phase 3 starts.
Phases 1 + 2 + 7 + 8 can begin without it. A separate plan for SF-3 should be
written if Manuel doesn't run `/full-project-rework --force-implement SF-3`.

---

## File Structure

### New files

| Path | Responsibility |
|------|----------------|
| `src/components/sections/PhotographyMobile.tsx` | Lazy-imported Mobile-only swiper |
| `src/components/case-study/CaseStudyMobileScrolly.tsx` | Lazy-imported Mobile-only vertical scrolly |
| `src/components/scene/HeroMobileSim.tsx` | Scroll-attached Sim canvas for Mobile Hero |
| `src/components/scene/CaseStudyMobileSim.tsx` | Sim canvas wired to scrolly station triggers |
| `src/components/scene/PhotoSwiperSim.tsx` | Sim canvas behind the Mobile Photography swiper |
| `src/hooks/useMobileLayout.ts` | Single source for Mobile-mode detection (coarse + width) |
| `tests/e2e/photography-swiper.spec.ts` | Swipe, pagination, prev/next, keyboard parity |
| `tests/e2e/case-study-scrolly-mobile.spec.ts` | Vertical scrolly + station Sim-trigger asserts |
| `tests/e2e/hero-sim-mobile.spec.ts` | Hero Sim canvas mount + IO-pause |
| `tests/unit/useMobileLayout.spec.ts` | Hook coverage |

### Modified files

| Path | Change |
|------|--------|
| `src/components/sections/Photography.tsx` | Branch to PhotographyMobile via lazy import |
| `src/components/sections/CaseStudy.tsx` | Branch to CaseStudyMobileScrolly via lazy import (replaces `mobileFallback`) |
| `src/components/sections/About.tsx` | Inline-branching: 2 of 4 PullQuotes, swipe-strip ObjectGrid |
| `src/components/sections/Hero.tsx` | Mount HeroMobileSim on coarse-pointer |
| `src/components/about/ObjectGrid.tsx` | New `variant="mobile-strip"` prop for horizontal swipe |
| `src/components/scene/FluidSim.tsx` | Coarse-pointer no longer disables pointer-splat; pointer-listeners switch to canvas-element scope |
| `src/components/scene/SceneProvider.tsx` | On coarse, suppress global FluidSim mount (Mobile uses per-section sims) |
| `src/lib/gpu.ts` | Extended tier mapping for Flagship / Mid-Mobile / Low-Mobile devices |
| `playwright.config.ts` | Add `mobile-chrome` to visual project; un-ignore `tests/visual/` for it |
| `tests/visual/baseline.spec.ts` | Add Mobile viewport snapshot suite |

---

## Phase 1 — Visual Regression Safety Net (Desktop-Lock-In)

**Why first:** Capture current Desktop baseline screenshots BEFORE any code change. Any unintended Desktop drift during Mobile work will fail the diff check. The existing `tests/visual/baseline.spec.ts` covers home + styleguide at 1280×800; that's enough — the full-page home shot covers all sections.

### Task 1.1: Refresh visual baseline from current main

**Files:**
- Modify: `tests/visual/baseline.spec.ts-snapshots/` (snapshot images)

- [ ] **Step 1: Ensure clean working tree**

```bash
git status
# Expected: clean (only the spec/plan files we already committed)
```

- [ ] **Step 2: Build production output (matches CI)**

```bash
pnpm build
```

Expected: `out/` directory created, no errors.

- [ ] **Step 3: Regenerate Desktop visual baselines**

```bash
E2E_TARGET=prod pnpm test:visual --update-snapshots
```

Expected: snapshots in `tests/visual/baseline.spec.ts-snapshots/` updated.

- [ ] **Step 4: Verify snapshots updated**

```bash
git status
# Expected: modified files inside tests/visual/baseline.spec.ts-snapshots/
```

- [ ] **Step 5: Run visual suite (no --update) to verify pass**

```bash
E2E_TARGET=prod pnpm test:visual
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add tests/visual/baseline.spec.ts-snapshots
git commit -m "chore / visual-baseline : Refresh Desktop snapshots before Mobile-Rework"
```

### Task 1.2: Add Mobile viewport baseline (locked AFTER rework, for now intentionally lax)

**Files:**
- Modify: `tests/visual/baseline.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Add Mobile viewport suite to baseline.spec.ts**

Append to the bottom of `tests/visual/baseline.spec.ts`:

```typescript
test.describe("@visual mobile baseline", () => {
  test.use({ ...devices["Pixel 5"] });

  test("home /de/ — mobile Pixel 5", async ({ page }) => {
    await page.goto("/de/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot("home-de-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixels: 500,
    });
  });
});
```

Add this import at the top:

```typescript
import { devices, expect, test } from "@playwright/test";
```

- [ ] **Step 2: Allow visual tests on mobile-chrome project**

In `playwright.config.ts`, change line ~56 from:

```typescript
testIgnore: /tests\/(i18n|visual)\//,
```

to:

```typescript
testIgnore: /tests\/i18n\//,
```

- [ ] **Step 3: Generate Mobile baseline**

```bash
E2E_TARGET=prod pnpm test:visual --update-snapshots --project=mobile-chrome
```

Expected: new snapshot `home-de-mobile-*.png` created.

- [ ] **Step 4: Commit the locked-PRE-rework Mobile baseline as "anti-pattern" reference**

```bash
git add tests/visual/baseline.spec.ts tests/visual/baseline.spec.ts-snapshots playwright.config.ts
git commit -m "chore / visual-baseline : Add Mobile viewport baseline (pre-rework reference)"
```

Note: this Mobile baseline will deliberately be replaced after the rework. Its value is asserting "Mobile DID change", not that it stays static.

---

## Phase 2 — Mobile-Mode Detection Foundation

### Task 2.1: Create `useMobileLayout` hook (single source of truth)

**Files:**
- Create: `src/hooks/useMobileLayout.ts`
- Test: `tests/unit/useMobileLayout.spec.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/useMobileLayout.spec.ts`:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("isMobileLayout (pure derivation)", () => {
  it("returns true for coarse pointer AND viewport < 768", async () => {
    const { isMobileLayout } = await import("@/hooks/useMobileLayout");
    expect(isMobileLayout({ coarse: true, width: 375 })).toBe(true);
  });

  it("returns false for coarse pointer on tablet (>=768)", async () => {
    const { isMobileLayout } = await import("@/hooks/useMobileLayout");
    expect(isMobileLayout({ coarse: true, width: 768 })).toBe(false);
  });

  it("returns false for fine pointer on small viewport (DevTools desktop emulation)", async () => {
    const { isMobileLayout } = await import("@/hooks/useMobileLayout");
    expect(isMobileLayout({ coarse: false, width: 375 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm test --run tests/unit/useMobileLayout.spec.ts
```

Expected: FAIL — `Cannot find module '@/hooks/useMobileLayout'`.

- [ ] **Step 3: Implement hook**

Create `src/hooks/useMobileLayout.ts`:

```typescript
"use client";

import { useSyncExternalStore } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";

const MOBILE_MAX_WIDTH = 768;

export function isMobileLayout({ coarse, width }: { coarse: boolean; width: number }): boolean {
  return coarse && width < MOBILE_MAX_WIDTH;
}

function subscribeWidth(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getWidthSnapshot(): number {
  return typeof window !== "undefined" ? window.innerWidth : 0;
}

function getWidthServerSnapshot(): number {
  return 0;
}

export function useMobileLayout(): boolean {
  const coarse = useCoarsePointer();
  const width = useSyncExternalStore(subscribeWidth, getWidthSnapshot, getWidthServerSnapshot);
  return isMobileLayout({ coarse, width });
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
pnpm test --run tests/unit/useMobileLayout.spec.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMobileLayout.ts tests/unit/useMobileLayout.spec.ts
git commit -m "feat / mobile-layout-hook : Add useMobileLayout + isMobileLayout derivation"
```

### Task 2.2: Suppress global Mobile FluidSim mount in SceneProvider

**Files:**
- Modify: `src/components/scene/SceneProvider.tsx`
- Test: extend existing scene test or add a new one if missing

- [ ] **Step 1: Read existing SceneProvider.tsx**

```bash
cat src/components/scene/SceneProvider.tsx | head -80
```

Find the section that mounts `<FluidSim>` inside the persistent Canvas.

- [ ] **Step 2: Wrap FluidSim mount with `useMobileLayout` guard**

In `SceneProvider.tsx`, locate the line(s) that render `<FluidSim ...>`. Replace with conditional render:

```typescript
import { useMobileLayout } from "@/hooks/useMobileLayout";

// Inside component:
const isMobile = useMobileLayout();
// ...
{!isMobile && (
  <FluidSim
    config={config}
    measuring={measuring}
    onGLReady={onGLReady}
    onFrametime={onFrametime}
  />
)}
```

Add a comment block above the conditional explaining the mode-split (see spec §3.2).

- [ ] **Step 3: Verify no regressions on Desktop**

```bash
pnpm dev
```

Open `http://localhost:3000/de/` in a desktop browser, scroll to Hero — Sim should still appear.

Open DevTools → Device Toolbar → switch to Pixel 5 → reload — global Sim should NOT mount (you can verify by checking absence of canvas under root `<main>` … wait for Phase 3 to add the Hero-Mobile Sim).

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: 0 new failures. Existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/SceneProvider.tsx
git commit -m "feat / mobile-mode-split : Suppress global FluidSim on Mobile layout"
```

---

## Phase 3 — Hero Mobile Sim (REQUIRES SF-3)

> **Blocker:** SF-3 must be merged before this phase. If not yet merged, stop and surface to Manuel.

### Task 3.1: Create HeroMobileSim component (canvas + orchestrator)

**Files:**
- Create: `src/components/scene/HeroMobileSim.tsx`
- Test: `tests/e2e/hero-sim-mobile.spec.ts`

- [ ] **Step 1: Write failing E2E test**

Create `tests/e2e/hero-sim-mobile.spec.ts`:

```typescript
import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["Pixel 5"] });

test.describe("Hero Mobile Sim", () => {
  test("mounts a sim canvas inside the hero section", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");
    const canvas = page.locator('section#hero canvas[data-testid="hero-mobile-sim"]');
    await expect(canvas).toBeVisible();
  });

  test("does NOT mount the global fixed-position sim canvas", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");
    const globalCanvas = page.locator(
      'div[data-testid="scene-root"] > canvas',
    );
    await expect(globalCanvas).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm exec playwright test tests/e2e/hero-sim-mobile.spec.ts --project=mobile-chrome
```

Expected: FAIL — locator returns 0 elements.

- [ ] **Step 3: Implement HeroMobileSim**

Create `src/components/scene/HeroMobileSim.tsx`:

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createFluidOrchestrator } from "@/lib/gl/fluidOrchestrator"; // post-SF-3 factory
import { subscribe } from "@/lib/raf";
import { subscribeToLoaderComplete } from "@/lib/loaderSession";

/**
 * Mobile Hero — scroll-attached Sim canvas living inside the Hero section.
 * Replaces the global fixed-position Desktop Sim on Mobile layout.
 *
 * - Auto-Ambient: 3 splats over 2-3s after loader-complete
 * - Touch: tap = 1 splat, drag = trail
 * - IO-pause when 80% out-of-viewport
 * - Warmup-Frame on mount (silent shader compile)
 */
export function HeroMobileSim() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<ReturnType<typeof createFluidOrchestrator> | null>(null);
  const { tier } = useGPUCapability();
  const reduced = useReducedMotion();

  // Mount + dispose
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const orchestrator = createFluidOrchestrator();
    orchestrator.init(gl, tier);
    orchestratorRef.current = orchestrator;

    // Warmup splat off-screen (silent shader compile, mitigates first-touch stall)
    orchestrator.injectSplat(-1, -1, [0, 0, 0], 0, 0);

    // Auto-ambient after loader-complete
    const unsubLoader = subscribeToLoaderComplete(() => {
      window.setTimeout(() => orchestrator.triggerAmbient(), 100);
    });

    return () => {
      unsubLoader();
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [tier, reduced]);

  // Touch handlers: tap = single splat, drag = trail
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const splatAt = (x: number, y: number, dx = 0, dy = 0) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;
      const rect = canvas.getBoundingClientRect();
      const u = (x - rect.left) / rect.width;
      const v = 1.0 - (y - rect.top) / rect.height;
      orchestrator.injectSplat(u, v, null, dx, dy);
    };

    let lastX = 0;
    let lastY = 0;
    let dragging = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      lastX = t.clientX;
      lastY = t.clientY;
      dragging = true;
      splatAt(lastX, lastY);
    };
    const onMove = (e: TouchEvent) => {
      if (!dragging) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = (t.clientX - lastX) * 0.001;
      const dy = -(t.clientY - lastY) * 0.001;
      splatAt(t.clientX, t.clientY, dx, dy);
      lastX = t.clientX;
      lastY = t.clientY;
    };
    const onEnd = () => {
      dragging = false;
    };

    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [reduced]);

  // RAF loop with IO-pause-gate
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let inView = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.intersectionRatio > 0.2;
        }
      },
      { threshold: [0, 0.2, 0.5] },
    );
    io.observe(canvas);

    const unsubRaf = subscribe((deltaMs, elapsedMs) => {
      if (!inView) return;
      orchestratorRef.current?.step(deltaMs * 0.001, elapsedMs, null);
    }, 15);

    return () => {
      io.disconnect();
      unsubRaf();
    };
  }, [reduced]);

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--color-paper)" }}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="hero-mobile-sim"
      className="pointer-events-auto absolute inset-0 -z-10 h-full w-full"
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 4: Mount inside Hero**

Modify `src/components/sections/Hero.tsx`. Add at the top:

```typescript
"use client";

import dynamic from "next/dynamic";
import { useMobileLayout } from "@/hooks/useMobileLayout";

const HeroMobileSim = dynamic(
  () => import("@/components/scene/HeroMobileSim").then((m) => m.HeroMobileSim),
  { ssr: false },
);
```

Then update the JSX root to be `position: relative` and conditionally render `<HeroMobileSim />`:

```typescript
export function Hero() {
  const t = useTranslations("hero");
  const isMobile = useMobileLayout();

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="container-page grid-12 relative min-h-[calc(100dvh-9rem)] items-end gap-y-12 py-16 md:py-24"
    >
      {isMobile && <HeroMobileSim />}
      {/* … rest unchanged … */}
    </section>
  );
}
```

Note: `relative` was already in the className. Confirm. Mark Hero.tsx as `"use client"` if not already.

- [ ] **Step 5: Run E2E test**

```bash
pnpm exec playwright test tests/e2e/hero-sim-mobile.spec.ts --project=mobile-chrome
```

Expected: 2 passed.

- [ ] **Step 6: Visual sanity-check on Desktop**

```bash
pnpm test:visual
```

Expected: pass (no Desktop change).

- [ ] **Step 7: Commit**

```bash
git add src/components/scene/HeroMobileSim.tsx src/components/sections/Hero.tsx tests/e2e/hero-sim-mobile.spec.ts
git commit -m "feat / hero-mobile-sim : Scroll-attached sim canvas with touch handlers + IO-pause"
```

---

## Phase 4 — Photography Mobile Swiper (REQUIRES SF-3)

### Task 4.1: PhotographyMobile component skeleton

**Files:**
- Create: `src/components/sections/PhotographyMobile.tsx`
- Test: `tests/e2e/photography-swiper.spec.ts`

- [ ] **Step 1: Write failing E2E test**

Create `tests/e2e/photography-swiper.spec.ts`:

```typescript
import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["Pixel 5"] });

test.describe("Photography Swiper", () => {
  test("renders 5 slides + pagination dots", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const slides = page.locator('[data-testid="photo-slide"]');
    await expect(slides).toHaveCount(5);

    const dots = page.locator('[data-testid="photo-dot"]');
    await expect(dots).toHaveCount(5);
  });

  test("prev/next buttons advance the swiper", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const nextBtn = page.locator('[data-testid="photo-next"]');
    await nextBtn.click();

    // Second dot is active
    await expect(page.locator('[data-testid="photo-dot"]').nth(1)).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("aria-live announces slide change", async ({ page }) => {
    await page.goto("/de/#photography");
    const live = page.locator('[data-testid="photo-live-region"]');
    await page.locator('[data-testid="photo-next"]').click();
    await expect(live).toContainText(/2 \/ 5|2 von 5/);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm exec playwright test tests/e2e/photography-swiper.spec.ts --project=mobile-chrome
```

Expected: FAIL — selectors return 0.

- [ ] **Step 3: Implement PhotographyMobile**

Create `src/components/sections/PhotographyMobile.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { PhotoSwiperSim } from "@/components/scene/PhotoSwiperSim";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type SpotColor = "rose" | "amber" | "mint" | "violet";

type Slide = {
  baseName: string;
  altKey: string;
  stampKey: string;
  spot: SpotColor;
  widths: number[];
};

const SLIDES: readonly Slide[] = [
  { baseName: "01-pelican", altKey: "pelican", stampKey: "pelican", spot: "amber", widths: [800, 1200] },
  { baseName: "02-koenigsegg", altKey: "koenigsegg", stampKey: "koenigsegg", spot: "violet", widths: [800, 1200] },
  { baseName: "03-panorama", altKey: "panorama", stampKey: "panorama", spot: "amber", widths: [1200, 1920] },
  { baseName: "04-tree-lake", altKey: "treeLake", stampKey: "treeLake", spot: "mint", widths: [800, 1200] },
  { baseName: "05-crocodile", altKey: "crocodile", stampKey: "crocodile", spot: "rose", widths: [800, 1200] },
] as const;

const SPOT_FILL_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};

export function PhotographyMobile() {
  const t = useTranslations("photography");
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  // Sync index from scroll position (touch-swipe via scroll-snap)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const slide = Math.round(track.scrollLeft / track.clientWidth);
      setIndex(slide);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, newIndex));
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: clamped * track.clientWidth, behavior: reduced ? "auto" : "smooth" });
    setIndex(clamped);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") goTo(index + 1);
    if (e.key === "ArrowLeft") goTo(index - 1);
  };

  const current = SLIDES[index];

  return (
    <section
      id="photography"
      aria-labelledby="photography-heading"
      className="relative py-12"
    >
      <header className="container-page mb-8 flex items-center justify-between">
        <h2 id="photography-heading" className="type-h2 text-ink">
          {t("headline")}
        </h2>
        <span className="type-label text-ink-muted" data-testid="photo-counter">
          {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </header>

      <div className="relative">
        {!reduced && current && <PhotoSwiperSim spot={current.spot} index={index} />}
        <div
          ref={trackRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("ariaCarouselLabel")}
          tabIndex={0}
          onKeyDown={onKey}
          className="flex h-[75vh] snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {SLIDES.map((slide) => (
            <figure
              key={slide.baseName}
              data-testid="photo-slide"
              className="relative flex h-full w-full shrink-0 snap-center items-center justify-center px-4"
            >
              <picture>
                <source
                  type="image/avif"
                  srcSet={slide.widths.map((w) => `/photography/${slide.baseName}-${w}.avif ${w}w`).join(", ")}
                />
                <source
                  type="image/webp"
                  srcSet={slide.widths.map((w) => `/photography/${slide.baseName}-${w}.webp ${w}w`).join(", ")}
                />
                <img
                  src={`/photography/${slide.baseName}-1200.jpg`}
                  alt={t(`photos.${slide.altKey}.alt`)}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </picture>
              <figcaption className="absolute right-4 bottom-4 max-w-[60%] type-label-stamp">
                {t(`photos.${slide.stampKey}.stamp`)}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Pagination */}
        <div className="container-page mt-6 flex items-center justify-between">
          <button
            type="button"
            data-testid="photo-prev"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="type-label-stamp p-3 disabled:opacity-30"
            aria-label={t("ariaPrev")}
          >
            ← {t("prev")}
          </button>

          <div className="flex items-center gap-2" role="tablist">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.baseName}
                type="button"
                data-testid="photo-dot"
                role="tab"
                aria-current={i === index ? "true" : "false"}
                aria-label={t("ariaDot", { index: i + 1, total: SLIDES.length })}
                onClick={() => goTo(i)}
                className={`size-3 rounded-full border border-ink p-3 ${
                  i === index ? SPOT_FILL_CLASS[slide.spot] : "bg-paper"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            data-testid="photo-next"
            onClick={() => goTo(index + 1)}
            disabled={index === SLIDES.length - 1}
            className="type-label-stamp p-3 disabled:opacity-30"
            aria-label={t("ariaNext")}
          >
            {t("next")} →
          </button>
        </div>

        <div
          data-testid="photo-live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {t("ariaLive", { index: index + 1, total: SLIDES.length })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create PhotoSwiperSim stub (sim wired later, focus on layout first)**

Create `src/components/scene/PhotoSwiperSim.tsx`:

```typescript
"use client";

type Props = {
  spot: "rose" | "amber" | "mint" | "violet";
  index: number;
};

export function PhotoSwiperSim({ spot, index }: Props) {
  // TODO Phase 4.2: wire actual FluidOrchestrator instance and trigger
  // splat in `spot` color when `index` changes.
  return (
    <canvas
      data-testid="photo-swiper-sim"
      data-spot={spot}
      data-index={index}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    />
  );
}
```

- [ ] **Step 5: Add new i18n keys**

Add the following to all four locale files (`messages/de.json`, `messages/en.json`, `messages/fr.json`, `messages/it.json`) under `photography`:

```json
{
  "photography": {
    "ariaCarouselLabel": "Fotostrecke",
    "ariaPrev": "Vorheriges Bild",
    "ariaNext": "Nächstes Bild",
    "ariaDot": "Bild {index} von {total}",
    "ariaLive": "Bild {index} von {total}",
    "prev": "Zurück",
    "next": "Weiter"
  }
}
```

(EN/FR/IT translate accordingly per existing translation convention in CLAUDE.md — DE source mirrored verbatim for body content but UI shells get proper translation; these are shell strings.)

- [ ] **Step 6: Lazy-import from Photography.tsx**

Modify `src/components/sections/Photography.tsx`. At top:

```typescript
import dynamic from "next/dynamic";
import { useMobileLayout } from "@/hooks/useMobileLayout";

const PhotographyMobile = dynamic(
  () => import("@/components/sections/PhotographyMobile").then((m) => m.PhotographyMobile),
  { ssr: false },
);
```

Inside the component, after the existing hook setup:

```typescript
const isMobile = useMobileLayout();
if (isMobile) return <PhotographyMobile />;
// ... existing desktop JSX unchanged ...
```

- [ ] **Step 7: Run swiper test**

```bash
pnpm exec playwright test tests/e2e/photography-swiper.spec.ts --project=mobile-chrome
```

Expected: 3 passed.

- [ ] **Step 8: Run visual baseline**

```bash
pnpm test:visual --project=chromium
```

Expected: pass (Desktop unchanged).

- [ ] **Step 9: Commit**

```bash
git add src/components/sections/PhotographyMobile.tsx src/components/scene/PhotoSwiperSim.tsx src/components/sections/Photography.tsx tests/e2e/photography-swiper.spec.ts messages/
git commit -m "feat / photography-mobile : Horizontal swiper + pagination + a11y, sim canvas stubbed"
```

### Task 4.2: Wire PhotoSwiperSim to FluidOrchestrator

**Files:**
- Modify: `src/components/scene/PhotoSwiperSim.tsx`

- [ ] **Step 1: Replace stub with real orchestrator**

Replace the entire `PhotoSwiperSim.tsx` content:

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createFluidOrchestrator } from "@/lib/gl/fluidOrchestrator";
import { SPOT_RGB, type SpotColor } from "@/lib/palette";
import { subscribe } from "@/lib/raf";

type Props = {
  spot: SpotColor;
  index: number;
};

export function PhotoSwiperSim({ spot, index }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<ReturnType<typeof createFluidOrchestrator> | null>(null);
  const { tier } = useGPUCapability();
  const reduced = useReducedMotion();

  // Init / dispose orchestrator
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false });
    if (!gl) return;

    const o = createFluidOrchestrator();
    o.init(gl, tier);
    o.injectSplat(-1, -1, [0, 0, 0], 0, 0); // warmup
    orchestratorRef.current = o;

    return () => {
      o.dispose();
      orchestratorRef.current = null;
    };
  }, [tier, reduced]);

  // Splat in current spot color when index changes
  useEffect(() => {
    if (reduced) return;
    const o = orchestratorRef.current;
    if (!o) return;
    const color = SPOT_RGB[spot];
    // Splat in centre of viewport with a small downward velocity
    o.injectSplat(0.5, 0.5, color, 0, -0.2);
  }, [spot, index, reduced]);

  // RAF loop with IO-pause
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let inView = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inView = e.intersectionRatio > 0.2;
      },
      { threshold: [0, 0.2, 0.5] },
    );
    io.observe(canvas);

    const unsub = subscribe((deltaMs, elapsedMs) => {
      if (!inView) return;
      orchestratorRef.current?.step(deltaMs * 0.001, elapsedMs, null);
    }, 15);

    return () => {
      io.disconnect();
      unsub();
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="photo-swiper-sim"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    />
  );
}
```

- [ ] **Step 2: Manual smoke on Mobile emulation**

```bash
pnpm dev
```

Open DevTools → Pixel 5 emulation → navigate to `/de/#photography`. Swipe to next slide; expect a splat in the next slide's spot color.

- [ ] **Step 3: Run all Mobile tests**

```bash
pnpm exec playwright test --project=mobile-chrome
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/PhotoSwiperSim.tsx
git commit -m "feat / photography-mobile : Wire FluidOrchestrator to swipe-triggered splats"
```

---

## Phase 5 — Case-Study Mobile Scrolly (REQUIRES SF-3)

### Task 5.1: CaseStudyMobileScrolly skeleton (no sim yet)

**Files:**
- Create: `src/components/case-study/CaseStudyMobileScrolly.tsx`
- Test: `tests/e2e/case-study-scrolly-mobile.spec.ts`

- [ ] **Step 1: Write failing E2E test**

Create `tests/e2e/case-study-scrolly-mobile.spec.ts`:

```typescript
import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["Pixel 5"] });

test.describe("Case Study Mobile Scrolly", () => {
  test("renders 4 stations vertically", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");
    const stations = page.locator('[data-testid^="cs-station-"]');
    await expect(stations).toHaveCount(4);
  });

  test("mounts a single sim canvas behind the scrolly", async ({ page }) => {
    await page.goto("/de/#case-study");
    const sims = page.locator('[data-testid="cs-mobile-sim"]');
    await expect(sims).toHaveCount(1);
  });

  test("does NOT mount the desktop DioramaTrack", async ({ page }) => {
    await page.goto("/de/#case-study");
    await expect(page.locator('[data-testid="diorama-track"]')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm exec playwright test tests/e2e/case-study-scrolly-mobile.spec.ts --project=mobile-chrome
```

Expected: FAIL.

- [ ] **Step 3: Implement CaseStudyMobileScrolly skeleton**

Create `src/components/case-study/CaseStudyMobileScrolly.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { HighlightCard } from "@/components/case-study/cards/HighlightCard";
import { HookCard } from "@/components/case-study/cards/HookCard";
import { PublicCard } from "@/components/case-study/cards/PublicCard";
import { StackCard } from "@/components/case-study/cards/StackCard";
import { WhatCard } from "@/components/case-study/cards/WhatCard";
import { CaseStudyMobileSim } from "@/components/scene/CaseStudyMobileSim";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type {
  CaseStudyFacts,
  CaseStudyHighlightAdmin,
  CaseStudyHighlightOverlay,
  CaseStudyHighlights,
  CaseStudyHookStation,
  CaseStudyPublicShots,
  CaseStudyStack,
  CaseStudyStackStation,
  CaseStudyStory,
} from "@/types/i18n-shapes";

type PublicShot = {
  slug: string;
  aspect: "16/9" | "9/16";
  spot: "mint" | "violet" | "rose" | "amber";
  rotate: number;
  alt: string;
  datestamp: string;
  caption: string;
};

type Props = {
  handleOpen: (index: number) => () => void;
  publicShots: PublicShot[];
};

export function CaseStudyMobileScrolly({ handleOpen, publicShots }: Props) {
  const t = useTranslations("caseStudy");
  const reduced = useReducedMotion();

  const facts = t.raw("context.facts") as CaseStudyFacts;
  const storyParas = t.raw("context.story") as CaseStudyStory;
  const stack = t.raw("platform.stack") as CaseStudyStack;
  const highlights = t.raw("highlights.items") as CaseStudyHighlights;
  const hookStation = t.raw("stations.hook") as CaseStudyHookStation;
  const stackStation = t.raw("stations.stack") as CaseStudyStackStation;
  const highlightAdmin = t.raw("stations.highlightAdmin") as CaseStudyHighlightAdmin;
  const highlightOverlay = t.raw("stations.highlightOverlay") as CaseStudyHighlightOverlay;

  const adminHighlight = highlights.find((h) => h.id === "admin");
  const overlayHighlight = highlights.find((h) => h.id === "overlay");

  // Station refs are used by CaseStudyMobileSim to compute splat-trigger positions.
  const stationIds = useMemo(
    () => ["cs-station-hook", "cs-station-context", "cs-station-highlights", "cs-station-public"],
    [],
  );

  return (
    <section
      id="case-study"
      aria-labelledby="case-study-heading"
      className="relative bg-paper"
    >
      <h2 id="case-study-heading" className="sr-only">
        {t("headline")}
      </h2>

      {!reduced && <CaseStudyMobileSim stationIds={stationIds} />}

      <div className="container-page flex flex-col gap-12 py-12">
        {/* Station 1: Hook */}
        <div data-testid="cs-station-hook" id="cs-station-hook" className="relative">
          <HookCard
            hookText={t("hook")}
            datestamp={hookStation.datestamp}
            polaroidCaption={hookStation.polaroidCaption ?? ""}
            lightboxIndex={0}
            onPolaroidClick={handleOpen(0)}
          />
        </div>

        {/* Station 2: Context + Stack */}
        <div data-testid="cs-station-context" id="cs-station-context" className="relative flex flex-col gap-8">
          <WhatCard label={t("context.label")} facts={facts} storyParas={storyParas} />
          <StackCard heading={stackStation.heading} stack={stack} />
        </div>

        {/* Station 3: Highlights */}
        <div data-testid="cs-station-highlights" id="cs-station-highlights" className="relative flex flex-col gap-8">
          {adminHighlight ? (
            <HighlightCard
              slug="admin"
              spot="rose"
              kicker={adminHighlight.kicker}
              title={adminHighlight.title}
              lede={adminHighlight.lede}
              features={adminHighlight.features}
              screenshotAlt={adminHighlight.screenshotAlt}
              datestamp={highlightAdmin.datestamp}
              polaroidCaption={highlightAdmin.polaroidCaption ?? ""}
              lightboxIndex={1}
              onPolaroidClick={handleOpen(1)}
            />
          ) : null}
          {overlayHighlight ? (
            <HighlightCard
              slug="twitchoverlay"
              spot="amber"
              kicker={overlayHighlight.kicker}
              title={overlayHighlight.title}
              lede={overlayHighlight.lede}
              features={overlayHighlight.features}
              screenshotAlt={overlayHighlight.screenshotAlt}
              datestamp={highlightOverlay.datestamp}
              polaroidCaption={highlightOverlay.polaroidCaption ?? ""}
              lightboxIndex={2}
              onPolaroidClick={handleOpen(2)}
            />
          ) : null}
        </div>

        {/* Station 4: Public Shots */}
        <div data-testid="cs-station-public" id="cs-station-public" className="relative">
          <PublicCard
            shots={publicShots as never}
            reflectionLabel={t("reflection.label")}
            reflectionBody={t("reflection.body")}
            footerLabel={t("footerLink.label")}
            footerDomain={t("footerLink.domain")}
            footerUrl={t("footerLink.url")}
            footerExternal={t("footerLink.external")}
            lightboxBaseIndex={3}
            onShotClick={(i) => handleOpen(3 + i)()}
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create CaseStudyMobileSim stub**

Create `src/components/scene/CaseStudyMobileSim.tsx`:

```typescript
"use client";

type Props = {
  stationIds: string[];
};

export function CaseStudyMobileSim({ stationIds }: Props) {
  // TODO Phase 5.2: wire FluidOrchestrator + ScrollTrigger per station transition
  return (
    <canvas
      data-testid="cs-mobile-sim"
      data-stations={stationIds.join(",")}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    />
  );
}
```

- [ ] **Step 5: Branch in CaseStudy.tsx**

Modify `src/components/sections/CaseStudy.tsx`. Replace the existing `mobileFallback` JSX path with lazy import + conditional render:

```typescript
import dynamic from "next/dynamic";
import { useMobileLayout } from "@/hooks/useMobileLayout";

const CaseStudyMobileScrolly = dynamic(
  () =>
    import("@/components/case-study/CaseStudyMobileScrolly").then(
      (m) => m.CaseStudyMobileScrolly,
    ),
  { ssr: false },
);
```

Inside `CaseStudy()`, before the existing `mobileFallback` const, add:

```typescript
const isMobile = useMobileLayout();
```

Then change the JSX return so that when `isMobile` is true, the CaseStudyMobileScrolly is rendered with the `publicShots` + `handleOpen` already computed; otherwise the existing DioramaTrack path runs. Replace `<DioramaTrack mobileFallback={mobileFallback} …>` with:

```typescript
return (
  <>
    {isMobile ? (
      <CaseStudyMobileScrolly handleOpen={handleOpen} publicShots={publicShots} />
    ) : (
      <DioramaTrack mobileFallback={null} sectionLabel={t("sectionLabel")}>
        {/* … existing diorama children … */}
      </DioramaTrack>
    )}
    <Lightbox />
  </>
);
```

Note: `DioramaTrack` still needs its `mobileFallback` prop for the reduced-motion path on Desktop. Pass `null` only when Mobile is taking over; for Desktop reduced-motion keep the existing fallback. Implementer should adjust the conditional to handle both — easier path: `mobileFallback={isMobile ? null : <existing-mobile-fallback />}`.

- [ ] **Step 6: Add data-testid to DioramaTrack (for the absence-test)**

Modify `src/components/case-study/DioramaTrack.tsx`. Find the outer wrapper element and add `data-testid="diorama-track"`. This is a tiny annotation, purely for the Mobile-test to assert absence.

- [ ] **Step 7: Run scrolly test**

```bash
pnpm exec playwright test tests/e2e/case-study-scrolly-mobile.spec.ts --project=mobile-chrome
```

Expected: 3 passed.

- [ ] **Step 8: Run visual baseline**

```bash
pnpm test:visual --project=chromium
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/case-study/CaseStudyMobileScrolly.tsx src/components/scene/CaseStudyMobileSim.tsx src/components/sections/CaseStudy.tsx src/components/case-study/DioramaTrack.tsx tests/e2e/case-study-scrolly-mobile.spec.ts
git commit -m "feat / case-study-mobile : Vertical scrolly with 4 stations, sim canvas stubbed"
```

### Task 5.2: Wire CaseStudyMobileSim splat triggers per station

**Files:**
- Modify: `src/components/scene/CaseStudyMobileSim.tsx`

- [ ] **Step 1: Replace stub with orchestrator + ScrollTrigger**

```typescript
"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useGPUCapability } from "@/hooks/useGPUCapability";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createFluidOrchestrator } from "@/lib/gl/fluidOrchestrator";
import { SPOT_RGB, type SpotColor } from "@/lib/palette";
import { subscribe } from "@/lib/raf";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  stationIds: string[];
};

const STATION_COLORS: SpotColor[] = ["mint", "violet", "rose", "amber"];

export function CaseStudyMobileSim({ stationIds }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<ReturnType<typeof createFluidOrchestrator> | null>(null);
  const { tier } = useGPUCapability();
  const reduced = useReducedMotion();

  // Init
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false });
    if (!gl) return;
    const o = createFluidOrchestrator();
    o.init(gl, tier);
    o.injectSplat(-1, -1, [0, 0, 0], 0, 0);
    orchestratorRef.current = o;
    return () => {
      o.dispose();
      orchestratorRef.current = null;
    };
  }, [tier, reduced]);

  // ScrollTrigger per station — splat in next-station color at 50% scroll
  useEffect(() => {
    if (reduced) return;
    const triggers: ScrollTrigger[] = [];
    stationIds.forEach((id, i) => {
      const next = STATION_COLORS[i + 1];
      if (!next) return;
      const target = document.getElementById(id);
      if (!target) return;
      const trigger = ScrollTrigger.create({
        trigger: target,
        start: "center center",
        once: false,
        onEnter: () => {
          const color = SPOT_RGB[next];
          orchestratorRef.current?.injectSplat(0.5, 0.4, color, 0, -0.3);
        },
      });
      triggers.push(trigger);
    });
    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [stationIds, reduced]);

  // RAF loop + IO-pause
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let inView = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inView = e.intersectionRatio > 0.1;
      },
      { threshold: [0, 0.1, 0.5] },
    );
    io.observe(canvas);
    const unsub = subscribe((deltaMs, elapsedMs) => {
      if (!inView) return;
      orchestratorRef.current?.step(deltaMs * 0.001, elapsedMs, null);
    }, 15);
    return () => {
      io.disconnect();
      unsub();
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="cs-mobile-sim"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    />
  );
}
```

- [ ] **Step 2: Manual smoke on Mobile emulation**

```bash
pnpm dev
```

Open Pixel 5 emulation → `/de/#case-study` → scroll slowly through the 4 stations, expect a splat in the next station's spot color when each station hits centre.

- [ ] **Step 3: Run scrolly test**

```bash
pnpm exec playwright test tests/e2e/case-study-scrolly-mobile.spec.ts --project=mobile-chrome
```

Expected: still passing.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/CaseStudyMobileSim.tsx
git commit -m "feat / case-study-mobile-sim : ScrollTrigger-driven station splats in spot colors"
```

---

## Phase 6 — About Compression

### Task 6.1: Inline-branching in About for Mobile

**Files:**
- Modify: `src/components/sections/About.tsx`
- Modify: `src/components/about/ObjectGrid.tsx`

- [ ] **Step 1: Add inline-branching to About.tsx**

Modify `src/components/sections/About.tsx`. Add at top:

```typescript
"use client";

import { useMobileLayout } from "@/hooks/useMobileLayout";
```

Inside `About()`, after `const parts = ...`:

```typescript
const isMobile = useMobileLayout();
```

Wrap the existing AboutBlocks for `wie-angefangen` and `antrieb` (mint + violet) with `{!isMobile && (…)}`. Wrap the StampDividers immediately following them with the same conditional.

Wrap the matching ObjectGrid with `<ObjectGrid variant={isMobile ? "mobile-strip" : "grid"} />`.

The final structure on Mobile renders:
- Header
- AboutBlock `wer-ich-bin` (rose) + StampDivider rose
- Portrait + Currently
- AboutBlock `ai-workflow` (amber, loud-centered) + StampDivider amber
- ObjectGrid mobile-strip variant

- [ ] **Step 2: Add `variant` prop to ObjectGrid**

Modify `src/components/about/ObjectGrid.tsx`. Add to the props type:

```typescript
type Props = {
  variant?: "grid" | "mobile-strip";
};
```

In the JSX, conditionally render:

```typescript
export function ObjectGrid({ variant = "grid" }: Props) {
  // … existing data fetch …

  if (variant === "mobile-strip") {
    return (
      <div className="container-page py-8">
        <header className="mb-6">
          {/* same header as grid */}
        </header>
        <div
          role="region"
          aria-label="Objects"
          className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6"
          style={{ scrollbarWidth: "none" }}
        >
          {tiles.map((tile) => (
            <div key={tile.id} className="w-[70vw] shrink-0 snap-center">
              <TileFigure {...tile} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // … existing grid JSX unchanged …
}
```

Where `tiles` corresponds to whatever array the grid currently maps over — implementer reads the existing component to match. The shape and the `TileFigure` component are reused; only the outer container changes.

- [ ] **Step 3: Smoke test on Mobile**

```bash
pnpm dev
```

Open Pixel 5 emulation → `/de/#about` → scroll through. Expect 2 PullQuotes (rose + amber), Portrait between them, ObjectGrid as horizontal swipe strip.

- [ ] **Step 4: Desktop visual baseline**

```bash
pnpm test:visual --project=chromium
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/About.tsx src/components/about/ObjectGrid.tsx
git commit -m "feat / about-mobile-compress : 2 of 4 PullQuotes + horizontal ObjectGrid strip"
```

---

## Phase 7 — GPU-Tier Mobile Mapping

### Task 7.1: Extend `lib/gpu.ts` tier mapping

**Files:**
- Modify: `src/lib/gpu.ts`
- Modify: `tests/unit/gpu.spec.ts`

- [ ] **Step 1: Read current matchRenderer + tierFromFrametime**

```bash
cat src/lib/gpu.ts | head -200
```

Locate `matchRenderer` and `tierFromFrametime` — the two pure functions covered by the existing `gpu.spec.ts`.

- [ ] **Step 2: Add failing tests for Mobile tiers**

In `tests/unit/gpu.spec.ts`, add these cases to the existing `matchRenderer` describe block:

```typescript
it("maps Apple A17/A18 GPU strings to flagship", () => {
  expect(matchRenderer("Apple A17 Pro GPU")).toBe("flagship-mobile");
  expect(matchRenderer("Apple A18 GPU")).toBe("flagship-mobile");
});

it("maps Apple A13–A16 to medium-mobile", () => {
  expect(matchRenderer("Apple A13 Bionic GPU")).toBe("medium-mobile");
  expect(matchRenderer("Apple A15 Bionic GPU")).toBe("medium-mobile");
});

it("maps Adreno 7xx / Mali-G7xx flagship to flagship-mobile", () => {
  expect(matchRenderer("Adreno 750")).toBe("flagship-mobile");
  expect(matchRenderer("Mali-G715")).toBe("flagship-mobile");
});

it("maps mid-tier Adreno to medium-mobile", () => {
  expect(matchRenderer("Adreno 640")).toBe("medium-mobile");
});
```

Note: existing `Tier` type currently has `high | medium | low | minimal | static`. We're extending with `flagship-mobile | medium-mobile`. Two options:

1. Add new tier names to the union → invasive
2. Keep current tier names; introduce a `mobileSubtier` function alongside

Implementer picks. Default: option 2 (less invasive). Update tests accordingly — replace `flagship-mobile`/`medium-mobile` with the equivalent tier resolution (`high`/`medium`) and assert on a separate `mobileSubtier()` function.

- [ ] **Step 3: Run tests, observe failures**

```bash
pnpm test --run tests/unit/gpu.spec.ts
```

Expected: 4 new failures.

- [ ] **Step 4: Implement (option 2 — separate mobileSubtier)**

In `src/lib/gpu.ts`, add at bottom:

```typescript
export type MobileSubtier = "flagship-mobile" | "medium-mobile" | "low-mobile";

const FLAGSHIP_MOBILE_PATTERNS = [
  /Apple A1[7-9]/i,
  /Apple A2\d/i,
  /Apple M\d/i,
  /Adreno 7\d{2}/i,
  /Mali-G7\d{2}/i,
];

const MEDIUM_MOBILE_PATTERNS = [
  /Apple A1[3-6]/i,
  /Adreno 6\d{2}/i,
  /Mali-G[57-9]\d/i,
];

export function mobileSubtier(renderer: string): MobileSubtier {
  if (FLAGSHIP_MOBILE_PATTERNS.some((p) => p.test(renderer))) return "flagship-mobile";
  if (MEDIUM_MOBILE_PATTERNS.some((p) => p.test(renderer))) return "medium-mobile";
  return "low-mobile";
}
```

- [ ] **Step 5: Re-run tests**

```bash
pnpm test --run tests/unit/gpu.spec.ts
```

Expected: all pass.

- [ ] **Step 6: Wire mobileSubtier into per-section sims**

Where `HeroMobileSim` / `PhotoSwiperSim` / `CaseStudyMobileSim` call `createFluidOrchestrator().init(gl, tier)`, route through subtier when on Mobile to pick the correct `simResolution`. Implementer extends `TierConfig` with a `simResolution` field (256 / 128 / 96) or uses the existing tier-config pipeline if it already exposes resolution.

- [ ] **Step 7: Commit**

```bash
git add src/lib/gpu.ts tests/unit/gpu.spec.ts src/components/scene/HeroMobileSim.tsx src/components/scene/PhotoSwiperSim.tsx src/components/scene/CaseStudyMobileSim.tsx
git commit -m "feat / gpu-tier-mobile : Flagship/medium/low-mobile subtier mapping (Apple/Adreno/Mali)"
```

---

## Phase 8 — A11y, Touch-Targets, Reduced-Motion

### Task 8.1: Touch-target audit

**Files:**
- Audit-only — touch existing files where needed

- [ ] **Step 1: Manual DOM audit on Mobile emulation**

Open Pixel 5 emulation → tab through every interactive element on Home → check focus rings + hit-areas:

- Hero Sim canvas (touch-only, no focus needed)
- Nav hamburger (already 44×44, verify)
- Skip-link (`.skip-link` — verify focus-visible)
- Skills VibecodedStamp (decorative, no interaction)
- Work cards (`<a>` tags — verify hit-area)
- About PullQuotes (no interaction)
- About ObjectGrid strip items (each TileFigure — verify hit-area if interactive; if decorative, ignore)
- Case Study Polaroids (Lightbox triggers — verify 44×44)
- Photography Pagination dots (already padded — verify 44×44 hit-area)
- Photography Prev/Next buttons (verify 44×44)
- Contact form inputs (already form-default sized, ≥ 44×44)
- Footer locale links + social icons (verify hit-area)

- [ ] **Step 2: Fix any < 44×44 elements with padding**

For any element below 44×44, add `min-h-[44px] min-w-[44px]` or padded hit-area. Implementer notes each in a commit message.

- [ ] **Step 3: Run axe**

```bash
pnpm exec playwright test tests/a11y/axe.spec.ts --project=mobile-chrome
```

Expected: 0 violations.

- [ ] **Step 4: Commit (only if fixes made)**

```bash
git add -p
git commit -m "fix / mobile-touch-targets : Ensure 44×44 hit-areas on interactive elements"
```

### Task 8.2: Reduced-motion verification

**Files:**
- Add test: `tests/e2e/reduced-motion-mobile.spec.ts`

- [ ] **Step 1: Write test**

```typescript
import { devices, expect, test } from "@playwright/test";

test.use({
  ...devices["Pixel 5"],
  contextOptions: { reducedMotion: "reduce" },
});

test.describe("Mobile reduced-motion", () => {
  test("Hero Sim canvas NOT mounted under prefers-reduced-motion", async ({ page }) => {
    await page.goto("/de/");
    const canvas = page.locator('canvas[data-testid="hero-mobile-sim"]');
    await expect(canvas).toHaveCount(0);
  });

  test("Photography swiper still functional, sim canvas absent", async ({ page }) => {
    await page.goto("/de/#photography");
    await expect(page.locator('[data-testid="photo-slide"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="photo-swiper-sim"]')).toHaveCount(0);
  });

  test("Case Study scrolly renders all 4 stations without sim", async ({ page }) => {
    await page.goto("/de/#case-study");
    await expect(page.locator('[data-testid^="cs-station-"]')).toHaveCount(4);
    await expect(page.locator('[data-testid="cs-mobile-sim"]')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run test**

```bash
pnpm exec playwright test tests/e2e/reduced-motion-mobile.spec.ts --project=mobile-chrome
```

Expected: 3 passed. (All Sim components return `null` under `useReducedMotion`.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/reduced-motion-mobile.spec.ts
git commit -m "test / mobile-reduced-motion : Verify all 3 sim spots disabled under prefers-reduced-motion"
```

---

## Phase 9 — Final Verification

### Task 9.1: Run full CI gate locally

- [ ] **Step 1: pnpm ci:local**

```bash
pnpm ci:local
```

Expected: lint + typecheck + build + test all pass.

If anything fails: stop, fix the actual issue, don't merge.

### Task 9.2: Mobile visual baseline (new post-rework)

- [ ] **Step 1: Regenerate Mobile visual baseline (this is the new baseline)**

```bash
E2E_TARGET=prod pnpm test:visual --update-snapshots --project=mobile-chrome
```

- [ ] **Step 2: Commit new Mobile baseline**

```bash
git add tests/visual/baseline.spec.ts-snapshots
git commit -m "chore / visual-baseline : Lock-in post-rework Mobile baseline"
```

### Task 9.3: Real-device smoke checklist

Manual — Manuel performs these:

- [ ] **iPhone (Manuel's device)**: scroll the home page end-to-end. Check:
  - Hero Sim runs smoothly, touch erzeugt Splats
  - Photography Swiper: swipe works, dots animate, Sim splats on swipe
  - Case Study Scrolly: 4 stations scroll, splats triggern zwischen Stationen
  - About: 2 PullQuotes + ObjectGrid strip
  - No janks, no console errors

- [ ] **iPad (Manuel's device)**: same as above, expect Flagship-tier resolution

- [ ] **Mid-tier Android (if available)** OR Chrome DevTools "4x Slowdown" + Pixel 5 emulation as proxy

### Task 9.4: Open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/mobile-rework
```

- [ ] **Step 2: Open PR via gh CLI**

```bash
gh pr create --title "feat / mobile-rework : Three-sim-spot Mobile rework + Diorama-Scrolly" --body "$(cat <<'EOF'
## Summary

- Three distributed FluidSim spots on Mobile (Hero scroll-attached, Case-Study station-splats, Photography swiper-splats) replace the single global background sim
- Photography compressed from 5 vertical slots to 1 horizontal swiper (massive page-length cut)
- Case-Study horizontal-pin Diorama on Desktop unchanged; Mobile gets new CaseStudyMobileScrolly (vertical 4-station scrolly with sim transitions)
- About kondensiert auf 2 PullQuotes + horizontal ObjectGrid strip on Mobile
- Desktop appearance protected by visual-regression baseline (locked-in pre-rework, asserted unchanged)
- Pre-work: SF-3 FluidOrchestrator Factory (merged separately)

Spec: docs/superpowers/specs/2026-05-20-mobile-rework-design.md
Plan: docs/superpowers/plans/2026-05-20-mobile-rework.md

## Test plan

- [x] pnpm ci:local passes
- [x] Visual regression Desktop: snapshots unchanged
- [x] Mobile chrome project: all new specs pass
- [x] Axe a11y on mobile viewport: 0 violations
- [x] Real-device smoke on iPhone + iPad (Manuel)
- [ ] Mid-tier Android (if available)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL returned.

---

## Spec Coverage Self-Review

Spec sections vs. plan tasks:

- **1 Goals & Non-Goals** → covered by acceptance verification in Phase 9.3
- **2 Approach (Surgical Adapt)** → entire plan is the surgical adapt
- **3.1 Spot-Layout** → Phase 3 (Hero), 4 (Photography), 5 (Case-Study)
- **3.2 Mode-Split Desktop ↔ Mobile** → Phase 2 (SceneProvider suppress global Sim)
- **3.3 Pre-Work SF-3** → flagged as prerequisite at top + Phase 3 gate
- **3.4 Sim-Trigger per Spot** → Tasks 3.1 (Hero ambient+touch+IO), 4.2 (Photography spot-color on swipe), 5.2 (Case-Study ScrollTrigger station splats)
- **4.1 Hero** → Task 3.1
- **4.2 Skills** → unchanged, no task
- **4.3 Work** → no task (fluidBus no-op on coarse-pointer is already in place per existing code; verify in Phase 9 smoke)
- **4.4 About** → Task 6.1
- **4.5 Case-Study** → Task 5.1, 5.2
- **4.6 Photography** → Task 4.1, 4.2
- **4.7 Playground** → no task (existing Mini-Sim pause is in place; verify in smoke)
- **4.8 Contact** → no task (form layout already stacks; verify in smoke)
- **5.1 GPU-Tier-Routing** → Task 7.1
- **5.2 iOS Context-Budget** → checked in real-device smoke 9.3
- **5.3 Compile-Stall Warmup** → integrated in Tasks 3.1, 4.2, 5.2 (`injectSplat(-1, -1, …)` on mount)
- **5.4 LCP/CLS/TBT** → checked via pnpm lighthouse if Manuel re-runs locally
- **5.5 Loader** → unchanged
- **6.1 Touch-Targets** → Task 8.1
- **6.2 Photography Swiper A11y** → Task 4.1 (aria-roledescription, aria-live, prev/next, role=region)
- **6.3 Case-Study Scrolly A11y** → Task 5.1 (semantic structure, aria-hidden sim canvas)
- **6.4 Hero Sim A11y** → Task 3.1 (aria-hidden canvas, no touch hint)
- **6.5 Reduced-Motion** → Task 8.2
- **6.6 Visual-Regression** → Phase 1, Task 9.2
- **6.7 New E2E Tests** → Tasks 3.1, 4.1, 5.1, 8.2
- **6.8 Axe** → Task 8.1
- **6.9 Acceptance Criteria** → checked via Phase 9 + smoke 9.3
- **6.10 Real-Device** → Task 9.3

No gaps detected.

---

## Plan complete and saved to `docs/superpowers/plans/2026-05-20-mobile-rework.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
