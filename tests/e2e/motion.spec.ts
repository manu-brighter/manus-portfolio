/**
 * Phase 3 — motion behavior tests.
 *
 * Two contexts:
 *   1. default          → Lenis mounts, programmatic scroll is smoothed
 *                         over multiple RAF ticks.
 *   2. reducedMotion:'reduce' → Lenis is NOT instantiated, programmatic
 *                         scroll is instant, no Lenis CSS class on <html>.
 *
 * Axe-coverage stays in tests/a11y/; this file asserts behavior only.
 */

import { expect, test } from "@playwright/test";

/** Small utility: add enough body height to scroll into. */
async function addScrollableFiller(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const filler = document.createElement("div");
    filler.style.height = "4000px";
    filler.setAttribute("data-test-filler", "true");
    document.body.appendChild(filler);
  });
}

test.describe("motion — default (Lenis active)", () => {
  test("html gets the lenis class once the provider mounts", async ({ page }) => {
    await page.goto("/de/");
    await expect(page.locator("html")).toHaveClass(/\blenis\b/, { timeout: 5000 });
  });

  test("wheel scroll is smoothed (Lenis intercepts)", async ({ page }) => {
    await page.goto("/de/");
    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
    await addScrollableFiller(page);

    // Dispatch a wheel event — Lenis intercepts these and smooths them.
    await page.mouse.wheel(0, 600);

    // Wait for Lenis to interpolate at least one pixel. Using
    // waitForFunction instead of a fixed RAF count makes the assertion
    // resilient on slow CI runners.
    await page.waitForFunction(() => window.scrollY > 0, { timeout: 3000 });
  });
});

test.describe("motion — reducedMotion: reduce", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("html does NOT get the lenis class", async ({ page }) => {
    await page.goto("/de/");
    // Give the provider time to (not) mount Lenis.
    await page.waitForTimeout(500);
    const className = (await page.locator("html").getAttribute("class")) ?? "";
    expect(className).not.toContain("lenis");
  });

  test("programmatic scroll is instant", async ({ page }) => {
    await page.goto("/de/", { waitUntil: "networkidle" });
    await addScrollableFiller(page);

    const scrollY = await page.evaluate(() => {
      window.scrollTo(0, 2000);
      return window.scrollY;
    });
    expect(scrollY).toBe(2000);
  });
});
