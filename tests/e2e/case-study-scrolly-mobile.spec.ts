// tests/e2e/case-study-scrolly-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-Rework Phase 5 — Case-Study vertical scrolly.
 *
 * On Mobile, the horizontal-pin Diorama is replaced by a vertical 4-station
 * scrolly with a single FluidOrchestrator behind it firing splat transitions
 * between stations. This spec verifies:
 *   - 4 stations render with stable testids
 *   - The Mobile sim canvas mounts
 *   - The Desktop DioramaTrack does NOT mount on Mobile
 */

test.use({ ...devices["Pixel 5"] });

test.describe("Case Study mobile scrolly", () => {
  test("renders 4 stations vertically", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    const stations = page.locator('[data-testid^="cs-station-"]');
    await expect(stations).toHaveCount(4);
  });

  test("mounts a single sim canvas behind the stations", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    const sim = page.locator('canvas[data-testid="cs-mobile-sim"]');
    await expect(sim).toHaveCount(1);
  });

  test("does NOT mount the Desktop DioramaTrack on Mobile", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    // DioramaTrack is the horizontal-pin wrapper; on Mobile it must not
    // mount because Mobile takes the early return branch in CaseStudy.tsx.
    // We assert by looking for its station-marker testid (set inside the
    // diorama track) which never renders on the mobile path.
    const diorama = page.locator('[data-testid="diorama-track"]');
    await expect(diorama).toHaveCount(0);
  });
});
