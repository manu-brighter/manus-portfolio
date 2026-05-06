# Case Study Responsive Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Case Study diorama render correctly across common
desktop monitor classes (FHD → 4K, 16:9/16:10/21:9/32:9) by aligning
card-internal sizing tokens with the diorama's existing vh-based
coordinate system, and bumping the mobile-fallback breakpoint to
also catch low-height laptop displays.

**Architecture:** Surgical token swap inside `src/components/case-study/`
plus a media-query update in `DioramaTrack.tsx`. Card boxes already
scale with vh; the change makes paddings, gaps, and font-clamp mins
do the same so content fits within boxes at all target viewports.
A height-aware fallback breakpoint routes 1366×768 / 1600×900 / 1280×720
laptop-class viewports to the existing vertical-stack fallback.

**Tech Stack:** React 19, TypeScript, Tailwind CSS arbitrary values,
GSAP ScrollTrigger (existing), Playwright (test only Task 1).

**Spec:** `docs/superpowers/specs/2026-05-06-case-study-responsive-fix-design.md`

**Branch:** `fix/case-study-responsive` (already created off `main`,
spec already committed as `6bc1b3f`).

---

## Pre-flight verification (already done during planning)

- Polaroid is exclusively used by case-study cards (HookCard,
  WhatCard's siblings AdminHighlightCard / OverlayHighlightCard /
  PublicCard). The About section uses a different `Portrait`
  component (`src/components/ui/Portrait.tsx`). The spec §6 risk
  about "About-Portrait regression" is therefore N/A — Polaroid
  changes only affect case-study.
- StackNotebook is exclusively used by StackCard. Token changes
  there are safe.
- DioramaIllustration is purely SVG with viewBox-based scaling, no
  fixed-px content; needs no change.
- DioramaLupe uses one GSAP tween in vh; needs no change.

## File Structure

**Modified files:**
- `src/components/case-study/DioramaTrack.tsx` — fallback breakpoint
- `src/components/case-study/cards/HookCard.tsx` — tokens
- `src/components/case-study/cards/WhatCard.tsx` — tokens
- `src/components/case-study/cards/StackCard.tsx` — tokens
- `src/components/case-study/StackNotebook.tsx` — tokens (used by StackCard)
- `src/components/case-study/cards/AdminHighlightCard.tsx` — tokens
- `src/components/case-study/cards/OverlayHighlightCard.tsx` — tokens
- `src/components/case-study/cards/PublicCard.tsx` — tokens
- `src/components/case-study/Polaroid.tsx` — tokens (case-study-exclusive)
- `.claude/CLAUDE.md` — Phase 12 deviations addendum

**Test files:**
- `tests/e2e/case-study.spec.ts` — new, Playwright test for
  fallback-breakpoint behaviour at viewport heights ≤899 / >900.

---

### Task 1: Playwright test for fallback breakpoint

**Files:**
- Create: `tests/e2e/case-study.spec.ts`

**Why:** The breakpoint update in Task 2 changes runtime behaviour
(matchMedia query result). This is the one part of the change with
testable behaviour beyond visual review. We assert: at height ≥900
the diorama section renders pinned with `overflow-hidden` (desktop
mode); at height ≤899 the section renders the vertical fallback
container.

The test detects diorama-vs-fallback via a structural marker that
the desktop branch has but the mobile branch does not: the inner
track div has `width: 420vh` inline-styled. We assert presence on
desktop, absence on fallback.

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/case-study.spec.ts
import { expect, test } from "@playwright/test";

