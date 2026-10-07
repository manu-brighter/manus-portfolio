import { expect, type Page, test } from "@playwright/test";

const KEY = "manus-ink-mode";
const fullCanvas = '[data-scene="root"] canvas, [data-testid="mobile-bg-sim"]';
async function openStudio(page: Page) {
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  return page.getByTestId("ink-studio-panel");
}

test("ordinary home starts with light ink and a closed studio, even with a cached static physics tier", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "static", ts: Date.now() }));
  });
  await page.goto("/de/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(fullCanvas)).toHaveCount(0);
  await expect(page.getByTestId("ink-studio-panel")).toBeHidden();
  const panel = await openStudio(page);
  await expect(
    panel.getByRole("radio", { name: isMobile ? "Animation" : "Auto", exact: true }),
  ).toBeChecked();
  await expect(panel.getByRole("radio", { name: "Simulation", exact: true })).toBeDisabled();
});

test("manual mode persists and native keyboard controls can return to light ink", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
  });
  await page.goto("/de/");
  let panel = await openStudio(page);
  const full = panel.getByRole("radio", { name: "Simulation", exact: true });
  await full.focus();
  await full.press("Space");
  await expect(page.locator(fullCanvas)).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe("full");
  await page.reload();
  await expect(page.locator(fullCanvas)).toBeVisible({ timeout: 15000 });
  panel = await openStudio(page);
  await expect(panel.getByRole("radio", { name: "Simulation", exact: true })).toBeChecked();
  await panel.getByRole("radio", { name: "Animation", exact: true }).check();
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe("light");
});

test("temporary QA overrides do not overwrite saved choices, including interaction", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("manus-ink-mode", "full"));
  await page.goto("/de/?ink-preview=light");
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  const panel = await openStudio(page);
  await panel.getByRole("radio", { name: "Auto", exact: true }).check();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe("full");
});

test("blocked storage preserves functional studio controls", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/de/");
  const panel = await openStudio(page);
  await panel.getByRole("radio", { name: "Animation", exact: true }).check();
  await expect(page.getByTestId("lite-ink-canvas")).toBeVisible({ timeout: 15000 });
  await expect(panel.getByRole("radio", { name: "Animation", exact: true })).toBeChecked();
  expect(errors).toEqual([]);
});

test("studio supports theme keyboard selection, Escape and outside dismissal on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/de/");
  const panel = await openStudio(page);
  const night = panel.getByRole("radio", { name: "Night Shift", exact: true });
  await night.focus();
  await night.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-sim-theme", "night");
  await night.press("Escape");
  await expect(panel).toBeHidden();
  const toggle = page.getByRole("button", { name: "Visuals", exact: true });
  await expect(toggle).toBeFocused();
  await toggle.press("Enter");
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  if (!bounds) throw new Error("Expected open studio bounds");
  await page.mouse.click(bounds.x / 2, bounds.y + bounds.height / 2);
  await expect(panel).toBeHidden();
});

