// tests/e2e/photography-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile wow-pass — Photography vertical editorial stack.
 *
 * On Mobile (coarse + viewport < 768) the 5-slot editorial Photography
 * renders as a vertical stack (the first rework's horizontal swiper was
 * retired). This spec verifies the structural contract: 5 photo figures
 * with real alt text flow in the document, and no carousel machinery
 * (dots, prev/next, aria-roledescription) remains.
 */

test.use({ ...devices["Pixel 5"] });

test.describe("Photography mobile stack", () => {
  test("renders 5 vertical photo figures with alt text", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const slides = page.locator('[data-testid="photo-slide"]');
    await expect(slides).toHaveCount(5);

    // Every photo carries a non-empty alt (a11y contract).
    const images = page.locator('[data-testid="photo-slide"] img');
    await expect(images).toHaveCount(5);
    for (const img of await images.all()) {
      expect((await img.getAttribute("alt"))?.trim()).toBeTruthy();
    }
  });

  test("photos stack vertically (each figure below the previous)", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    const slides = page.locator('[data-testid="photo-slide"]');
    const boxes = [];
    for (const slide of await slides.all()) {
      const box = await slide.boundingBox();
      if (box) boxes.push(box);
    }
    expect(boxes.length).toBe(5);
    for (let i = 1; i < boxes.length; i++) {
      const prev = boxes[i - 1];
      const curr = boxes[i];
      if (!prev || !curr) throw new Error("missing bounding box");
      expect(curr.y).toBeGreaterThan(prev.y);
    }
  });

  test("no carousel machinery remains", async ({ page }) => {
    await page.goto("/de/#photography");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="photo-dot"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="photo-prev"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="photo-next"]')).toHaveCount(0);
    await expect(page.locator('#photography [aria-roledescription="carousel"]')).toHaveCount(0);
    // Per-section sim canvas retired — the full-page bg sim owns ambience.
    await expect(page.locator("#photography canvas")).toHaveCount(0);
  });
});