test.describe("@case-study fallback breakpoint", () => {
  test("desktop ≥900px height renders diorama track", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    // Desktop branch has the inner 420vh-wide track div as a child
    // of the section. Fallback branch has only the .container-page
    // children directly under the section.
    const track = section.locator(`> div[style*="width: 420vh"]`);
    await expect(track, "diorama track must mount on desktop").toHaveCount(1);
  });

  test("low-height viewport ≤899px renders vertical fallback", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    const track = section.locator(`> div[style*="width: 420vh"]`);
    await expect(track, "diorama track must NOT mount on short viewport").toHaveCount(0);
    // Fallback uses .container-page wrapper.
    const fallbackContainer = section.locator("> div.container-page");
    await expect(fallbackContainer, "fallback container must mount").toHaveCount(1);
  });

  test("narrow viewport <768px width renders vertical fallback", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    const track = section.locator(`> div[style*="width: 420vh"]`);
    await expect(track, "diorama track must NOT mount on mobile").toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run test to verify the low-height test fails**

Run: `pnpm exec playwright test tests/e2e/case-study.spec.ts --reporter=list`

Expected: First test (desktop 1920×1080) PASSES (current code already
mounts the diorama). **Second test (1366×768) FAILS** — the current
DioramaTrack only checks `max-width: 767px` so at width=1366 it
mounts the diorama, and `> div[style*="width: 420vh"]` matches with
count 1, not 0. Third test (390×844) PASSES.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/e2e/case-study.spec.ts
git commit -m "test / case-study : Add fallback-breakpoint Playwright test

- Desktop 1920x1080 expects diorama track mounted
- Low-height 1366x768 expects vertical fallback (currently fails)
- Mobile width 390x844 expects vertical fallback

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Update DioramaTrack fallback breakpoint

**Files:**
- Modify: `src/components/case-study/DioramaTrack.tsx`

- [ ] **Step 1: Replace breakpoint constant block**

In `src/components/case-study/DioramaTrack.tsx`, replace:

```tsx
const MOBILE_BREAKPOINT = 768;
const TRACK_WIDTH_VH = 420;
```

With:

```tsx
const MOBILE_MAX_WIDTH = 768;
const FALLBACK_MAX_HEIGHT = 900; // routes 1366x768, 1600x900, 1280x720 to fallback
const TRACK_WIDTH_VH = 420;
```

- [ ] **Step 2: Replace state variable + media query**

In the same file, replace:

```tsx
  const [isMobile, setIsMobile] = useState(false);
```

With:

```tsx
  const [useFallback, setUseFallback] = useState(false);
```

And replace the `useEffect` that reads the media query:

```tsx
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
```

With:

```tsx
  useEffect(() => {
    const mq = window.matchMedia(
      `(max-width: ${MOBILE_MAX_WIDTH - 1}px), (max-height: ${FALLBACK_MAX_HEIGHT - 1}px)`,
    );
    setUseFallback(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setUseFallback(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
```

- [ ] **Step 3: Update downstream `isMobile` references**

Two more references must be renamed `isMobile` → `useFallback`:

```tsx
  useEffect(() => {
    if (reducedMotion || isMobile) return;
```
→
```tsx
  useEffect(() => {
    if (reducedMotion || useFallback) return;
```

The dependency array on the same effect:

```tsx
  }, [reducedMotion, isMobile]);
```
→
```tsx
  }, [reducedMotion, useFallback]);
```

And the conditional render:

```tsx
  if (isMobile || reducedMotion) {
```
→
```tsx
  if (useFallback || reducedMotion) {
```

- [ ] **Step 4: Run Playwright tests to verify all pass**

Run: `pnpm exec playwright test tests/e2e/case-study.spec.ts --reporter=list`

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/case-study/DioramaTrack.tsx
git commit -m "fix / case-study : Route low-height viewports to vertical fallback

- Bump matchMedia from (max-width:767) to (max-width:767, max-height:899)
- Rename isMobile -> useFallback for honesty (also fires on flat
  laptop viewports like 1366x768 / 1600x900)
- Below 900px viewport-height the diorama scales to unusable card
  sizes (1vh < 9px); the existing vertical fallback is the right UX

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Token swap — HookCard

**Files:**
- Modify: `src/components/case-study/cards/HookCard.tsx`

- [ ] **Step 1: Replace the outer container className**

In `src/components/case-study/cards/HookCard.tsx`, replace:

```tsx
  return (
    <div className="flex h-full gap-4">
```

With:

```tsx
  return (
    <div className="flex h-full overflow-hidden gap-[clamp(0.625rem,1.5vh,1rem)]">
```

- [ ] **Step 2: Replace blockquote font-clamp**

Replace:

```tsx
        <blockquote className="font-display italic text-ink text-[clamp(1rem,1.5vh,1.4rem)] leading-snug tracking-[-0.01em]">
```

With:

```tsx
        <blockquote className="font-display italic text-ink text-[clamp(0.9375rem,1.5vh,1.4rem)] leading-snug tracking-[-0.01em]">
```

- [ ] **Step 3: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/cards/HookCard.tsx`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/case-study/cards/HookCard.tsx
git commit -m "fix / case-study : Make HookCard tokens vh-aware

- Outer flex gap: gap-4 -> clamp(0.625rem, 1.5vh, 1rem)
- Blockquote font min: 1rem -> 0.9375rem (15px floor)
- Add overflow-hidden so any residual spill is clipped

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Token swap — WhatCard

**Files:**
- Modify: `src/components/case-study/cards/WhatCard.tsx`

- [ ] **Step 1: Replace the outer container className**

Replace:

```tsx
    <div className="flex h-full flex-col gap-3 bg-paper-tint p-4">
```

With:

```tsx
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.5rem,1.2vh,0.75rem)] bg-paper-tint p-[clamp(0.625rem,1.6vh,1rem)]">
```

- [ ] **Step 2: Replace h3 font-clamp min**

Replace:

```tsx
      <h3 className="font-display italic text-ink text-[clamp(1.25rem,2.25vh,1.875rem)]">
