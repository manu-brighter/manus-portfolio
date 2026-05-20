// tests/e2e/hero-sim-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-Rework Phase 3 — Hero scroll-attached sim.
 *
 * On Mobile (coarse + viewport < 768) the global SceneProvider sim is
 * suppressed and HeroMobileSim mounts a per-section canvas inside the
 * Hero section. This spec verifies:
 *   - the Mobile canvas mounts with data-testid="hero-mobile-sim"
 *   - the global SceneProvider canvas does NOT mount on Mobile
 *   - touch input doesn't crash the orchestrator
 */

test.use({ ...devices["Pixel 5"] });

test.describe("Hero mobile sim", () => {
  test("scroll-attached canvas mounts inside the Hero section", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    const heroCanvas = page.locator('section#hero canvas[data-testid="hero-mobile-sim"]');
    await expect(heroCanvas).toBeVisible();
  });

  test("AmbientVideo NOT mounted on Mobile-phone layout", async ({ page }) => {
    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    // SceneProvider routes coarse-pointer Mobile-phone (coarse + < 768)
    // to `null` instead of <AmbientVideo />. Pre-Mobile-Rework this
    // would have rendered a <video> element with autoplay loop. Mobile-
    // Rework spec §3.2 suppresses it so per-section sims own the
    // visual surface.
    const ambientVideo = page.locator("video");
    await expect(ambientVideo).toHaveCount(0);
  });

  test("touch on Hero canvas doesn't crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/de/");
    await page.waitForLoadState("networkidle");

    const heroCanvas = page.locator('canvas[data-testid="hero-mobile-sim"]');
    await expect(heroCanvas).toBeVisible();

    // Use touchscreen API directly rather than locator.tap — canvas
    // sits at z-index -10 behind text content, so .tap() times out
    // waiting for actionability. Coordinates are inside the canvas
    // bounding box but offset to avoid the H1 region.
    const box = await heroCanvas.boundingBox();
    if (!box) throw new Error("hero canvas not measurable");
    await page.touchscreen.tap(box.x + 30, box.y + 30);
    await page.waitForTimeout(400);

    const fatal = errors.filter((e) => !/ResizeObserver loop/i.test(e));
    expect(fatal, `Page errors after Hero touch: ${fatal.join(" | ")}`).toEqual([]);
  });
});
