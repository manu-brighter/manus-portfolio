import { expect, test } from "@playwright/test";

// Phase 9 — Photography section ("Through the Lens"), ink-reveal rework.
// Layout: 5 photos in editorial-asymmetric flow, each photo lives in
// the DOM as a <picture>, an ink-mask <canvas> overlay dissolves on
// IO entry to reveal the clean photo. Reduced-motion: skips the canvas
// and just shows the picture.

test.describe("photography section", () => {
  test("renders heading, lede, tech-stamp", async ({ page }) => {
    await page.goto("/de/");
    const section = page.locator("#photography");
    await expect(section).toBeAttached();

    const heading = section.getByRole("heading", { name: "Through the Lens." });
    await expect(heading).toBeVisible();
    await expect(section.getByText("SONY α7 IV", { exact: false })).toBeVisible();
  });

  test("all 5 photo slots render with picture + caption", async ({ page }) => {
    await page.goto("/de/");
    const section = page.locator("#photography");
    const slots = section.locator("[data-photo-slide]");
    await expect(slots).toHaveCount(5);

    // Each slot should contain a <picture> with at least one <source>
    // and a fallback <img>.
    for (let i = 0; i < 5; i++) {
      const slot = slots.nth(i);
      await expect(slot.locator("picture img")).toHaveAttribute("alt", /.+/);
    }
  });

  test("CTA points at myportfolio.com and opens externally", async ({ page }) => {
    await page.goto("/de/");
    const cta = page.locator("#photography").getByRole("link", { name: /myportfolio\.com/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /manuelheller\.myportfolio\.com/);
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", /noopener/);
  });

  test("reduced-motion: ink-mask canvas omitted, picture stays", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/de/");

    const section = page.locator("#photography");
    // No mask canvases under reduced-motion (PhotoInkMask returns null).
    const canvases = section.locator("canvas");
    await expect(canvases).toHaveCount(0);

    // The 5 photos themselves still render.
    const slots = section.locator("[data-photo-slide]");
    await expect(slots).toHaveCount(5);

    await context.close();
  });
});
