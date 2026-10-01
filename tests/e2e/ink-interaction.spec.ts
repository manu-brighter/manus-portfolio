import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("stationary pointer events and studio controls do not re-energize Flow", async ({ page }) => {
  await page.goto("/de/?ink-preview=light");
  const canvas = page.getByTestId("lite-ink-canvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  const energy = () =>
    canvas.evaluate((element) => {
      const gl = (element as HTMLCanvasElement).getContext("webgl2");
      if (!gl) throw new Error("Expected the Flow WebGL context");
      const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
      const location = gl.getUniformLocation(program, "uTrail[0]");
      if (!location) throw new Error("Expected the active Flow pointer uniform");
      const trail = gl.getUniform(program, location) as Float32Array;
      return trail[2] ?? 0;
    });
  await page.evaluate(() => {
    for (const clientX of [400, 600]) {
      document.body.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX, clientY: 300 }),
      );
    }
  });
  await expect.poll(energy).toBeGreaterThan(0.02);
  await expect.poll(energy, { timeout: 10000 }).toBeLessThan(0.005);
  await page.evaluate(() => {
    for (let i = 0; i < 40; i++) {
      document.body.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 600, clientY: 300 }),
      );
    }
  });
  await page.waitForTimeout(150);
  expect(await energy()).toBeLessThan(0.005);
  await page.getByTestId("ink-studio").evaluate((studio) => {
    for (let i = 0; i < 40; i++) {
      studio.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: i % 2 ? 900 : 300,
          clientY: 300,
        }),
      );
    }
  });
  await page.waitForTimeout(150);
  expect(await energy()).toBeLessThan(0.005);
});

test("Full photo ambient wakes before reveal, sleeps when idle and releases after reveal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function (
      this: WebGL2RenderingContext,
      ...args: Parameters<typeof draw>
    ) {
      const canvas = this.canvas;
      if (canvas instanceof HTMLCanvasElement && canvas.closest("[data-photo-slide]")) {
        canvas.dataset.maskDraws = String(Number(canvas.dataset.maskDraws ?? 0) + 1);
      }
      return draw.apply(this, args);
    };
  });
  await page.goto("/de/?ink-preview=full");
  const photo = page.locator("[data-photo-slide]").first();
  const canvas = photo.locator("canvas");
  await expect(canvas).toHaveCount(1, { timeout: 15000 });
  await expect(page.locator("#case-study .pin-spacer")).toHaveCount(1);
  expect(await canvas.getAttribute("data-mask-draws")).toBeNull();
  await photo.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight * 0.75, behavior: "instant" });
  });
  await expect(canvas).toHaveAttribute("data-mask-draws", /[1-9]/);
  const pixels = await canvas.evaluate(
    (element) => (element as HTMLCanvasElement).width * (element as HTMLCanvasElement).height,
  );
  expect(pixels).toBeGreaterThan(0);
  expect(pixels).toBeLessThanOrEqual(450000);
  const idleDraws = await canvas.getAttribute("data-mask-draws");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-mask-draws")).toBe(idleDraws);
  await photo.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: Math.min(rect.bottom, window.innerHeight) - 20,
      }),
    );
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-mask-draws")))
    .toBeGreaterThan(Number(idleDraws));
  await page.waitForTimeout(1100);
  const settledDraws = await canvas.getAttribute("data-mask-draws");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-mask-draws")).toBe(settledDraws);
  await photo.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await expect(canvas).toHaveCount(0, { timeout: 10000 });
  await expect(photo.locator("picture img")).toBeVisible();
});
