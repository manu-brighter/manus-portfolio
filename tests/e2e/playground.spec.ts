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

  test("type-as-fluid renders with chrome and back link", async ({ page }) => {
    await page.goto("/de/playground/type-as-fluid");
    await expect(page.getByRole("heading", { name: /Type-as-Fluid/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /ZURÜCK ZUM PLAYGROUND/i })).toBeVisible();
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
    // The persistent SceneCanvas mounts a <canvas aria-hidden="true">
    // at z-0 in the locale layout. Inside an experiment route the
    // store should hide it — assert no such canvas exists.
    const heroCanvas = page.locator('canvas[aria-hidden="true"]');
    await expect(heroCanvas).toHaveCount(0);
  });
});
