// tests/e2e/locale-detect.spec.ts
import { expect, type Page, test } from "@playwright/test";

/**
 * Bare-root language detection (`src/app/page.tsx`).
 *
 * `output: 'export'` rules out an Accept-Language middleware redirect,
 * so `/` ships an inline script that picks the locale client-side. The
 * smoke suite only asserts that SOME supported locale is reached — it
 * would stay green if the script sent everyone to `/de/`. These specs
 * pin the actual contract:
 *
 *   1. a remembered explicit switch wins
 *   2. otherwise the first supported `navigator.languages` entry wins
 *   3. otherwise the default locale
 *
 * Playwright's `locale` context option drives (2) by emulating
 * `navigator.language(s)` and the Accept-Language header. How faithful
 * that emulation is belongs to the engine, not to this site, so the
 * language-driven cases assert what the page actually reports first and
 * skip when the engine did not apply it (see `emulatedLanguages`).
 */

const STORAGE_KEY = "manus-locale";
const ANY_LOCALE = /\/(de|en|fr|it)\/$/;

/** Languages as the page sees them — the input our redirect script reads. */
async function emulatedLanguages(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (navigator.languages?.length ? [...navigator.languages] : [navigator.language]).map((l) =>
      String(l).toLowerCase(),
    ),
  );
}

test.describe("root / follows the browser language", () => {
  test.describe("French browser", () => {
    test.use({ locale: "fr-CH" });

    test("fr-CH lands on /fr/", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL(ANY_LOCALE);

      const langs = await emulatedLanguages(page);
      test.skip(
        !langs.some((l) => l.startsWith("fr")),
        "engine did not emulate navigator.languages for this context",
      );

      await expect(page).toHaveURL(/\/fr\/$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    });
  });

  test.describe("Italian browser", () => {
    test.use({ locale: "it-IT" });

    test("it-IT lands on /it/", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL(ANY_LOCALE);

      const langs = await emulatedLanguages(page);
      test.skip(
        !langs.some((l) => l.startsWith("it")),
        "engine did not emulate navigator.languages for this context",
      );

      await expect(page).toHaveURL(/\/it\/$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "it");
    });
  });

  test.describe("unsupported browser language", () => {
    test.use({ locale: "es-ES" });

    test("es-ES falls back to the default locale /de/", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL(ANY_LOCALE);

      const langs = await emulatedLanguages(page);
      test.skip(
        langs.some((l) => /^(de|en|fr|it)/.test(l)),
        "engine kept a supported language in the list — nothing to fall back from",
      );

      await expect(page).toHaveURL(/\/de\/$/);
    });
  });
});

test.describe("root / honours a remembered locale switch", () => {
  test.use({ locale: "de-DE" });

  test("stored 'en' beats the German browser language", async ({ page }) => {
    // Same-origin visit first — localStorage is per origin, and the root
    // document redirects away before a write could land there.
    await page.goto("/de/");
    await page.evaluate((key) => localStorage.setItem(key, "en"), STORAGE_KEY);

    await page.goto("/");
    await page.waitForURL(/\/en\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("an unsupported stored value is ignored", async ({ page }) => {
    await page.goto("/de/");
    await page.evaluate((key) => localStorage.setItem(key, "klingon"), STORAGE_KEY);

    await page.goto("/");
    // Falls through to the language sniff, which lands on a real locale.
    await page.waitForURL(ANY_LOCALE);
    await expect(page).not.toHaveURL(/klingon/);
  });
});

test.describe("the nav switcher records the choice", () => {
  test.use({ locale: "de-DE" });

  test("DE to EN writes the preference, and / then serves /en/", async ({ page }) => {
    await page.goto("/de/");

    await page.getByRole("button", { name: /deutsch/i }).click();
    const enButton = page.getByRole("button", { name: /english/i });
    await expect(enButton).toBeVisible();
    await enButton.click();
    await page.waitForURL(/\/en\//);

    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(stored, "explicit locale switch must be remembered").toBe("en");

    await page.goto("/");
    await page.waitForURL(/\/en\/$/);
  });
});
