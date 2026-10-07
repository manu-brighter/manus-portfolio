import { expect, test } from "@playwright/test";

test("animated text is primed before application scripts hydrate", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await gate;
    await route.continue();
  });
  const navigation = page.goto("/de/", { waitUntil: "domcontentloaded" });
  try {
    const ink = page.locator('#hero-heading [data-layer="ink"]').first();
    await expect(ink).toBeAttached();
    await expect
      .poll(() => ink.evaluate((element) => getComputedStyle(element).fontFamily))
      .toContain("Instrument Serif");
    await expect(ink).toHaveCSS("opacity", "0");
    await expect(page.locator("#hero-heading [data-fade]")).toHaveCSS("opacity", "0");
  } finally {
    release();
    await navigation;
  }
  // Delayed hydration can legitimately cross the readable-content fallback.
  // In either path, releasing the application must leave the heading visible.
  await expect(page.locator('#hero-heading [data-layer="ink"]').first()).toHaveCSS("opacity", "1");
});

test("fresh documents never revive a startup overlay from an old session marker", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("manuelheller:loader-shown", "1");
    const observer = new MutationObserver(() => {
      const overlay = document.querySelector('[data-testid="loader-overlay"]');
      if (overlay && getComputedStyle(overlay).display !== "none") {
        document.documentElement.dataset.introSeen = "true";
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true, attributes: true });
  });
  await page.goto("/de/");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro-seen", "true");
  await expect(page.getByTestId("loader-overlay")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-intro-seen", "true");
  await expect(page.getByTestId("loader-overlay")).toHaveCount(0);
});

const fullCanvas = '[data-scene="root"] canvas, [data-testid="mobile-bg-sim"]';

for (const renderer of [
  "NVIDIA GeForce RTX 3080",
  "Unknown desktop GPU",
  "Intel(R) Iris(R) Xe Graphics",
]) {
  test(`${renderer} starts with Animation and never promotes itself to Simulation`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.clock.install();
    await page.addInitScript((name) => {
      window.requestAnimationFrame = (callback) =>
        window.setTimeout(() => callback(performance.now()), 16);
      window.cancelAnimationFrame = (id) => window.clearTimeout(id);
      // A fast cached physics tier is the strongest invitation to promote.
      localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "high", ts: Date.now() }));
      const original = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (parameter) {
        return parameter === 37446 ? name : original.call(this, parameter);
      };
      WebGL2RenderingContext.prototype.drawArrays = () => {};
    }, renderer);
    await page.goto("/de/");
    const lite = page.getByTestId("lite-ink-canvas");
    await expect(lite).toBeVisible({ timeout: 15000 });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.clock.runFor(20000);
    await expect(lite).toBeVisible();
    await expect(page.locator(fullCanvas)).toHaveCount(0);
    await page.getByRole("button", { name: "Visuals", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Animation", exact: true })).toBeChecked();
  });
}

test("studio hint returns and is dismissed when the studio opens", async ({ page }) => {
  await page.goto("/de/");
  await expect(page.getByTestId("ink-studio-hint")).toContainText("Change the look!", {
    timeout: 10000,
  });
  await expect(page.getByTestId("ink-studio-hint").locator("svg")).toBeVisible();
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await expect(page.getByTestId("ink-studio-hint")).toHaveCount(0);
});

test("studio hint shows its complete copy as soon as it appears", async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const note = document.querySelector('[data-testid="ink-studio-hint"]');
      if (!note) return;
      document.documentElement.dataset.firstHintCopy = note.textContent?.trim();
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/de/");
  await expect(page.locator("html")).toHaveAttribute("data-first-hint-copy", "Change the look!", {
    timeout: 10000,
  });
});

test("content stays readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/de/");
    await expect(page.locator('#hero-heading [data-layer="ink"]').first()).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(page.getByTestId("loader-overlay")).toBeHidden();
  } finally {
    await context.close();
  }
});

test("failed application scripts fall back to readable server content", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/de/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "static");
  await expect(page.locator('#hero-heading [data-layer="ink"]').first()).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("loader-overlay")).toBeHidden();
});

test("an explicit Simulation is never downgraded by cold-start or sustained stalls", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.clock.install();
  await page.addInitScript(() => {
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 34);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
    localStorage.setItem("manus-ink-mode", "full");
    WebGL2RenderingContext.prototype.drawArrays = () => {};
  });
  await page.goto("/de/");
  const full = page.locator(fullCanvas);
  await expect(full).toBeVisible({ timeout: 15000 });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  // Every frame is late, far past the two windows Animation would need.
  await page.clock.runFor(6000 + 181 * 34 + 14000);
  await expect(full).toBeVisible();
  await expect(page.getByTestId("lite-ink-canvas")).toHaveCount(0);
  await expect(page.getByTestId("ink-studio").getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Simulation", exact: true })).toBeChecked();
});

test("an uncached GPU is sampled only after an explicit simulation has warmed up", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop renderer is the one under test");
  test.setTimeout(90000);
  await page.clock.install();
  await page.addInitScript(() => {
    localStorage.removeItem("manus-gpu-tier");
    localStorage.setItem("manus-ink-mode", "full");
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter) {
      return parameter === 37446 ? "Unknown desktop GPU" : original.call(this, parameter);
    };
    // Controlled timings test when sampling occurs, not the host GPU's speed.
    WebGL2RenderingContext.prototype.drawArrays = () => {};
    new MutationObserver(() => {
      const root = document.documentElement;
      if (root.dataset.simMountedAt || !document.querySelector('[data-scene="root"] canvas'))
        return;
      root.dataset.simMountedAt = String(performance.now());
    }).observe(document, { childList: true, subtree: true });
    WebGL2RenderingContext.prototype.finish = () => {
      const root = document.documentElement;
      root.dataset.firstGpuSampleAt ??= String(performance.now());
      root.dataset.gpuSamples = String(Number(root.dataset.gpuSamples ?? 0) + 1);
    };
  });
  await page.goto("/de/");
  const full = page.locator('[data-scene="root"] canvas');
  await expect(full).toBeVisible({ timeout: 15000 });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(15000);
  const sampleCount = await page.locator("html").getAttribute("data-gpu-samples");
  expect(Number(sampleCount)).toBeGreaterThanOrEqual(30);
  // A frame can already be queued before React commits the resolved tier.
  expect(Number(sampleCount)).toBeLessThanOrEqual(40);
  await page.clock.runFor(5000);
  await expect(page.locator("html")).toHaveAttribute("data-gpu-samples", String(sampleCount));
  const firstSampleDelay = await page.evaluate(() => {
    const { firstGpuSampleAt, simMountedAt } = document.documentElement.dataset;
    return Number(firstGpuSampleAt) - Number(simMountedAt);
  });
  expect(firstSampleDelay).toBeGreaterThanOrEqual(6000);
  await expect(full).toBeVisible();
  await expect(page.getByTestId("lite-ink-canvas")).toHaveCount(0);
});