```

With:

```tsx
      <h3 className="font-display italic text-ink text-[clamp(1.125rem,2.25vh,1.875rem)]">
```

- [ ] **Step 3: Replace dt font-clamp min**

Replace:

```tsx
            <dt className="font-mono text-[clamp(0.7rem,1vh,0.95rem)] uppercase tracking-[0.18em] text-ink-muted">
```

With:

```tsx
            <dt className="font-mono text-[clamp(0.625rem,1vh,0.95rem)] uppercase tracking-[0.18em] text-ink-muted">
```

- [ ] **Step 4: Replace dd font-clamp min**

Replace:

```tsx
            <dd className="text-[clamp(0.8rem,1.1vh,1.05rem)] text-ink">{f.value}</dd>
```

With:

```tsx
            <dd className="text-[clamp(0.75rem,1.1vh,1.05rem)] text-ink">{f.value}</dd>
```

- [ ] **Step 5: Replace story-paragraph font-clamp min**

Replace:

```tsx
          <p key={i} className="text-[clamp(0.8rem,1.1vh,1.05rem)] leading-snug text-ink-soft">
```

With:

```tsx
          <p key={i} className="text-[clamp(0.75rem,1.1vh,1.05rem)] leading-snug text-ink-soft">
```

- [ ] **Step 6: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/cards/WhatCard.tsx`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/case-study/cards/WhatCard.tsx
git commit -m "fix / case-study : Make WhatCard tokens vh-aware

- Container padding p-4 -> clamp(0.625rem, 1.6vh, 1rem)
- Container gap gap-3 -> clamp(0.5rem, 1.2vh, 0.75rem)
- Lower font-clamp mins by 1px each so they keep scaling on
  short viewports instead of pinning at 11.2px / 12.8px / 20px
- Add overflow-hidden

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Token swap — StackCard + StackNotebook

**Files:**
- Modify: `src/components/case-study/cards/StackCard.tsx`
- Modify: `src/components/case-study/StackNotebook.tsx`

- [ ] **Step 1: StackCard — replace outer container className**

In `src/components/case-study/cards/StackCard.tsx`, replace:

