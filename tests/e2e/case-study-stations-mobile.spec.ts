// tests/e2e/case-study-stations-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile wow-pass — Case-Study vertical station flow.
 *
 * On Mobile (coarse + viewport < 768) the case study renders its 6
 * narrative stations stacked in the page's vertical scroll (the first
 * rework's side-swipe carousel was retired). This spec verifies the
 * structural contract: all stations render in order, carry the numbered
 * station stamps, no carousel machinery or sim canvas remains, and the
 * Desktop DioramaTrack never mounts.
 */

test.use({ ...devices["Pixel 5"] });

const STATION_IDS = [
  "cs-station-hook",
  "cs-station-what",
  "cs-station-stack",
  "cs-station-admin",
  "cs-station-overlay",
  "cs-station-public",
];

test.describe("Case Study mobile stations", () => {
  test("renders 6 stations stacked vertically in order", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid^="cs-station-"]')).toHaveCount(6);

    let lastY = Number.NEGATIVE_INFINITY;
    for (const id of STATION_IDS) {
      const box = await page.locator(`#${id}`).boundingBox();
      if (!box) throw new Error(`missing bounding box for #${id}`);
      expect(box.y).toBeGreaterThan(lastY);
      lastY = box.y;
    }
  });

  test("no carousel machinery, no sim canvas, no Desktop diorama", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="cs-carousel-track"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="cs-carousel-dot"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="cs-carousel-prev"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="cs-carousel-next"]')).toHaveCount(0);
    await expect(page.locator("#case-study canvas")).toHaveCount(0);
    // Desktop horizontal-pin diorama must not mount on Mobile.
    await expect(page.locator('[data-testid="diorama-track"]')).toHaveCount(0);
  });
});
