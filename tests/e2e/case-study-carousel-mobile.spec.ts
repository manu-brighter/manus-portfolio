// tests/e2e/case-study-carousel-mobile.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-Rework — Case-Study side-swipe carousel.
 *
 * On Mobile the Desktop horizontal-pin Diorama is replaced by a
 * side-swipeable carousel of the 4 narrative stations (no fluid sim —
 * the per-station sim was removed). This spec verifies:
 *   - 4 station slides render with stable testids
 *   - 4 pagination dots + prev/next controls work (aria-current/aria-live)
 *   - no sim canvas mounts in the carousel
 *   - the Desktop DioramaTrack does NOT mount on Mobile
 */

test.use({ ...devices["Pixel 5"] });

test.describe("Case Study mobile carousel", () => {
  test("renders 4 station slides + 4 pagination dots", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid^="cs-station-"]')).toHaveCount(4);
    await expect(page.locator('[data-testid="cs-carousel-dot"]')).toHaveCount(4);
  });

  test("prev/next exist; start state has prev disabled, next enabled", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    const prev = page.locator('[data-testid="cs-carousel-prev"]');
    const next = page.locator('[data-testid="cs-carousel-next"]');

    await expect(prev).toBeVisible();
    await expect(next).toBeVisible();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
  });

  test("pagination dot click advances index + aria-current updates", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    const dots = page.locator('[data-testid="cs-carousel-dot"]');

    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");

    await dots.nth(2).click();
    await page.waitForTimeout(600);

    await expect(dots.nth(2)).toHaveAttribute("aria-current", "true");
  });

  test("aria-live region announces the active station", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    const live = page.locator('[data-testid="cs-carousel-live"]');
    await page.locator('[data-testid="cs-carousel-next"]').click();
    await page.waitForTimeout(400);
    // DE locale: "Station 2 von 4: …"
    await expect(live).toContainText(/2.*4/);
  });

  test("no fluid-sim canvas mounts in the carousel", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#case-study canvas")).toHaveCount(0);
  });

  test("does NOT mount the Desktop DioramaTrack on Mobile", async ({ page }) => {
    await page.goto("/de/#case-study");
    await page.waitForLoadState("networkidle");

    // DioramaTrack is the horizontal-pin wrapper; on Mobile it must not
    // mount because Mobile takes the early-return branch in CaseStudy.tsx.
    await expect(page.locator('[data-testid="diorama-track"]')).toHaveCount(0);
  });
});
