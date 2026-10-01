import { expect, test } from "@playwright/test";

for (const mobile of [false, true]) {
  test(`${mobile ? "touch" : "desktop"} uses detected low tier and limits Retina output`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 800, height: 900 },
      deviceScaleFactor: 2,
      hasTouch: mobile,
      isMobile: mobile,
    });
    await context.addInitScript(() => {
      // Deterministic hardware identity; retain actual WebGL rendering.
      const original = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
        if (parameter === 37446) return "Intel(R) Iris(R) Xe Graphics";
        return original.call(this, parameter);
      };
    });
    const page = await context.newPage();
    try {
      await page.goto("/de/");
      await expect
        .poll(
          () =>
            page.evaluate(() => JSON.parse(localStorage.getItem("manus-gpu-tier") ?? "null")?.tier),
          { timeout: 20000 },
        )
        .toBe("low");
      const canvas = mobile
        ? page.getByTestId("mobile-bg-sim")
        : page.locator('[data-scene="root"] canvas');
      await expect(canvas).toBeVisible();
      await expect
        .poll(() =>
          canvas.evaluate((element) => {
            const canvas = element as HTMLCanvasElement;
            return canvas.width / canvas.getBoundingClientRect().width;
          }),
        )
        .toBe(1);
      // A repeat visit must retain the same budget through the cached path.
      await page.reload();
      await expect(canvas).toBeVisible({ timeout: 20000 });
      await expect
        .poll(() => canvas.evaluate((el) => (el as HTMLCanvasElement).width / el.clientWidth))
        .toBe(1);
    } finally {
      await context.close();
    }
  });
}

test("touch retains measured quality when tier cache cannot be written", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 800, height: 900 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript(() => {
    const parameter = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (name: number) {
      return name === 37446 ? "Unrecognized test GPU" : parameter.call(this, name);
    };
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "manus-gpu-tier") throw new DOMException("Storage blocked", "SecurityError");
      setItem.call(this, key, value);
    };
    const finish = WebGL2RenderingContext.prototype.finish;
    let finishCalls = 0;
    Object.defineProperty(window, "gpuProbeFinishCalls", { get: () => finishCalls });
    WebGL2RenderingContext.prototype.finish = function () {
      finishCalls++;
      finish.call(this);
      // Model slow GPU completion so calibration deterministically lowers
      // medium to minimal, forcing the orchestrator to reinitialise.
      const until = performance.now() + 24;
      while (performance.now() < until) {
        // Synchronous GPU wait for this regression test only.
      }
    };
  });
  const page = await context.newPage();
  try {
    await page.goto("/de/");
    const canvas = page.getByTestId("mobile-bg-sim");
    await expect(canvas).toBeVisible({ timeout: 20000 });
    const finishCalls = () => page.evaluate(() => Reflect.get(window, "gpuProbeFinishCalls"));
    // The fresh-load reveal and software WebGL can take longer than the
    // default assertion timeout. Wait for calibration before checking DPR.
    await expect.poll(finishCalls, { timeout: 30000 }).toBe(30);
    await expect
      .poll(() => canvas.evaluate((el) => (el as HTMLCanvasElement).width / el.clientWidth))
      .toBe(1);
    expect(await page.evaluate(() => localStorage.getItem("manus-gpu-tier"))).toBeNull();
    // Observe subsequent frames: a restarted probe would call finish forever.
    await page.waitForTimeout(500);
    expect(await finishCalls()).toBe(30);
  } finally {
    await context.close();
  }
});