test("light renderer failure is reported honestly", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
      if (this.dataset.testid === "lite-ink-canvas") {
        document.documentElement.dataset.liteAttempted = "true";
        return null;
      }
      return original.apply(this, args as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/de/?ink-preview=light");
  const panel = await openStudio(page);
  await expect(page.locator("html")).toHaveAttribute("data-lite-attempted", "true", {
    timeout: 15000,
  });
  await expect(panel.getByText(/Diese Tintenansicht ist auf deinem Gerät/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("lite-ink-canvas")).toHaveCount(0);
});

test("no WebGL still exposes theme settings and an honest status", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
      if (args[0] === "webgl2") return null;
      return original.apply(this, args as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/de/");
  const panel = await openStudio(page);
  await expect(panel.getByText(/Diese Tintenansicht ist auf deinem Gerät/)).toBeVisible();
  await expect(panel.getByRole("radio", { name: "Simulation", exact: true })).toBeDisabled();
  const night = panel.getByRole("radio", { name: "Night Shift", exact: true });
  await night.focus();
  await night.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-sim-theme", "night");
});

test("Auto reduces the light budget after sustained stalls and respects a manual full override", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Desktop Auto starts with simulation; its fallback has a separate regression",
  );
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.clock.install();
  await page.addInitScript(() => {
    // Drive the real GSAP ticker through clock-controlled frame deliveries.
    // Native RAF can stop on Windows WebKit even without shader work; each
    // timer delivers a deliberately late frame without burning CPU or waiting
    // for the browser compositor. Keep context creation and canvas allocation.
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 34);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    WebGL2RenderingContext.prototype.drawArrays = () => {};
    localStorage.setItem("manus-gpu-tier", JSON.stringify({ tier: "minimal", ts: Date.now() }));
  });
  await page.goto("/de/");
  const canvas = page.getByTestId("lite-ink-canvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  const panel = await openStudio(page);
  const light = panel.getByRole("radio", { name: "Animation", exact: true });
  await light.focus();
  await light.press("Space");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  // Re-enter Auto with the clock paused so startup and action timing cannot
  // contribute samples. Keyboard activation needs no compositor-stability wait.
  const auto = panel.getByRole("radio", { name: "Auto", exact: true });
  await auto.focus();
  await auto.press("Space");
  await expect(auto).toBeChecked();
  await auto.press("Escape");
  const initialPixels = await canvas.evaluate(
    (element) => (element as HTMLCanvasElement).width * (element as HTMLCanvasElement).height,
  );
  expect(initialPixels).toBeGreaterThan(450000);
  await page.clock.runFor(6000); // Observer warmup.
  await page.clock.runFor(90 * 34); // One complete slow window must not reduce.
  expect(
    await canvas.evaluate(
      (element) => (element as HTMLCanvasElement).width * (element as HTMLCanvasElement).height,
    ),
  ).toBe(initialPixels);
  await page.clock.runFor(91 * 34); // Second window plus the renderer's resize tick.
  await expect(page.getByTestId("ink-studio").getByRole("status")).toContainText("weniger Details");
  await page.clock.runFor(34); // Let the committed React quality change reach the renderer.
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate(
        (element) => (element as HTMLCanvasElement).width * (element as HTMLCanvasElement).height,
      ),
    )
    .toBeLessThanOrEqual(450000);
  expect(
    await canvas.evaluate(
      (element) => (element as HTMLCanvasElement).width * (element as HTMLCanvasElement).height,
    ),
  ).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Visuals", exact: true }).press("Enter");
  await expect(panel.getByRole("radio", { name: "Auto", exact: true })).toBeChecked();
  const full = panel.getByRole("radio", { name: "Simulation", exact: true });
  await full.focus();
  await full.press("Space");
  await page.clock.runFor(6000 + 181 * 34);
  await expect(full).toBeChecked();
  await expect(canvas).toHaveCount(0);
  await expect(page.locator(fullCanvas)).toBeVisible();
  await expect(page.getByText(/Auto nutzt jetzt Animation mit weniger Details/)).toHaveCount(0);
  await auto.focus();
  await auto.press("Space");
  await page.clock.runFor(34);
  await expect(canvas).toBeVisible();
  expect(
    await canvas.evaluate(
      (element) => (element as HTMLCanvasElement).width * (element as HTMLCanvasElement).height,
    ),
  ).toBeLessThanOrEqual(450000);
});

test("reduced motion wins over full mode while themes remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/de/?ink-preview=full");
  const panel = await openStudio(page);
  await expect(panel.getByText(/Deine Systemeinstellung für reduzierte Bewegung/)).toBeVisible();
  await expect(panel.getByRole("radio", { name: "Simulation", exact: true })).toBeDisabled();
  const night = panel.getByRole("radio", { name: "Night Shift", exact: true });
  await night.focus();
  await night.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-sim-theme", "night");
  await expect(page.getByTestId("lite-ink-canvas")).toHaveCount(0);
  await expect(page.locator(fullCanvas)).toHaveCount(0);
});
