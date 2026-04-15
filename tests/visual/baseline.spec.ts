import { expect, test } from "@playwright/test";

/**
 * Phase 1 visual baseline (plan §13 stop-condition).
 *
 * Playwright auto-suffixes screenshot files with the runner platform
 * (e.g. `home-light-linux.png`, `home-light-win32.png`), so dev and CI
 * baselines coexist without conflicts.
 *
 * Run on demand:
 *   pnpm test:visual                 # diff vs. current baselines
 *   pnpm test:visual --update-snapshots
 *
 * Not part of `pnpm test` (smoke + a11y) — visual diffs are intentionally
 * a separate signal until Phase 2 stabilises the editorial layout.
 */
test.describe("@visual phase 1 baseline", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("home — desktop 1280x800", async ({ page }) => {
    await page.goto("/");
    // Wait for fonts so the snapshot doesn't capture a fallback flash.
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot("home-desktop.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("styleguide — desktop 1280x800", async ({ page }) => {
    await page.goto("/styleguide");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot("styleguide-desktop.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
