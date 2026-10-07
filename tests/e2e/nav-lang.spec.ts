// tests/e2e/nav-lang.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Section labels in the nav are English in every locale. On non-English
 * pages they carry lang="en" so screen readers pronounce them as English;
 * the localized legal links and the English page itself carry none.
 */

test("English nav labels are marked lang=en on the German page only", async ({ page }) => {
  await page.goto("/de/cv/");
  const cv = page.locator('nav a[href^="/de/cv"]:not([hreflang])');
  await expect(cv).toHaveAttribute("lang", "en");

  const impressum = page.locator('footer a[href^="/de/impressum"]');
  await expect(impressum).not.toHaveAttribute("lang", /.+/);

  await page.goto("/en/cv/");
  await expect(page.locator('nav a[href^="/en/cv"]:not([hreflang])')).not.toHaveAttribute(
    "lang",
    /.+/,
  );
});
