// tests/e2e/legal-nav.spec.ts
import { type ConsoleMessage, expect, test } from "@playwright/test";

/**
 * Regression test for the "Failed to execute 'removeChild' on 'Node'"
 * runtime error that fired on every nav from `/` to `/impressum` or
 * `/datenschutz`. Root cause was ScrollTrigger pin-spacer of the
 * case-study section: kept the section's DOM parent as its own
 * pin-spacer div, so when React unmounted the page tree it tried to
 * remove the section from <main> and the section was no longer a
 * child of <main>. Fix: legal-link click handler in Footer.tsx kills
 * all ScrollTrigger pin-spacers BEFORE calling router.push, restoring
 * the original DOM hierarchy.
 */
test.describe("@legal nav from / to /impressum + /datenschutz", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  for (const target of ["impressum", "datenschutz"] as const) {
    test(`click ${target} link from / fires zero console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
      page.on("console", (msg: ConsoleMessage) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // Allow benign noise (THREE deprecation, font CORS in dev) but
          // capture removeChild + similar React reconciliation errors.
          if (
            text.includes("removeChild") ||
            text.includes("NotFoundError") ||
            text.includes("Failed to execute")
          ) {
            errors.push(`console.error: ${text}`);
          }
        }
      });

      await page.goto("/de/");
      // The intro no longer blocks startup. Wait for the actual pin whose
      // removal this regression test exercises.
      await expect(page.locator("#case-study .pin-spacer")).toHaveCount(1);

      // Scroll to bring the footer into view, then click the link.
      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
      );
      // Replace waitForTimeout(400) with a scroll-position poll (F-testing-coverage-8).
      await expect
        .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000, intervals: [50, 100] })
        .toBeGreaterThan(100);

      const link = page.locator(`footer a[href*="/${target}"]`).first();
      await expect(link).toBeVisible();
      await link.click();

      // Verify the destination commit itself. Unrelated lazy image requests
      // from the former page must not decide whether navigation succeeded.
      await page.waitForURL(new RegExp(`/de/${target}/?$`));
      await expect(page.locator("h1")).toHaveText(
        target === "impressum" ? "Impressum" : "Datenschutzerklärung",
      );

      expect(errors, `console errors during nav to /${target}`).toEqual([]);
    });
  }
});
