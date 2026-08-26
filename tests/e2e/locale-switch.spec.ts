// tests/e2e/locale-switch.spec.ts
import { expect, test } from "@playwright/test";
import { LOCALE_STORAGE_KEY } from "@/lib/localePreference";

/**
 * F-testing-coverage-3: Locale-switch View Transitions.
 *
 * Starts at /de/, clicks the EN locale button, waits for URL to change
 * to /en/, and asserts html[lang]="en". Runs in both Chromium (VT
 * supported) and WebKit (fallback path — synchronous navigation).
 *
 * Does NOT assert that startViewTransition() itself fired — that's
 * browser-internal and not observable. We assert the observable
 * postcondition (URL + lang attribute) which is what matters.
 *
 * The DE -> EN case also carries the "an explicit switch is remembered"
 * assertion. It lives here rather than in locale-detect.spec.ts so the
 * click sequence exists once: a second spec repeating it would double
 * the maintenance on the switcher's markup and re-boot the heaviest
 * page in the suite for no extra coverage.
 */

test.describe("locale switch via nav switcher", () => {
  test("DE → EN: URL changes to /en/ and html[lang] flips to en", async ({ page }) => {
    await page.goto("/de/");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    // The current locale (DE) is always visible. Click it to expand
    // the other locales, then click EN.
    const deButton = page.getByRole("button", { name: /deutsch/i });
    await deButton.click();

    // After expanding, click the EN locale button.
    const enButton = page.getByRole("button", { name: /english/i });
    await expect(enButton).toBeVisible();
    await enButton.click();

    await page.waitForURL(/\/en\//);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // The switch is an explicit choice, so the bare root has to honour
    // it on the next visit instead of re-sniffing the browser language
    // (see src/app/page.tsx).
    const stored = await page.evaluate((key) => localStorage.getItem(key), LOCALE_STORAGE_KEY);
    expect(stored, "explicit locale switch must be remembered").toBe("en");

    await page.goto("/");
    await page.waitForURL(/\/en\/$/);
  });

  test("switching back: EN → DE restores /de/ and lang=de", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Expand from EN and switch to DE.
    const enButton = page.getByRole("button", { name: /english/i });
    await enButton.click();

    const deButton = page.getByRole("button", { name: /deutsch/i });
    await expect(deButton).toBeVisible();
    await deButton.click();

    await page.waitForURL(/\/de\//);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });
});