```tsx
    <div className="flex h-full flex-col gap-2">
```

With:

```tsx
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.375rem,0.9vh,0.5rem)]">
```

- [ ] **Step 2: StackNotebook — replace outer article className**

In `src/components/case-study/StackNotebook.tsx`, replace:

```tsx
    <article
      className="relative bg-paper-tint p-6 md:p-8"
```

With:

```tsx
    <article
      className="relative bg-paper-tint p-[clamp(0.875rem,2.4vh,2rem)]"
```

- [ ] **Step 3: StackNotebook — h3 font size**

Replace:

```tsx
      <h3 className="relative font-mono text-[0.75rem] uppercase tracking-[0.2em] text-ink">
```

With:

```tsx
      <h3 className="relative font-mono text-[clamp(0.625rem,1vh,0.75rem)] uppercase tracking-[0.2em] text-ink">
```

- [ ] **Step 4: StackNotebook — items div tokens**

Replace:

```tsx
      <div className="relative mt-4 font-mono text-sm leading-7 text-ink">{items}</div>
```

With:

```tsx
      <div className="relative mt-[clamp(0.5rem,1.6vh,1rem)] font-mono text-[clamp(0.75rem,1.2vh,0.875rem)] leading-[1.7] text-ink">{items}</div>
```

- [ ] **Step 5: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/cards/StackCard.tsx src/components/case-study/StackNotebook.tsx`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/case-study/cards/StackCard.tsx src/components/case-study/StackNotebook.tsx
git commit -m "fix / case-study : Make StackCard + StackNotebook tokens vh-aware

- StackCard outer gap-2 -> clamp(0.375rem, 0.9vh, 0.5rem)
- StackNotebook padding p-6 md:p-8 -> clamp(0.875rem, 2.4vh, 2rem)
- StackNotebook h3 font 0.75rem -> clamp(0.625rem, 1vh, 0.75rem)
- StackNotebook items mt-4 / text-sm / leading-7 -> all vh-clamped
- Add overflow-hidden on StackCard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Token swap — AdminHighlightCard

**Files:**
- Modify: `src/components/case-study/cards/AdminHighlightCard.tsx`

- [ ] **Step 1: Replace outer container className**

Replace:

```tsx
    <div className="flex h-full flex-col gap-3 bg-paper-tint p-4">
```

With:

```tsx
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.5rem,1.2vh,0.75rem)] bg-paper-tint p-[clamp(0.625rem,1.6vh,1rem)]">
```

- [ ] **Step 2: Replace inner content column gap**

Replace:

```tsx
      <div className="flex flex-1 flex-col gap-2 min-h-0">
```

With:

```tsx
      <div className="flex flex-1 flex-col gap-[clamp(0.375rem,0.9vh,0.5rem)] min-h-0">
```

- [ ] **Step 3: Replace kicker font-clamp min**

Replace:

```tsx
        <p className="font-mono text-[clamp(0.7rem,1vh,0.95rem)] uppercase tracking-[0.16em] text-ink inline-flex items-center gap-1.5">
```

With:

```tsx
        <p className="font-mono text-[clamp(0.625rem,1vh,0.95rem)] uppercase tracking-[0.16em] text-ink inline-flex items-center gap-1.5">
```

- [ ] **Step 4: Replace title font-clamp min**

Replace:

```tsx
        <h3 className="font-display italic text-ink text-[clamp(1.2rem,1.75vh,1.75rem)] leading-tight">
```

With:

```tsx
        <h3 className="font-display italic text-ink text-[clamp(1.0625rem,1.75vh,1.75rem)] leading-tight">
```

- [ ] **Step 5: Replace lede font-clamp min**

Replace:

```tsx
        <p className="text-[clamp(0.75rem,1.05vh,1rem)] leading-snug text-ink-soft">{lede}</p>
```

With:

```tsx
        <p className="text-[clamp(0.6875rem,1.05vh,1rem)] leading-snug text-ink-soft">{lede}</p>
