import { expect, test } from "@playwright/test";

const LOCALES = ["de", "en", "fr", "it"] as const;

test.describe("smoke — locale pages", () => {
  for (const locale of LOCALES) {
    test(`/${locale}/ returns 200 and renders <main>`, async ({ page }) => {
      const response = await page.goto(`/${locale}/`);
      expect(response, "navigation response").not.toBeNull();
      expect(response?.status(), `HTTP status on /${locale}/`).toBeLessThan(400);

      const main = page.locator("main");
      await expect(main, "<main> landmark must exist").toBeVisible();
    });

    test(`/${locale}/ html[lang] is "${locale}"`, async ({ page }) => {
      await page.goto(`/${locale}/`);
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang, `html[lang] on /${locale}/`).toBe(locale);
    });
  }
});

test.describe("smoke — root redirect", () => {
  test("root / redirects to a supported locale", async ({ page }) => {
    await page.goto("/");
    // Client-side redirect fires via inline script; Playwright follows it.
    await page.waitForURL(/\/(de|en|fr|it)\/$/);
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/^\/(de|en|fr|it)\/$/);
  });

  test("html has a valid BCP 47 lang attribute on redirect target", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/(de|en|fr|it)\/$/);
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang, "html[lang] must be set").not.toBeNull();
    expect(lang ?? "", "html[lang] must match BCP 47 pattern").toMatch(/^[a-z]{2,3}(-[A-Z]{2})?$/);
  });
});
