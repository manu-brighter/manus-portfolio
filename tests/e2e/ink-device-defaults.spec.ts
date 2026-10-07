import { expect, type Page, test } from "@playwright/test";

const KEY = "manus-ink-mode";
const fullCanvas = '[data-scene="root"] canvas, [data-testid="mobile-bg-sim"]';

async function expectAnimationDefault(page: Page) {
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(fullCanvas)).toHaveCount(0);
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Animation", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Simulation", exact: true })).not.toBeChecked();
}

test("Animation is the default on desktop and touch, even on a fast GPU", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "high", ts: Date.now() }));
    WebGL2RenderingContext.prototype.drawArrays = () => {};
  });
  await page.goto("/de/");
  await expectAnimationDefault(page);
  // Only an explicit choice is ever written.
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
});

test("a stored legacy Auto choice resolves to Animation and is cleared", async ({ page }) => {
  await page.addInitScript((key) => {
    // Only seed once: the cleanup itself is under test across the reload.
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "high", ts: Date.now() }));
    localStorage.setItem(key, "auto");
    WebGL2RenderingContext.prototype.drawArrays = () => {};
  }, KEY);
  await page.goto("/de/");
  await expectAnimationDefault(page);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  await page.reload();
  await expectAnimationDefault(page);
});

test("an explicit Simulation choice persists and wins over the default", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
    localStorage.setItem(key, "full");
  }, KEY);
  await page.goto("/de/");
  await expect(page.locator(fullCanvas)).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("lite-ink-canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Simulation", exact: true })).toBeChecked();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe("full");
});

test.describe("manually selected mobile simulation", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });

  test("remains visible during scrolling and persists across reload", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
    });
    await page.goto("/de/");
    await page.getByRole("button", { name: "Visuals", exact: true }).click();
    await page.getByRole("radio", { name: "Animation", exact: true }).check();
    await page.getByRole("radio", { name: "Simulation", exact: true }).check();
    const canvas = page.getByTestId("mobile-bg-sim");
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Visuals", exact: true }).click();
    const samples = await canvas.evaluate(async (element) => {
      const opacities: number[] = [];
      for (let step = 1; step <= 8; step++) {
        window.scrollTo({ top: step * 100, behavior: "instant" });
        await new Promise((resolve) => setTimeout(resolve, 100));
        opacities.push(Number(getComputedStyle(element).opacity));
      }
      return opacities;
    });
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(500);
    expect(samples.every((value) => value === 1)).toBe(true);
    await page.reload();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Visuals", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Simulation", exact: true })).toBeChecked();
  });
});
