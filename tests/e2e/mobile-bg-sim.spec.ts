// tests/e2e/mobile-bg-sim.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-Rework — full-page background fluid sim.
 *
 * On coarse-pointer devices the global SceneProvider mounts ONE fixed,
 * full-viewport MobileBackgroundSim behind all content. This spec verifies:
 *   - the page-global canvas mounts with data-testid="mobile-bg-sim"
 *   - no <video> fallback mounts (the AmbientVideo path is retired;
 *     this is the regression net against reintroducing one)
 *   - a tap doesn't crash the orchestrator (touch read at document level)
 */

test.use({ ...devices["Pixel 5"] });

test.describe("Mobile background sim", () => {
  test("full-page background canvas mounts", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    const sim = page.locator('canvas[data-testid="mobile-bg-sim"]');
    // Gated behind the loader + canvasMounted defer, so allow generous time.
    await expect(sim).toBeVisible({ timeout: 12000 });
  });

  test("no <video> background fallback mounts (AmbientVideo retired)", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    // All coarse-pointer devices run the live MobileBackgroundSim; the
    // pre-recorded <video> loop was deleted in the mobile wow-pass.
    await expect(page.locator("video")).toHaveCount(0);
  });

  test("tap doesn't crash the orchestrator", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('canvas[data-testid="mobile-bg-sim"]')).toBeVisible({
      timeout: 12000,
    });

    // The canvas is pointer-events:none + fixed; tap input is read at the
    // document level. Tap a low-content spot below the nav.
    await page.touchscreen.tap(24, 320);
    await page.waitForTimeout(400);

    const fatal = errors.filter((e) => !/ResizeObserver loop/i.test(e));
    expect(fatal, `Page errors after tap: ${fatal.join(" | ")}`).toEqual([]);
  });
});
