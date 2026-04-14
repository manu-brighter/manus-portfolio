import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home returns 200 and renders <main>", async ({ page }) => {
    const response = await page.goto("/");
    expect(response, "navigation response").not.toBeNull();
    expect(response?.status(), "HTTP status on /").toBeLessThan(400);

    const main = page.locator("main");
    await expect(main, "<main> landmark must exist").toBeVisible();
  });

  test("html has a valid BCP 47 lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang, "html[lang] must be set").not.toBeNull();
    expect(lang ?? "", "html[lang] must match BCP 47 pattern").toMatch(/^[a-z]{2,3}(-[A-Z]{2})?$/);
  });
});
