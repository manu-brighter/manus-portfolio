// tests/e2e/locale-switch-position.spec.ts
import { expect, type Page, test } from "@playwright/test";

/**
 * A locale switch keeps the visitor's place: an explicit URL hash is
 * carried over, and on home without one the section in view is handed
 * to ScrollToOnLoad. The option links themselves stay static,
 * hash-free hrefs (crawlable); position is composed at click time.
 */

async function switchToEnglish(page: Page) {
  await page.getByRole("button", { name: /deutsch/i }).click();
  const enLink = page.getByRole("link", { name: "English", exact: true });
  await expect(enLink).toBeVisible();
  await expect(enLink, "option href stays static").toHaveAttribute("href", "/en/");
  await enLink.click();
}

test.describe("locale switch keeps position", () => {
  test.beforeEach(({ browserName }) => {
    test.slow(browserName === "webkit", "Software-rendered WebGL starves the main thread in CI");
  });

  test("an explicit hash survives the switch", async ({ page }) => {
    await page.goto("/de/#work");
    await expect(page.locator("#work")).toBeInViewport({ ratio: 0.1, timeout: 10_000 });
    await switchToEnglish(page);
    await page.waitForURL(/\/en\/#work$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#work")).toBeInViewport({ ratio: 0.1, timeout: 10_000 });
  });

  test("the home section in view survives the switch without a hash", async ({ page }) => {
    await page.goto("/de/");
    // The case-study pin adds scroll extent a frame after mount; settle
    // it before measuring where Photography sits.
    await expect(page.locator("#case-study .pin-spacer")).toHaveCount(1);
    // Lenis can still be easing towards an earlier target after an
    // instant jump, so re-apply the jump until the section top settles
    // at the viewport top (where the 30% "in view" line falls inside it).
    const photography = page.locator("#photography");
    await expect
      .poll(
        async () => {
          await photography.evaluate((el) => {
            el.scrollIntoView({ behavior: "instant", block: "start" });
          });
          await page.waitForTimeout(400);
          return photography.evaluate((el) => Math.abs(el.getBoundingClientRect().top));
        },
        { timeout: 10_000 },
      )
      .toBeLessThan(40);

    await switchToEnglish(page);
    await page.waitForURL(/\/en\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#photography")).toBeInViewport({ ratio: 0.1, timeout: 10_000 });
  });
});