```

- [ ] **Step 6: Verify feature-title font-clamp** (no edit needed)

The line `<p className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] ...">{f.title}</p>` already has the desired 10px (0.625rem) floor; no change.

- [ ] **Step 7: Replace feature body font-clamp min**

Replace:

```tsx
              <p className="mt-0.5 text-[clamp(0.7rem,1vh,0.95rem)] leading-snug text-ink-soft">
                {f.body}
              </p>
```

With:

```tsx
              <p className="mt-0.5 text-[clamp(0.625rem,1vh,0.95rem)] leading-snug text-ink-soft">
                {f.body}
              </p>
```

- [ ] **Step 8: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/cards/AdminHighlightCard.tsx`

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/case-study/cards/AdminHighlightCard.tsx
git commit -m "fix / case-study : Make AdminHighlightCard tokens vh-aware

- Container padding/gaps -> vh-clamped
- Inner content gap-2 -> vh-clamped
- Lower font-clamp mins on kicker / title / lede / feature body
- Add overflow-hidden

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Token swap — OverlayHighlightCard

**Files:**
- Modify: `src/components/case-study/cards/OverlayHighlightCard.tsx`

OverlayHighlightCard is structurally identical to AdminHighlightCard
(same className strings); apply the exact same edits as Task 6
Steps 1-7 to this file. The kicker dot is `bg-spot-amber` instead
of `bg-spot-rose` but className tokens are the same. Skip Step 6
(feature title) — no change.

- [ ] **Step 1: Outer container** (same as Task 6 Step 1)

Replace:

```tsx
    <div className="flex h-full flex-col gap-3 bg-paper-tint p-4">
```

With:

```tsx
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.5rem,1.2vh,0.75rem)] bg-paper-tint p-[clamp(0.625rem,1.6vh,1rem)]">
```

- [ ] **Step 2: Inner content column gap** (same as Task 6 Step 2)

Replace:

```tsx
      <div className="flex flex-1 flex-col gap-2 min-h-0">
```

With:

```tsx
      <div className="flex flex-1 flex-col gap-[clamp(0.375rem,0.9vh,0.5rem)] min-h-0">
```

- [ ] **Step 3: Kicker font-clamp** (same change as Task 6 Step 3)

Replace `text-[clamp(0.7rem,1vh,0.95rem)]` (in the kicker `<p>` line) with `text-[clamp(0.625rem,1vh,0.95rem)]`.

- [ ] **Step 4: Title font-clamp** (same change as Task 6 Step 4)

Replace `text-[clamp(1.2rem,1.75vh,1.75rem)]` with `text-[clamp(1.0625rem,1.75vh,1.75rem)]`.

- [ ] **Step 5: Lede font-clamp** (same change as Task 6 Step 5)

Replace `text-[clamp(0.75rem,1.05vh,1rem)]` with `text-[clamp(0.6875rem,1.05vh,1rem)]`.

- [ ] **Step 6: Feature body font-clamp** (same change as Task 6 Step 7)

Replace `text-[clamp(0.7rem,1vh,0.95rem)]` (the line with `{f.body}`) with `text-[clamp(0.625rem,1vh,0.95rem)]`.

- [ ] **Step 7: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/cards/OverlayHighlightCard.tsx`

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/case-study/cards/OverlayHighlightCard.tsx
git commit -m "fix / case-study : Make OverlayHighlightCard tokens vh-aware

- Mirror the AdminHighlightCard token rework: vh-clamped padding,
  gaps, and lowered font mins on kicker / title / lede / feature body
- Add overflow-hidden

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Token swap — PublicCard

**Files:**
- Modify: `src/components/case-study/cards/PublicCard.tsx`

- [ ] **Step 1: Replace outer container className**

Replace:

```tsx
    <div className="flex h-full flex-col gap-3">
```

With:

```tsx
    <div className="flex h-full flex-col overflow-hidden gap-[clamp(0.5rem,1.2vh,0.75rem)]">
```

