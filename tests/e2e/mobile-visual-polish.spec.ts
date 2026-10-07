import { expect, test } from "@playwright/test";

test.beforeEach(async ({ isMobile }) => {
  test.skip(!isMobile, "Mobile viewport and photo reveal contracts");
});

test("hero fills the initial mobile viewport", async ({ page }) => {
  for (const width of [360, 440]) {
    await page.setViewportSize({ width, height: 956 });
    await page.goto("/de/?ink-preview=light");
    const hero = page.locator("#hero");
    await expect(hero).toBeVisible();
    const bottom = await hero.evaluate((element) => element.getBoundingClientRect().bottom);
    expect(bottom).toBeGreaterThanOrEqual(955);
    expect(bottom).toBeLessThan(958);
  }
});

for (const mode of ["light", "full"]) {
  test(`${mode} mobile photos reveal just before their center reaches the viewport middle`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
      WebGL2RenderingContext.prototype.drawArrays = () => {};
    });
    await page.goto(`/de/?ink-preview=${mode}`);
    const photo = page.getByTestId("photo-slide").first();
    await expect(photo).toBeAttached();
    const reveal = photo.getByTestId("photo-ink-animation");
    await expect(reveal).toHaveAttribute("data-revealing", "false");
    await photo.locator("img").evaluate((image) => {
      const box = image.getBoundingClientRect();
      window.scrollBy({ top: box.top + box.height / 2 - innerHeight * 0.66, behavior: "instant" });
    });
    await page.waitForTimeout(300);
    await expect(reveal).toHaveAttribute("data-revealing", "false");
    await photo.locator("img").evaluate((image) => {
      const box = image.getBoundingClientRect();
      window.scrollBy({ top: box.top + box.height / 2 - innerHeight * 0.55, behavior: "instant" });
    });
    await expect(reveal).toHaveCount(0, { timeout: 10000 });
    // A fast swipe can jump over the trigger line. A shallow image that
    // lands visibly above it must still reveal rather than stay covered.
    const panorama = page.getByTestId("photo-slide").nth(2);
    await panorama.locator("img").evaluate((image) => {
      const box = image.getBoundingClientRect();
      window.scrollBy({ top: box.top + box.height / 2 - innerHeight * 0.25, behavior: "instant" });
    });
    // The Light reveal itself runs ~2.9s (slow bloom by design), so the
    // bound is reveal length + slack: it still fails if the skipped
    // photo never triggers (the overlay would stay mounted for good).
    await expect(panorama.getByTestId("photo-ink-animation")).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator("#photography canvas")).toHaveCount(0);
  });
}

test("personal project skills fit together without leading row separators", async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/de/");
  const items = page.locator('[aria-labelledby="tier-vibecoded"] li');
  await expect(items).toHaveCount(5);
  const rows = await items.evaluateAll(
    (elements) =>
      new Set(elements.map((element) => Math.round(element.getBoundingClientRect().top))).size,
  );
  expect(rows).toBeLessThan(5);
  for (const separator of await items.locator(':scope > [aria-hidden="true"]').all()) {
    await expect(separator).not.toBeVisible();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
