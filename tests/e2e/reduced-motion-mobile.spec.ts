// tests/e2e/reduced-motion-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-Rework Phase 8.2 — Reduced-motion verification.
 *
 * Under `prefers-reduced-motion: reduce` the Mobile sim spots must skip the
 * WebGL pipeline; the sections still render, just without the orchestrator-
 * backed canvases. The full-page MobileBackgroundSim never mounts (SceneProvider
 * routes reduced-motion to StaticFallback), the Photography swiper suppresses
 * its PhotoSwiperSim, and the Case-Study carousel has no sim at all (removed) —
 * so all three render with no canvas under reduced motion.
 */

test.use({
  ...devices["Pixel 5"],
  contextOptions: { reducedMotion: "reduce" },
});

test.describe("Mobile reduced-motion", () => {
  test("background sim canvas absent under prefers-reduced-motion", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    const sim = page.locator('canvas[data-testid="mobile-bg-sim"]');
    await expect(sim).toHaveCount(0);
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

  test("Case-Study carousel renders 6 stations without any sim canvas", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    // 6 stations after the dense-slide split (hook · what · stack · admin ·
    // overlay · public) — see case-study-carousel-mobile.spec.ts.
    await expect(page.locator('[data-testid^="cs-station-"]')).toHaveCount(6);
    await expect(page.locator('[data-testid="cs-carousel-dot"]')).toHaveCount(6);
    // The per-station sim was removed entirely — no canvas in the carousel.
    await expect(page.locator("#case-study canvas")).toHaveCount(0);
  });
});
