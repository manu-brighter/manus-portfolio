// tests/e2e/reduced-motion-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-Rework Phase 8.2 — Reduced-motion verification.
 *
 * Spec §6.5: under `prefers-reduced-motion: reduce` all three Mobile sim
 * spots (Hero, Photography swiper, Case-Study scrolly) must skip the
 * WebGL pipeline. The sections themselves still render — just without
 * the orchestrator-backed canvases.
 *
 * Each Mobile sim component (HeroMobileSim, PhotoSwiperSim,
 * CaseStudyMobileSim) early-returns null when useReducedMotion() is
 * true. This spec asserts that contract holds at the DOM level.
 */

test.use({
  ...devices["Pixel 5"],
  contextOptions: { reducedMotion: "reduce" },
});

test.describe("Mobile reduced-motion", () => {
  test("Hero sim canvas absent under prefers-reduced-motion", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    const heroCanvas = page.locator('canvas[data-testid="hero-mobile-sim"]');
    await expect(heroCanvas).toHaveCount(0);
  });

  test("Photography swiper renders without sim canvas", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    // Swiper UI still works (5 slides, dots, prev/next) — sim canvas alone
    // is suppressed.
    await expect(page.locator('[data-testid="photo-slide"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="photo-dot"]')).toHaveCount(5);
    await expect(page.locator('canvas[data-testid="photo-swiper-sim"]')).toHaveCount(0);
  });

  test("Case-Study scrolly renders 4 stations without sim canvas", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid^="cs-station-"]')).toHaveCount(4);
    await expect(page.locator('canvas[data-testid="cs-mobile-sim"]')).toHaveCount(0);
  });
});
