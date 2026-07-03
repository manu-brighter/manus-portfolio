// tests/e2e/reduced-motion-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile — Reduced-motion verification.
 *
 * Under `prefers-reduced-motion: reduce` the Mobile sim must skip the
 * WebGL pipeline; the sections still render, just without the
 * orchestrator-backed canvas. The full-page MobileBackgroundSim never
 * mounts (SceneProvider routes reduced-motion to StaticFallback), and
 * the Photography stack / Case-Study stations are canvas-free by
 * design — so everything renders with no canvas under reduced motion.
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

  test("Photography stack renders all photos without sim canvas", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    // FadeIn renders children statically under reduced motion, so all
    // 5 photos are present and visible without any animation plumbing.
    await expect(page.locator('[data-testid="photo-slide"]')).toHaveCount(5);
    await expect(page.locator("#photography canvas")).toHaveCount(0);
  });

  test("Case-Study renders 6 stations without any sim canvas", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    // 6 stations (hook · what · stack · admin · overlay · public) —
    // see case-study-stations-mobile.spec.ts.
    await expect(page.locator('[data-testid^="cs-station-"]')).toHaveCount(6);
    await expect(page.locator("#case-study canvas")).toHaveCount(0);
  });
});
