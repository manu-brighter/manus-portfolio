import { expect, test } from "@playwright/test";

for (const failure of ["null", "throw", "shader"] as const) {
  test(`mobile full renderer reports ${failure} initialization failure after a successful probe`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Exercises the coarse-pointer renderer on the mobile project.");
    await page.addInitScript((mode) => {
      localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
        if (this.dataset.testid === "mobile-bg-sim" && args[0] === "webgl2") {
          document.documentElement.dataset.mobileAttempted = "true";
          if (mode === "throw") throw new Error("Renderer context unavailable");
          if (mode === "null") return null;
          const gl = original.apply(this, args as Parameters<typeof original>);
          if (gl instanceof WebGL2RenderingContext) gl.createShader = () => null;
          return gl;
        }
        return original.apply(this, args as Parameters<typeof original>);
      } as typeof original;
    }, failure);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/de/?ink-preview=full");
    await expect(page.locator("html")).toHaveAttribute("data-mobile-attempted", "true", {
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Visuals", exact: true }).click();
    await expect(
      page.getByTestId("ink-studio-panel").getByText(/Diese Tintenansicht ist auf deinem Gerät/),
    ).toBeVisible();
    await expect(page.getByTestId("mobile-bg-sim")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("mobile full renderer reports context loss and removes the failed canvas", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Exercises the coarse-pointer renderer on the mobile project.");
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
  });
  await page.goto("/de/?ink-preview=full");
  const canvas = page.getByTestId("mobile-bg-sim");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await canvas.evaluate((element) => {
    element.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  });
  await expect(
    page.getByTestId("ink-studio-panel").getByText(/Diese Tintenansicht ist auf deinem Gerät/),
  ).toBeVisible();
  await expect(canvas).toHaveCount(0);
});
