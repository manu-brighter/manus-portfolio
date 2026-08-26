// tests/e2e/locale-detect.spec.ts
import { expect, type Page, test } from "@playwright/test";
import { routing } from "@/i18n/routing";
import { LOCALE_STORAGE_KEY } from "@/lib/localePreference";

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
 * The storage key and the locale list are imported, not restated, so a
 * fifth locale cannot leave the assertions silently unable to match it.
 *
 * Playwright's `locale` context option drives (2) by emulating
 * `navigator.language(s)` and the Accept-Language header. How faithful
 * that emulation is belongs to the engine, not to this site, so the
 * language-driven cases assert what the page actually reports first and
 * skip when the engine did not apply it (see `emulatedLanguages`).
 *
 * Every case here picks a browser language that differs from the locale
 * it expects, so no assertion can be satisfied by the fallback.
 */

const ANY_LOCALE = new RegExp(`/(${routing.locales.join("|")})/$`);

/** Languages as the page sees them — the input our redirect script reads. */
async function emulatedLanguages(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (navigator.languages?.length ? [...navigator.languages] : [navigator.language]).map((l) =>
      String(l).toLowerCase(),
    ),
  );
}

/**
 * Write `manus-locale` on a one-off stub document.
 *
 * `addInitScript` would look cheaper, but it runs in EVERY new document
 * including the redirect target, so it re-seeds the value the script
 * just self-healed and hides that behaviour. Booting a real locale page
 * for one `setItem` costs a full fluid-sim load instead. A stubbed
 * same-origin response is both cheap and honest.
 */
async function seedStoredLocale(page: Page, value: string): Promise<void> {
  const stub = "/__locale-seed";
  await page.route(`**${stub}`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>seed</title>" }),
  );
  await page.goto(stub);
  await page.evaluate(([key, val]) => localStorage.setItem(key, val), [
    LOCALE_STORAGE_KEY,
    value,
  ] as const);
  await page.unroute(`**${stub}`);
}

/** Skip when the engine ignored the context `locale` — a harness gap, not a site bug. */
async function skipUnlessEmulated(page: Page, prefix: string): Promise<void> {
  const langs = await emulatedLanguages(page);
  test.skip(
    !langs.some((l) => l.startsWith(prefix)),
    `engine did not emulate navigator.languages as ${prefix}* for this context`,
  );
}

test.describe("root / follows the browser language", () => {
  test.describe("French browser", () => {
    test.use({ locale: "fr-CH" });

    test("fr-CH lands on /fr/", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL(ANY_LOCALE);
      await skipUnlessEmulated(page, "fr");

      await expect(page).toHaveURL(/\/fr\/$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    });
  });

  test.describe("Italian browser", () => {
    test.use({ locale: "it-IT" });

    test("it-IT lands on /it/", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL(ANY_LOCALE);
      await skipUnlessEmulated(page, "it");

      await expect(page).toHaveURL(/\/it\/$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "it");
    });
  });

  test.describe("unsupported browser language", () => {
    test.use({ locale: "es-ES" });

    test("es-ES falls back to the default locale", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL(ANY_LOCALE);

      const langs = await emulatedLanguages(page);
      test.skip(
        langs.some((l) => routing.locales.some((supported) => l.startsWith(supported))),
        "engine kept a supported language in the list — nothing to fall back from",
      );

      await expect(page).toHaveURL(new RegExp(`/${routing.defaultLocale}/$`));
    });
  });
});

test.describe("root / honours a remembered locale switch", () => {
  test.use({ locale: "de-DE" });

  test("stored 'en' beats the German browser language", async ({ page }) => {
    await seedStoredLocale(page, "en");

    await page.goto("/");
    await page.waitForURL(/\/en\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("root / ignores an unusable stored value", () => {
  // en-GB, not de-DE: the sniff result (/en/) has to be distinguishable
  // from the default-locale fallback, or every branch would pass.
  test.use({ locale: "en-GB" });

  test("a value that is not a supported locale falls through to the sniff", async ({ page }) => {
    await seedStoredLocale(page, "klingon");

    await page.goto("/");
    await page.waitForURL(ANY_LOCALE);
    await skipUnlessEmulated(page, "en");

    await expect(page).toHaveURL(/\/en\/$/);
    // Self-heal: the unusable value is dropped rather than re-read forever.
    const stored = await page.evaluate((key) => localStorage.getItem(key), LOCALE_STORAGE_KEY);
    expect(stored, "an unsupported stored locale must be cleared").toBeNull();
  });

  test("a throwing localStorage does not disable the language sniff", async ({ page }) => {
    // Blocked site data makes the ACCESS throw, so this is what the
    // inner try/catch in the redirect script exists for. Without it the
    // outer catch would swallow the sniff and serve the default locale.
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });
    });

    await page.goto("/");
    await page.waitForURL(ANY_LOCALE);
    await skipUnlessEmulated(page, "en");

    await expect(page).toHaveURL(/\/en\/$/);
  });
});

test.describe("the 404 language row records the choice", () => {
  // A visitor who follows a dead link and picks a language there has
  // made the same explicit choice as in the Nav switcher, so the bare
  // root has to honour it too (src/app/not-found-locale-links.tsx).
  test.use({ locale: "de-DE" });

  test("clicking English on the 404 page carries over to /", async ({ page }) => {
    await page.goto("/this-route-does-not-exist/");
    await page.getByRole("link", { name: "English" }).click();
    await page.waitForURL(/\/en\/$/);

    const stored = await page.evaluate((key) => localStorage.getItem(key), LOCALE_STORAGE_KEY);
    expect(stored, "404 language choice must be remembered").toBe("en");

    await page.goto("/");
    await page.waitForURL(/\/en\/$/);
  });
});
