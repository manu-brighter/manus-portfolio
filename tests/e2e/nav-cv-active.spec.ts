// tests/e2e/nav-cv-active.spec.ts
import { expect, test } from "@playwright/test";

/**
 * The CV nav link marks itself as the current page on /cv. With
 * `trailingSlash: true` the route can surface as "/cv/", so the match
 * normalises the slash: this spec pins both the marker and that path.
 */

test("CV nav link is the current page on /cv and nowhere else", async ({ page }) => {
  await page.goto("/de/cv/");
  const cvLink = page.locator('nav a[href^="/de/cv"]');
  await expect(cvLink).toHaveAttribute("aria-current", "page");

  await page.goto("/de/");
  await expect(cvLink).not.toHaveAttribute("aria-current", "page");
});