- [ ] **Step 2: Replace polaroid-row gap**

Replace:

```tsx
      <div className="flex flex-1 items-start gap-2">
```

With:

```tsx
      <div className="flex flex-1 items-start gap-[clamp(0.375rem,0.9vh,0.5rem)]">
```

- [ ] **Step 3: Replace reflection-label font-clamp** (no change needed — already at 10px floor)

Verify the line:

```tsx
        <p className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] uppercase tracking-[0.18em] text-ink-muted">
```

— leave as-is.

- [ ] **Step 4: Replace reflection-body font-clamp min**

Replace:

```tsx
        <p className="mt-1 font-display italic text-ink text-[clamp(0.95rem,1.4vh,1.4rem)] leading-snug">
```

With:

```tsx
        <p className="mt-1 font-display italic text-ink text-[clamp(0.875rem,1.4vh,1.4rem)] leading-snug">
```

- [ ] **Step 5: Replace footer-link font-clamp min**

Replace:

```tsx
        className="inline-flex items-baseline gap-2 border-b-2 border-ink font-display italic text-ink text-[clamp(1.1rem,1.5vh,1.5rem)] leading-none w-fit hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint"
```

With:

```tsx
        className="inline-flex items-baseline gap-2 border-b-2 border-ink font-display italic text-ink text-[clamp(1rem,1.5vh,1.5rem)] leading-none w-fit hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint"
```

- [ ] **Step 6: Footer label font-clamp** (no change needed — already at 10px floor)

The line `<span className="font-mono text-[clamp(0.625rem,0.9vh,0.875rem)] ...">` already has the desired floor; leave as-is.

- [ ] **Step 7: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/cards/PublicCard.tsx`

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/case-study/cards/PublicCard.tsx
git commit -m "fix / case-study : Make PublicCard tokens vh-aware

- Outer gap-3 -> vh-clamped; inner polaroid-row gap-2 -> vh-clamped
- Lower font-clamp mins on reflection body and footer link by 1px
- Add overflow-hidden

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Token swap — Polaroid

**Files:**
- Modify: `src/components/case-study/Polaroid.tsx`

Pre-flight already verified Polaroid is exclusively used by case-
study cards (no About-Portrait consumer). Direct edit, no compat
shim needed.

- [ ] **Step 1: Replace `<figure>` padding className**

Replace:

```tsx
    <figure
      className={`plate-corners relative inline-block bg-paper-tint p-3 md:p-4 ${className ?? ""}`}
```

With:

```tsx
    <figure
      className={`plate-corners relative inline-block bg-paper-tint p-[clamp(0.5rem,1.2vh,1rem)] ${className ?? ""}`}
```

- [ ] **Step 2: Replace datestamp font size**

Replace:

```tsx
        <span
          aria-hidden="true"
          className="absolute top-1 right-2 font-mono text-[0.55rem] tracking-[0.16em] text-ink-muted"
        >
```

With:

```tsx
        <span
          aria-hidden="true"
          className="absolute top-1 right-2 font-mono text-[clamp(0.5rem,0.65vh,0.6rem)] tracking-[0.16em] text-ink-muted"
        >
```

- [ ] **Step 3: Replace caption font size**

Replace:

```tsx
        <figcaption className="mt-2 font-mono text-[0.625rem] tracking-[0.18em] text-ink-muted uppercase md:text-[0.7rem]">
```

With:

```tsx
        <figcaption className="mt-2 font-mono text-[clamp(0.5625rem,0.75vh,0.7rem)] tracking-[0.18em] text-ink-muted uppercase">
```

(Note: `md:text-[0.7rem]` is dropped because the clamp now does the
job at all breakpoints.)

- [ ] **Step 4: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/case-study/Polaroid.tsx`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/case-study/Polaroid.tsx
git commit -m "fix / case-study : Make Polaroid tokens vh-aware

