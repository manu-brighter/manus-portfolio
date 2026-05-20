import { expect, type Page, test } from "@playwright/test";

/**
 * Visual baseline — safety net for unintended Desktop layout regressions.
 *
 * Captured with `<canvas>` hidden so the WebGL FluidSim and per-section
 * mini-sim canvases don't introduce per-frame pixel noise into snapshots.
 * `prefers-reduced-motion: reduce` only freezes CSS animations; WebGL is
 * unaffected, so we additionally suppress canvas paints via CSS.
 *
 * The canvases sit at z-index -1 behind page content (paper background),
 * so hiding them leaves the visual hierarchy intact for layout-regression
 * detection — typography, spacing, color, content, decorative SVG all
 * still snapshot. The trade-off: we don't catch regressions in the sim
 * rendering itself, but those are tested elsewhere (e2e smoke + manual
 * dev-server inspection).
 *
 * Playwright auto-suffixes screenshot files with the runner platform
 * (e.g. `home-de-desktop-linux.png`, `home-de-desktop-win32.png`), so
 * local + CI baselines coexist without conflicts.
 *
 * Run on demand:
 *   pnpm test:visual                 # diff vs. current baselines
 *   pnpm test:visual --update-snapshots
 */
async function hideCanvases(page: Page) {
  await page.addStyleTag({
    // canvas — global FluidSim + per-section mini-sim canvases
    // video    — coarse-pointer AmbientVideo fallback on Mobile
    // hero-skill-aura — conic-gradient halo, sub-pixel-drifts even under reducedMotion
    content: "canvas, video, .hero-skill-aura { visibility: hidden !important; }",
  });
  // Give the browser a frame to process the styleTag insertion + any
  // remaining layout/composite work before the screenshot stability poll.
  await page.waitForTimeout(500);
}

test.describe("@visual phase 2 baseline", () => {
  // Desktop-chromium-project only. Webkit's WebGL stack produces too much
  // per-frame noise even with canvas-hidden + reducedMotion; the
  // mobile-chrome project runs the separate Mobile-viewport describe below.
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructuring for the fixtures arg
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name !== "chromium") test.skip();
  });

  test.use({
    viewport: { width: 1280, height: 800 },
    contextOptions: { reducedMotion: "reduce" },
  });

  test("home /de/ — desktop 1280x800", async ({ page }) => {
    await page.goto("/de/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    await hideCanvases(page);
    await expect(page).toHaveScreenshot("home-de-desktop.png", {
      fullPage: true,
      animations: "disabled",
      // Allowance for sub-pixel anti-aliasing drift on the conic-gradient
      // hero-skill-aura halo. Layout regressions register at >> 5000px.
      // Pragmatic budget — sub-pixel AA drift between consecutive captures
      // exceeded 25k px in observed runs. Real layout regressions register
      // at 100k+ pixels. 50000px is ~0.2% of home image area: lax enough to
      // be deterministic, strict enough to catch genuine Desktop shifts
      // during Mobile-Rework work.
      maxDiffPixels: 50000,
    });
  });

  test("styleguide /de/styleguide — desktop 1280x800", async ({ page }) => {
    await page.goto("/de/styleguide/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    await hideCanvases(page);
    await expect(page).toHaveScreenshot("styleguide-de-desktop.png", {
      fullPage: true,
      animations: "disabled",
      // Pragmatic budget — sub-pixel AA drift between consecutive captures
      // exceeded 25k px in observed runs. Real layout regressions register
      // at 100k+ pixels. 50000px is ~0.2% of home image area: lax enough to
      // be deterministic, strict enough to catch genuine Desktop shifts
      // during Mobile-Rework work.
      maxDiffPixels: 50000,
    });
  });
});

// Mobile-viewport baseline is intentionally NOT defined yet. During the
// active Mobile-Rework sprint the Mobile layout is deliberately shifting
// (Phase 6 About compression already cut ~2000px of page height, Phase
// 3-5 will add per-section sims, Photography Swiper, Case-Study Scrolly).
// A pre-rework Mobile baseline would noise the safety-net with frequent
// "expected change" failures.
//
// Phase 9 Task 9.2 captures the locked-in post-rework Mobile baseline as
// the final step before the PR. Add the @visual phase 2 baseline mobile
// describe block at that point.
