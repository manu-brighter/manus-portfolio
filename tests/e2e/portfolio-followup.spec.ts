import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("Animation photos have no reveal controls or click-to-scroll behavior", async ({ page }) => {
  await page.goto("/de/?ink-preview=light");
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  const photos = page.locator("[data-photo-slide]");
  await expect(photos).toHaveCount(5);
  await expect(page.locator("[data-photo-slide][role='button']")).toHaveCount(0);
  await expect(page.locator("[data-photo-slide][tabindex]")).toHaveCount(0);
  await expect(page.locator("#case-study .pin-spacer")).toHaveCount(1);
  const photo = photos.first();
  await photo.evaluate((element) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + scrollY - innerHeight * 0.75,
      behavior: "instant",
    });
  });
  const before = await page.evaluate(() => scrollY);
  await photo.dispatchEvent("click");
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test("Animation reveals a photo once without allocating a photo canvas", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
  });
  await page.goto("/de/?ink-preview=light");
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("photo-ink-animation")).toHaveCount(5);
  await expect(page.locator("#photography canvas")).toHaveCount(0);
  await expect(page.locator("#case-study .pin-spacer")).toHaveCount(1);
  const photo = page.locator("[data-photo-slide]").first();
  await photo.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(photo.getByTestId("photo-ink-animation")).toHaveCount(0, { timeout: 10000 });
  await expect(photo.locator("picture img")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await photo.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(photo.getByTestId("photo-ink-animation")).toHaveCount(0);
  await page.getByRole("button", { name: "Tintenstudio", exact: true }).click();
  await page.getByRole("radio", { name: "Simulation", exact: true }).check();
  await expect(photo.locator("canvas")).toHaveCount(0);
  await page.getByRole("radio", { name: "Animation", exact: true }).check();
  await expect(photo.getByTestId("photo-ink-animation")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("photo-ink-animation")).toHaveCount(0);
});

for (const mode of ["light", "full"] as const) {
  test(`${mode} cursor draws curves, stops painting at rest and respects reduced motion`, async ({
    page,
    isMobile,
  }) => {
    test.skip(Boolean(isMobile), "The decorative cursor is fine-pointer only");
    await page.addInitScript(() => {
      localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
      const curve = CanvasRenderingContext2D.prototype.quadraticCurveTo;
      CanvasRenderingContext2D.prototype.quadraticCurveTo = function (...args) {
        if (this.canvas.classList.contains("ink-cursor-layer")) {
          this.canvas.dataset.curves = String(Number(this.canvas.dataset.curves ?? 0) + 1);
        }
        return curve.apply(this, args);
      };
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.classList.contains("ink-cursor-layer")) {
          this.canvas.dataset.clears = String(Number(this.canvas.dataset.clears ?? 0) + 1);
        }
        return clear.apply(this, args);
      };
    });
    await page.goto(`/de/?ink-preview=${mode}`);
    const cursor = page.locator("canvas.ink-cursor-layer");
    await expect(cursor).toBeVisible({ timeout: 15000 });
    for (const [x, y] of [
      [200, 250],
      [550, 400],
      [900, 250],
      [1100, 500],
    ]) {
      await page.mouse.move(x as number, y as number, { steps: 4 });
    }
    await expect(cursor).toHaveAttribute("data-curves", /[1-9]/, { timeout: 10000 });
    // A slow renderer can deliver the final tail-clearing frame late.
    // Wait for a full stable interval rather than guessing its settle time.
    await expect
      .poll(
        async () => {
          const clears = await cursor.getAttribute("data-clears");
          await page.waitForTimeout(1000);
          return (await cursor.getAttribute("data-clears")) === clears;
        },
        { timeout: 10000 },
      )
      .toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(cursor).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-ink-cursor");
  });
}