- Outer figure padding p-3 md:p-4 -> clamp(0.5rem, 1.2vh, 1rem)
- Datestamp font 0.55rem -> clamp(0.5rem, 0.65vh, 0.6rem)
- Caption font 0.625rem md:0.7rem -> clamp(0.5625rem, 0.75vh, 0.7rem)
- Polaroid is case-study-exclusive; About uses ui/Portrait, no
  cross-section regression risk

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Run full Playwright test suite

**Files:** none (verification only)

- [ ] **Step 1: Run E2E suite**

Run: `pnpm test`

Expected: all tests pass, including the new
`tests/e2e/case-study.spec.ts` from Task 1. If the visual baseline
test (`tests/visual/baseline.spec.ts`) flags pixel diffs in the
case-study area, that is **expected** — token sizing changed at
1280×800 viewport. Review the diffs visually to confirm they look
correct (not regressed) and update the snapshot:

`pnpm test:visual --update-snapshots`

Then commit the updated snapshot.

- [ ] **Step 2: Commit snapshot update if needed**

```bash
git add tests/visual/baseline.spec.ts-snapshots/
git commit -m "test / case-study : Update visual baseline after token rework

- New token clamps render slightly differently at 1280x800; reviewed
  visually and confirmed intent

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

If no snapshot diff, skip this commit.

---

### Task 11: Visual validation matrix

**Files:** none (manual verification)

Run `pnpm dev` and walk the matrix below in a real browser. Use
DevTools "Responsive" mode to set viewport sizes precisely (or
resize the OS window for native rendering). For each row, scroll
to the Case Study section and verify the criteria.

**Note:** Manuel runs this on his work setup (2560×1440 +
1920×1200) and on his home setup (3840×1600). Other resolutions
verified via DevTools.

- [ ] **Step 1: 3840×1600 (Manuel home) — Diorama**

Acceptance: must look identical to the pre-fix screenshot Manuel
shared in the brainstorm session. Cards roomy, no overflow.

- [ ] **Step 2: 3840×2160 (4K UHD) — Diorama**

Acceptance: cards even roomier than 1600p, fonts capped by max-clamps,
no regressions.

- [ ] **Step 3: 3440×1440 (UWQHD ultrawide) — Diorama**

Acceptance: same content sizing as 2560×1440 (height equal); pin scroll
length is short — diorama mostly visible at start.

- [ ] **Step 4: 2560×1440 (QHD, work monitor 1) — Diorama**

Acceptance: **PRIMARY TARGET.** No content overflows card boundaries.
All 6 cards readable. Admin and Overlay highlight cards' kicker /
title / lede / 4-feature lists all fit within their boxes.

- [ ] **Step 5: 1920×1200 (16:10, work monitor 2) — Diorama**

Acceptance: **PRIMARY TARGET.** Same as Step 4. No spillage.

- [ ] **Step 6: 1920×1080 (FHD) — Diorama**

Acceptance: floor target. Content readable, fonts not below 10px.

- [ ] **Step 7: 1600×900 — Fallback**

Acceptance: vertical stack renders, no diorama mounted. Verify by
checking DOM: section#case-study should have a `.container-page`
child, not a `style="width: 420vh"` track.

- [ ] **Step 8: 1366×768 (laptop) — Fallback**

Acceptance: same as Step 7.

- [ ] **Step 9: 1280×720 — Fallback**

Acceptance: same as Step 7.

- [ ] **Step 10: 390×844 (iPhone) — Fallback**

Acceptance: existing mobile fallback continues to work, no regression.

- [ ] **Step 11: Spot-check About-Portrait at 1920×1080**

Even though Polaroid is no longer in About, sanity-check the About
section's Portrait component renders unchanged. Should be untouched
by this branch.

If any row fails: stop, diagnose, and fix before proceeding to
Task 12. Failure modes likely confined to a token mis-tuning →
adjust the relevant clamp range in the appropriate card file and
re-run the matrix.

---

### Task 12: CLAUDE.md addendum

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Append to the Phase 12 deviations section**

Find the `## Phase 12 deviations` heading and the `### Phase 12 — Case Study diorama redesign` subsection. After the last bullet of that block (the one ending "...were stripped in the post-PR cleanup pass."), append a new sub-block:

