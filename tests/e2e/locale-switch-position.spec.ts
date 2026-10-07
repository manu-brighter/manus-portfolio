// tests/e2e/locale-switch-position.spec.ts
import { expect, type Page, test } from "@playwright/test";

/**
 * A locale switch keeps the visitor's place. On home the section in
 * view is handed to ScrollToOnLoad and wins over a (usually stale) URL
 * hash; on other routes the hash is carried over. The option links
 * themselves stay static, hash-free hrefs (crawlable); position is
 * composed at click time.
 */

async function switchToEnglish(page: Page) {
  await page.getByRole("button", { name: /deutsch/i }).click();
  const enLink = page.getByRole("link", { name: "English", exact: true });
  await expect(enLink).toBeVisible();
  await expect(enLink, "option href stays static").toHaveAttribute("href", /^\/en\//);
  await expect(enLink, "option href carries no hash").not.toHaveAttribute("href", /#/);
  await enLink.click();
}

async function settleOnPhotography(page: Page) {
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
}

test.describe("locale switch keeps position", () => {
  test.beforeEach(({ browserName }) => {
    test.slow(browserName === "webkit", "Software-rendered WebGL starves the main thread in CI");
  });

  test("landing on a hash keeps that section", async ({ page }) => {
    await page.goto("/de/#work");
    // Wait for ScrollToOnLoad's post-mount correction (the native hash
    // jump lands before the case-study pin adds its scroll extent).
    await expect
      .poll(
        () => page.locator("#work").evaluate((el) => Math.abs(el.getBoundingClientRect().top)),
        {
          timeout: 10_000,
        },
      )
      .toBeLessThan(80);
    await page.waitForTimeout(500);
    await switchToEnglish(page);
    await page.waitForURL(/\/en\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#work")).toBeInViewport({ ratio: 0.1, timeout: 10_000 });
  });

  test("the home section in view survives the switch without a hash", async ({
    page,
    isMobile,
  }) => {
    // Uses the pinned desktop diorama as a scroll landmark; phones get the
    // case-study carousel, which has no pin spacer.
    test.skip(isMobile, "Desktop pinned diorama only");
    await page.goto("/de/");
    await settleOnPhotography(page);
    await switchToEnglish(page);
    await page.waitForURL(/\/en\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#photography")).toBeInViewport({ ratio: 0.1, timeout: 10_000 });
  });

  test("on home the section in view beats a stale hash", async ({ page, isMobile }) => {
    // Uses the pinned desktop diorama as a scroll landmark; phones get the
    // case-study carousel, which has no pin spacer.
    test.skip(isMobile, "Desktop pinned diorama only");
    await page.goto("/de/#work");
    await expect(page.locator("#work")).toBeInViewport({ ratio: 0.1, timeout: 10_000 });
    // Let ScrollToOnLoad's 800ms post-mount correction to #work fire
    // first, so it can't pull the page back after we move on.
    await page.waitForTimeout(1500);
    await settleOnPhotography(page);
    await switchToEnglish(page);
    await page.waitForURL(/\/en\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#photography")).toBeInViewport({ ratio: 0.1, timeout: 10_000 });
  });

  test("other routes carry their hash over", async ({ page }) => {
    await page.goto("/de/datenschutz/#legal-section-form");
    await switchToEnglish(page);
    await page.waitForURL(/\/en\/datenschutz\/?#legal-section-form$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
