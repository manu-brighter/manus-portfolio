/**
 * Phase 5 — OverprintReveal behaviour tests.
 *
 * Two contexts:
 *   1. default          → three layers per char (ink + rose + mint),
 *                         ghosts reach opacity > 0 after IO fires.
 *   2. reducedMotion    → no ghost layers in the DOM, ink chars are
 *                         fully opaque on first paint.
 *
 * The hero H1 is our canonical consumer. It splits into two
 * OverprintReveals ("Heller," + "Manuel.") separated by an upright
 * slash; the slash is aria-hidden so the accessible name of the H1
 * is "Heller, / Manuel."-minus-slash → "Heller, Manuel.".
 */

import { expect, test } from "@playwright/test";

test.describe("overprint — default (ghosts rendered)", () => {
  test("H1 renders ink + rose + mint layers per char", async ({ page }) => {
    await page.goto("/de/");

    const h1 = page.locator("#hero-heading");
    await expect(h1).toBeVisible();

    // Ink layers live in document flow — SR reads them as the heading name.
    const inkChars = h1.locator("[data-layer='ink']");
    const roseChars = h1.locator("[data-layer='rose']");
    const mintChars = h1.locator("[data-layer='mint']");

    // "Heller," (7 chars incl. comma) + "Manuel." (7 chars incl. period) = 14
    const inkCount = await inkChars.count();
    expect(inkCount).toBe(14);
    expect(await roseChars.count()).toBe(inkCount);
    expect(await mintChars.count()).toBe(inkCount);
  });

  test("ghost chars are aria-hidden; ink chars are not", async ({ page }) => {
    await page.goto("/de/");
    const h1 = page.locator("#hero-heading");
    const rose = h1.locator("[data-layer='rose']").first();
    const mint = h1.locator("[data-layer='mint']").first();
    const ink = h1.locator("[data-layer='ink']").first();

    await expect(rose).toHaveAttribute("aria-hidden", "true");
    await expect(mint).toHaveAttribute("aria-hidden", "true");
    // Ink does not have aria-hidden at all (attribute absent).
    expect(await ink.getAttribute("aria-hidden")).toBeNull();
  });

  test("accessible heading name contains ink text, no ghost duplication", async ({ page }) => {
    await page.goto("/de/");
    // Ask Playwright to produce the aria snapshot of the hero heading.
    // The snapshot is YAML-ish and reflects the AccName algorithm —
    // aria-hidden subtrees are excluded. Assert:
    //   1. A level-1 heading exists.
    //   2. The snapshot mentions "Heller" and "Manuel" exactly once each
    //      (ghost triplication would show them three times in a row).
    const snapshot = await page.locator("#hero-heading").ariaSnapshot();
    expect(snapshot, "aria snapshot").toMatch(/heading.*"[^"]*Heller[^"]*Manuel[^"]*"/);
    // Negative guard: triplicated chars (ghost leak) would look like
    // "HHHeeelllllleeerrr" in the snapshot.
    expect(snapshot).not.toMatch(/HHH|MMM/);
  });

  test("ghost opacity becomes > 0 after intersection trigger fires", async ({ page }) => {
    await page.goto("/de/");
    const rose = page.locator("#hero-heading [data-layer='rose']").first();
    await expect(rose).toBeVisible();
    // IO fires near-immediately on mount because the hero is in view.
    // The hero has waitForLoader=true, so the timeline is gated on
    // loader-complete + 350ms settle + ~560ms GSAP medium duration.
    // CI cold-start (1 worker, no cache) needs a generous timeout.
    await expect
      .poll(
        async () =>
          Number(await rose.evaluate((el) => getComputedStyle(el as HTMLElement).opacity)),
        { timeout: 8000 },
      )
      .toBeGreaterThan(0.1);
  });
});

test.describe("overprint — reducedMotion: reduce", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("H1 has no ghost layers at all", async ({ page }) => {
    await page.goto("/de/");
    const h1 = page.locator("#hero-heading");
    await expect(h1).toBeVisible();

    // useReducedMotion's getServerSnapshot returns false (server can't
    // know the user's preference), so SSR markup includes the ghost
    // layers and they live in the DOM during the brief window between
    // hydration and the post-mount RM flip. Use auto-retrying matchers
    // so the assertion waits for the client to drop the ghosts.
    await expect(h1.locator("[data-layer='rose']")).toHaveCount(0);
    await expect(h1.locator("[data-layer='mint']")).toHaveCount(0);
    await expect(h1.locator("[data-layer='ink']")).toHaveCount(0);
  });

  test("heading text is still accessible and fully visible", async ({ page }) => {
    await page.goto("/de/");
    // Same AccName check as the default branch — the reduced-motion
    // branch drops ghosts entirely, so the ink chars are the only
    // thing the accessible-name algorithm has to work with.
    const h1 = page.getByRole("heading", { level: 1, name: /^\s*Heller,\s*Manuel\.\s*$/ });
    await expect(h1).toBeVisible();
  });
});
