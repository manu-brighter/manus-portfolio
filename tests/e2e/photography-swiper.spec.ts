// tests/e2e/photography-swiper.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-Rework Phase 4 — Photography horizontal swiper.
 *
 * On Mobile (coarse + viewport < 768) the 5-slot editorial Photography
 * collapses into a horizontal swiper with pagination dots + prev/next
 * buttons + aria-live counter. This spec verifies the structural and
 * a11y contract — that the swiper renders, controls work, slide changes
 * are announced.
 */

test.use({ ...devices["Pixel 5"] });

test.describe("Photography mobile swiper", () => {
  test("renders 5 slides + 5 pagination dots", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const slides = page.locator('[data-testid="photo-slide"]');
    await expect(slides).toHaveCount(5);

    const dots = page.locator('[data-testid="photo-dot"]');
    await expect(dots).toHaveCount(5);
  });

  test("prev/next buttons exist and start state has prev disabled", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const prev = page.locator('[data-testid="photo-prev"]');
    const next = page.locator('[data-testid="photo-next"]');

    await expect(prev).toBeVisible();
    await expect(next).toBeVisible();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
  });

  test("pagination dot click advances index + aria-current updates", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const dots = page.locator('[data-testid="photo-dot"]');

    // Initially dot 0 is current
    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");

    // Click dot 2
    await dots.nth(2).click();

    // Wait for scroll-snap + state to settle
    await page.waitForTimeout(600);

    await expect(dots.nth(2)).toHaveAttribute("aria-current", "true");
  });

  test("aria-live region announces slide change", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const live = page.locator('[data-testid="photo-live-region"]');
    await page.locator('[data-testid="photo-next"]').click();
    await page.waitForTimeout(400);
    // DE locale: "Bild 2 von 5"
    await expect(live).toContainText(/2.*5/);
  });

  test("PhotoSwiperSim canvas mounts behind the swiper", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const simCanvas = page.locator('canvas[data-testid="photo-swiper-sim"]');
    await expect(simCanvas).toBeVisible();
  });
});
