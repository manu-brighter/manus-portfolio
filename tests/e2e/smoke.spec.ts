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

// F-testing-coverage-4: 404 page smoke assertions.
// The 404 page has its own <html lang="de"> shell (no locale layout),
// a <h1> with the "lost" message, and locale-switch links so visitors
// can navigate home in their preferred language.
test.describe("smoke — 404 page", () => {
  test("renders a visible h1", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("html[lang] is hardcoded to de (documented constraint)", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    // CLAUDE.md: "404 own <html lang='de'> hardcoded; noindex." This
    // test pins that contract so a future locale-variable change is
    // caught immediately.
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("de");
  });

  test("contains locale home links for all 4 locales", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    for (const locale of ["de", "en", "fr", "it"] as const) {
      await expect(
        page.locator(`a[href="/${locale}/"]`),
        `locale link for /${locale}/ must exist`,
      ).toHaveCount(1);
    }
  });
});