```markdown
### Phase 12 — Cross-resolution responsive fix (2026-05-06)

- **Card boxes scale with vh; card content now scales with vh too.**
  The original Phase 12 diorama scaled card *boxes* in vh but kept
  paddings, gaps, and font-clamp mins as fixed-px (e.g. `p-4`,
  `clamp(0.7rem, 1vh, 0.95rem)`). On viewports below ~1440p height
  the font-clamp floors kicked in and content overflowed the
  shrinking boxes. Fix: replace fixed paddings/gaps with
  vh-clamped equivalents and lower font-clamp mins (≥10px floor
  for small mono labels, ≥11-15px for body/heads). Sub-pixel
  decoration spacing (`space-y-1`, `mt-0.5`, `pl-2`) stays fixed
  — vh-scaling 4-px values is noise.
- **Mobile-fallback breakpoint is height-aware.** Old:
  `(max-width: 767px)`. New: `(max-width: 767px), (max-height: 899px)`.
  Catches 1366×768, 1600×900, 1280×720 laptop-class viewports
  where the diorama would scale to 1vh < 9px (unusable). State
  variable renamed `isMobile` → `useFallback`.
- **`overflow-hidden` belt-and-suspenders on each card.** If any
  residual content overflows on an edge case, it gets clipped
  inside its own card boundary instead of spilling into siblings.
- **Polaroid is case-study-exclusive.** About-Portrait uses a
  different `Portrait` component (`src/components/ui/Portrait.tsx`).
  Polaroid token changes have no cross-section regression risk.
- Spec: `docs/superpowers/specs/2026-05-06-case-study-responsive-fix-design.md`.
  Plan: `docs/superpowers/plans/2026-05-06-case-study-responsive-fix.md`.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs / case-study-responsive : Document Phase 12 cross-resolution fix

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 13: Final CI gate + push

**Files:** none

- [ ] **Step 1: Run full local CI**

Run: `pnpm ci:local`

Expected: all stages (lint + typecheck + build + test) pass.

If lint or typecheck fail, fix in-place and amend the most recent
commit (or create a new fix commit if the failure is in an earlier
file — easier to bisect). Do NOT use `--no-verify`.

- [ ] **Step 2: Push branch + open PR (after Manuel reviews)**

When all matrix rows + CI pass, hand off to Manuel for review by
pushing the branch:

```bash
git push -u origin fix/case-study-responsive
```

PR template: title `fix(case-study): cross-resolution responsive
sizing`, body referencing the spec + plan paths and listing the
validation matrix table from §5 of the spec with checkmarks.

---

## Self-review checklist (post-write)

- [x] **Spec coverage:** All 8 spec sections mapped to tasks.
  - §3 Approach steps 1-4 → Tasks 2-9 + 11 (overflow-hidden) — done.
  - §4.1 Cards token swaps → Tasks 3-8.
  - §4.2 Polaroid → Task 9.
  - §4.3 DioramaTrack breakpoint → Task 2.
  - §5 Validation matrix → Task 11.
  - §6 Risks (About-Portrait) → resolved by pre-flight verification.
  - §8 Done definition → Tasks 10, 11, 12, 13.
- [x] **Placeholder scan:** No "TBD" / "TODO" / "implement later".
  Code blocks contain full edits.
- [x] **Type consistency:** State variable rename `isMobile` →
  `useFallback` applied at 4 call sites in DioramaTrack.tsx
  (Task 2 steps 2-3). No other type-name drift.
- [x] **Spec amendment for §6 risk:** documented as resolved in
  the plan's Pre-flight section (no spec edit needed).
