// tests/e2e/mobile-nav.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * F-testing-coverage-2: Mobile hamburger menu E2E.
 *
 * Scoped to the `mobile-chrome` Playwright project (Pixel 5, 393×851).
 * Tests: hamburger visibility at mobile width, open/close toggle,
 * Escape-to-close, and `inert` attribute on <main> while panel is open.
 *
 * Run `pnpm test --project=mobile-chrome` to target only this project.
 */

test.use({ ...devices["Pixel 5"] });

test.describe("mobile hamburger nav", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/");
  });

  test("hamburger button is visible at mobile viewport", async ({ page }) => {
    // The hamburger lives inside NavMobileMenu which is md:hidden on desktop.
    // On Pixel 5 (393px) it should be visible.
    const hamburger = page.getByRole("button", {
      name: /menü öffnen|menü schließen|open menu|close menu/i,
    });
    await expect(hamburger).toBeVisible();
  });

  test("click opens panel, aria-expanded becomes true", async ({ page }) => {
    const hamburger = page.getByRole("button", { name: /menü öffnen|open menu/i });
    await expect(hamburger).toBeVisible();

    await hamburger.click();

    // aria-expanded is a boolean attribute; Playwright returns it as a string.
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    // The panel should be visible.
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
  });

  test("Escape closes panel, aria-expanded becomes false", async ({ page }) => {
    const hamburger = page.getByRole("button", { name: /menü öffnen|open menu/i });
    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");

    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
  });

  test("<main> has inert while panel is open, inert removed on close", async ({ page }) => {
    const hamburger = page.getByRole("button", { name: /menü öffnen|open menu/i });

    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");

    // <main id="main"> should receive `inert` while the mobile menu is open.
    const main = page.locator("#main");
    const inertOpen = await main.evaluate((el) => el.hasAttribute("inert"));
    expect(inertOpen).toBe(true);

    // Close the panel.
    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");

    const inertClosed = await main.evaluate((el) => el.hasAttribute("inert"));
    expect(inertClosed).toBe(false);
  });
});
