// tests/e2e/case-study.spec.ts
import { expect, test } from "@playwright/test";

test.describe("@case-study fallback breakpoint", () => {
  test("desktop ≥900px height renders diorama track", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    // Desktop branch has the inner 420vh-wide track div as a child
    // of the section. Fallback branch has only the .container-page
    // children directly under the section.
    const track = section.locator(`> div[style*="width:420vh"]`);
    await expect(track, "diorama track must mount on desktop").toHaveCount(1);
  });

  test("low-height viewport ≤899px renders vertical fallback", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    const track = section.locator(`> div[style*="width:420vh"]`);
    await expect(track, "diorama track must NOT mount on short viewport").toHaveCount(0);
    // Fallback uses .container-page wrapper.
    const fallbackContainer = section.locator("> div.container-page");
    await expect(fallbackContainer, "fallback container must mount").toHaveCount(1);
  });

  test("narrow viewport <768px width renders vertical fallback", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/de/");
    const section = page.locator("section#case-study");
    await expect(section).toBeVisible();
    const track = section.locator(`> div[style*="width:420vh"]`);
    await expect(track, "diorama track must NOT mount on mobile").toHaveCount(0);
  });
});
