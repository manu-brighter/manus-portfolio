/**
 * Phase 3 — motion behavior tests.
 *
 * Two contexts:
 *   1. default          → Lenis mounts for anchor navigation; wheel input
 *                         stays native.
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

  test("wheel input scrolls the document while Lenis is mounted", async ({ page }) => {
    await page.goto("/de/");
    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
    await addScrollableFiller(page);

    // Wheel input remains native; explicit anchors still use Lenis.
    await page.mouse.wheel(0, 600);

    // Wait for the browser to scroll at least one pixel. Using
    // waitForFunction instead of a fixed RAF count makes the assertion
    // resilient on slow CI runners.
    await page.waitForFunction(() => window.scrollY > 0, { timeout: 3000 });
  });
});

test.describe("motion — reducedMotion: reduce", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("html does NOT get the lenis class", async ({ page }) => {
    await page.goto("/de/");
    // Poll until the class attribute stabilises — if Lenis were to mount
    // it would add the class within ~200ms of the provider effect firing.
    // expect.poll with a 2s timeout replaces the brittle waitForTimeout(500)
    // (F-testing-coverage-8) and gives slow CI runners enough headroom.
    // `getAttribute("class")` returns null when the element has no class
    // attribute at all (the desired state under reduced-motion). Default to
    // empty string so `.not.toContain("lenis")` has a string to operate on
    // regardless of whether `<html>` ever got *any* class set.
    await expect
      .poll(
        () =>
          page
            .locator("html")
            .getAttribute("class")
            .then((c) => c ?? ""),
        {
          timeout: 2000,
        },
      )
      .not.toContain("lenis");
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
