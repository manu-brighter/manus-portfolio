// tests/e2e/cv-links.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Entry and exit points of the CV proof.
 *
 *   - The hero carries one stamp-styled link to /cv.
 *   - The CV toolbar carries a Contact link back to the home page's
 *     contact section. It is screen chrome: hidden in print, so the
 *     two-page sheet budget (cv-print.spec.ts) never sees it.
 */

test.describe("CV entry and exit links", () => {
  test("hero links to the CV", async ({ page }) => {
    await page.goto("/de/");
    const link = page.locator("#hero").getByRole("link", { name: "CV ansehen" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /^\/de\/cv\/?$/);
  });

  test("CV toolbar Contact link lands on the contact section", async ({ page }) => {
    await page.goto("/de/cv/");
    const toolbar = page.locator("[data-cv-toolbar]");
    const contact = toolbar.getByRole("link", { name: /contact/i });
    await expect(contact).toBeVisible();
    // Crawlable href; the click itself goes through ScrollToOnLoad.
    await expect(contact).toHaveAttribute("href", "/de/#contact");
    await expect(contact).toHaveAttribute("lang", "en");

    await contact.click();
    await expect(page).toHaveURL(/\/de\/$/);
    // ScrollToOnLoad jumps once the case-study layout is published.
    // Contact sits near the page end, so it may not reach the very top;
    // being on screen is the observable outcome.
    await expect(page.locator("#contact")).toBeInViewport({ ratio: 0.3, timeout: 10_000 });
  });

  test("CV toolbar links stay off the printed sheet", async ({ page }) => {
    await page.goto("/de/cv/");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("[data-cv-toolbar]")).toBeHidden();
  });
});
