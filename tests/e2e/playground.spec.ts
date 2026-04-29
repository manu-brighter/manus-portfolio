import { expect, test } from "@playwright/test";

// Phase 10 — Playground experiment routes.
// Sprint 1 ships the route shell + scene-visibility plumbing; the
// experiments themselves are stubs until Sprints 2 and 3.

test.describe("playground experiment routes", () => {
  test("ink-drop-studio renders with chrome and back link", async ({ page }) => {
    await page.goto("/de/playground/ink-drop-studio");
    await expect(page.getByRole("heading", { name: /Ink Drop Studio/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /ZURÜCK ZUM PLAYGROUND/i })).toHaveAttribute(
      "href",
      /\/de\/?#playground/,
    );
  });

  test("type-as-fluid renders with chrome, input field, and back link", async ({ page }) => {
    await page.goto("/de/playground/type-as-fluid");
    await expect(page.getByRole("heading", { name: /Type-as-Fluid/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /ZURÜCK ZUM PLAYGROUND/i })).toBeVisible();
    await expect(page.getByLabel(/TIPPE EIN WORT/i)).toBeVisible();
  });

  test("type-as-fluid: typing into the input updates the value", async ({ page }) => {
    await page.goto("/de/playground/type-as-fluid");
    const input = page.getByLabel(/TIPPE EIN WORT/i);
    await input.fill("HELLER");
    await expect(input).toHaveValue("HELLER");
  });

  test("reduced-motion: type-as-fluid shows fallback, no canvas", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/de/playground/type-as-fluid");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByText(/blende ich die Animation aus/i)).toBeVisible();
    await context.close();
  });

  test("unknown slug renders a 404", async ({ page }) => {
    const response = await page.goto("/de/playground/does-not-exist");
    // Static export emits a 404 page rather than a real HTTP 404 in dev,
    // but Playwright's request handling treats the response status
    // separately from page rendering. Either signal is acceptable.
    const status = response?.status() ?? 200;
    const bodyHasNotFound = await page.locator("body").textContent();
    expect(status === 404 || /not found|404/i.test(bodyHasNotFound ?? "")).toBeTruthy();
  });

  test("root scene canvas is unmounted on experiment route", async ({ page }) => {
    await page.goto("/de/playground/ink-drop-studio");
    // The persistent SceneCanvas tags itself with `data-scene="root"`
    // — that flag is what distinguishes it from any per-experiment
    // canvas (Ink Drop Studio mounts its own to host the orchestrator).
    // Inside an experiment route the visibility-gate store should
    // unmount the root one.
    const rootSceneCanvas = page.locator('canvas[data-scene="root"]');
    await expect(rootSceneCanvas).toHaveCount(0);
  });

  test("ink-drop-studio mounts its own canvas + button row", async ({ page }) => {
    await page.goto("/de/playground/ink-drop-studio");
    // The studio canvas is absolute-positioned within the chrome and
    // has its own aria-hidden marker. We can find at least one canvas
    // on this route once hydration completes.
    const studioCanvas = page.locator("canvas").first();
    await expect(studioCanvas).toBeAttached();
    // Bomb / Freeze / Reset buttons live in the bottom toolbar.
    await expect(page.getByRole("button", { name: /BOMB/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /FREEZE|RESUME/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /RESET/ })).toBeVisible();
  });

  test("reduced-motion: ink-drop-studio shows fallback, no canvas", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/de/playground/ink-drop-studio");
    // Fallback message renders, sim canvas does not mount.
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByText(/blende ich die laufende Simulation aus/i)).toBeVisible();
    await context.close();
  });
});
