import { expect, type Page, test } from "@playwright/test";

/**
 * Visual baseline — safety net for unintended Desktop layout regressions.
 *
 * Captured with `<canvas>` hidden so the WebGL FluidSim and per-section
 * mini-sim canvases don't introduce per-frame pixel noise into snapshots.
 * `prefers-reduced-motion: reduce` only freezes CSS animations; WebGL is
 * unaffected, so we additionally suppress canvas paints via CSS.
 *
 * The canvases sit at z-index -1 behind page content (paper background),
 * so hiding them leaves the visual hierarchy intact for layout-regression
 * detection — typography, spacing, color, content, decorative SVG all
 * still snapshot. The trade-off: we don't catch regressions in the sim
 * rendering itself, but those are tested elsewhere (e2e smoke + manual
 * dev-server inspection).
 *
 * Playwright auto-suffixes screenshot files with the runner platform
 * (e.g. `home-de-desktop-linux.png`, `home-de-desktop-win32.png`), so
 * local + CI baselines coexist without conflicts.
 *
 * Run on demand:
 *   pnpm test:visual                 # diff vs. current baselines
 *   pnpm test:visual --update-snapshots
 */
async function hideCanvases(page: Page) {
  await page.addStyleTag({
    content: "canvas { visibility: hidden !important; }",
  });
}

test.describe("@visual phase 2 baseline", () => {
  // Chromium-only — webkit's WebGL stack produces too much per-frame noise
  // even with canvas-hidden + reducedMotion (race conditions during the
  // brief moment before `addStyleTag` applies). Chromium snapshots cover
  // the safety-net need; webkit-specific regressions would need a
  // sim-disable mechanism rather than DOM masking.
  test.skip(({ browserName }) => browserName !== "chromium");

  test.use({
    viewport: { width: 1280, height: 800 },
    contextOptions: { reducedMotion: "reduce" },
  });

  test("home /de/ — desktop 1280x800", async ({ page }) => {
    await page.goto("/de/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    await hideCanvases(page);
    await expect(page).toHaveScreenshot("home-de-desktop.png", {
      fullPage: true,
      animations: "disabled",
      // Allowance for sub-pixel anti-aliasing drift on the conic-gradient
      // hero-skill-aura halo. Layout regressions register at >> 5000px.
      maxDiffPixels: 5000,
    });
  });

  test("styleguide /de/styleguide — desktop 1280x800", async ({ page }) => {
    await page.goto("/de/styleguide/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    await hideCanvases(page);
    await expect(page).toHaveScreenshot("styleguide-de-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixels: 5000,
    });
  });
});
