// tests/e2e/case-study-lightbox.spec.ts
import { expect, test } from "@playwright/test";

test.describe("@case-study lightbox", () => {
  // Lightbox lives inside the desktop diorama branch only.
  // 1920x1080 satisfies the height-aware breakpoint added in
  // fix/case-study-responsive (height >= 900).
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("clicking the admin polaroid opens the lightbox", async ({ page }) => {
    await page.goto("/de/");
    const adminPolaroid = page
      .locator("article", { has: page.getByText(/Admin-Dashboard|Highlight 01|Sichtbarstes/) })
      .locator("button[aria-haspopup='dialog']")
      .first();
    await adminPolaroid.scrollIntoViewIfNeeded();
    await adminPolaroid.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    // Counter should read "n / 6"
    await expect(dialog.locator("[data-testid='lightbox-counter']")).toHaveText(/\/\s*6/);
  });

  test("ESC closes the open lightbox", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("right-arrow advances to the next image (with wrap-around)", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const counter = page.locator("dialog[open] [data-testid='lightbox-counter']");
    await expect(counter).toHaveText(/^\s*1\s*\/\s*6\s*$/);
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText(/^\s*2\s*\/\s*6\s*$/);
  });

  test("backdrop click closes the lightbox", async ({ page }) => {
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    // Click far from the image — top-left corner of the dialog should be backdrop.
    await dialog.click({ position: { x: 5, y: 5 } });
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("reduced-motion: no FLIP transform applied", async ({ page, browserName: _ }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/de/");
    const firstClickable = page
      .locator("section#case-study button[aria-haspopup='dialog']")
      .first();
    await firstClickable.scrollIntoViewIfNeeded();
    await firstClickable.click();
    const img = page.locator("dialog[open] img").first();
    await expect(img).toBeVisible();
    // After 250ms (longer than the reduced-motion fade), the transform must
    // still be none (no scale/translate left over from FLIP).
    await page.waitForTimeout(250);
    const transform = await img.evaluate((el) => getComputedStyle(el).transform);
    expect(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
  });
});
