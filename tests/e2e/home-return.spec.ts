// tests/e2e/home-return.spec.ts
import { expect, test } from "@playwright/test";

/**
 * The wordmark is the site's "return to home" control and must work
 * from anywhere, including from home itself.
 *
 * As a bare <Link href="/"> it dead-ended on the home page: the router
 * treats it as a same-route navigation, so a user scrolled deep into
 * the page clicked it and nothing moved at all.
 */

test.describe("wordmark returns home", () => {
  test("from a sub-route it navigates to home", async ({ page }) => {
    await page.goto("/de/cv/");
    await expect(page.locator('[data-page="cv"]')).toBeVisible();

    await page.locator('nav a[href="/de/"]').click();
    await expect(page).toHaveURL(/\/de\/?$/);
    await expect(page.locator("#about")).toBeAttached();
  });

  test("from home itself it scrolls back to the top", async ({ page }) => {
    await page.goto("/de/");
    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThan(500);

    await page.locator('nav a[href="/de/"]').click();
    // Lenis animates, so poll rather than sampling once.
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 })
      .toBeLessThan(20);
  });
});
