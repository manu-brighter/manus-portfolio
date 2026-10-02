import { expect, test } from "@playwright/test";

test("a fast cached GPU does not change the device's default ink mode", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "high", ts: Date.now() }));
  });
  await page.goto("/de/");
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Tintenstudio", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: isMobile ? "Animation" : "Auto", exact: true }),
  ).toBeChecked();
  await expect(page.getByTestId("mobile-bg-sim")).toHaveCount(0);
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
    await page.getByRole("button", { name: "Tintenstudio", exact: true }).click();
    await page.getByRole("radio", { name: "Animation", exact: true }).check();
    await page.getByRole("radio", { name: "Simulation", exact: true }).check();
    const canvas = page.getByTestId("mobile-bg-sim");
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Tintenstudio", exact: true }).click();
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
    await page.getByRole("button", { name: "Tintenstudio", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Simulation", exact: true })).toBeChecked();
  });
});
