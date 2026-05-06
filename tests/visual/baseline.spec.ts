import { expect, test } from "@playwright/test";

/**
 * Phase 2 visual baseline (plan §13 stop-condition carried forward).
 *
 * Playwright auto-suffixes screenshot files with the runner platform
 * (e.g. `home-de-desktop-linux.png`, `home-de-desktop-win32.png`), so
 * dev and CI baselines coexist without conflicts.
 *
 * We snapshot DE only as the canonical editorial composition; other
 * locales reuse the same DOM/type scale so a pixel-diff across all 4
 * would mostly re-capture font-metric noise. If a Phase > 2 change
 * affects locale-specific layout (e.g. hyphenation), add the locale to
 * the matrix at that time.
 *
 * Run on demand:
 *   pnpm test:visual                 # diff vs. current baselines
 *   pnpm test:visual --update-snapshots
 */
test.describe("@visual phase 2 baseline", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("home /de/ — desktop 1280x800", async ({ page }) => {
    await page.goto("/de/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot("home-de-desktop.png", {
      fullPage: true,
      animations: "disabled",
      // WebGL fluid-sim + HeroSkillPulse (GSAP RAF loop) are not CSS animations
      // so `animations: "disabled"` does not freeze them. Observed variance is
      // up to ~400px on a ~23M-pixel full-page capture (<0.002%). 500px budget.
      maxDiffPixels: 500,
    });
  });

  test("styleguide /de/styleguide — desktop 1280x800", async ({ page }) => {
    await page.goto("/de/styleguide/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot("styleguide-de-desktop.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
