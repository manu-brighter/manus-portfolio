import { expect, test } from "@playwright/test";

test.describe("entry and project navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Observe the whole startup, so a short-lived blocking overlay cannot
    // disappear before the assertion and give us a false pass.
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const intro = document.querySelector('[data-testid="loader-overlay"]');
        if (!intro) return;
        document.documentElement.dataset.introSeen = "true";
        if (getComputedStyle(intro).pointerEvents !== "none") {
          document.documentElement.dataset.introBlocked = "true";
        }
      });
      observer.observe(document, { subtree: true, childList: true });
    });
  });

  test("first entry never blocks navigation and reload skips the introduction", async ({
    page,
  }) => {
    await page.goto("/de/", { waitUntil: "domcontentloaded" });
    await page.locator('nav a[href="/de/"]').click();
    await expect(page.locator("#hero-heading")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("manuelheller:loader-shown")))
      .toBe("1");
    await expect(page.locator("html")).not.toHaveAttribute("data-intro-blocked", "true");

    await page.reload();
    await page.getByRole("button", { name: "Tintenstudio", exact: true }).click();
    await expect(page.getByTestId("ink-studio-panel")).toBeVisible();
    await expect(page.locator("#hero-heading")).toBeVisible();
    await expect(page.getByTestId("loader-overlay")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-intro-seen", "true");
  });

  test("reduced motion and unavailable storage still reveal the hero", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("Storage unavailable", "SecurityError");
        },
      });
    });
    await page.goto("/de/");
    await expect(page.locator("#hero-heading")).toBeVisible();
    await expect(page.locator("#hero-heading")).toContainText("Heller");
    await expect(page.locator("#hero-heading")).toContainText("Manuel");
    await expect(page.locator("#hero-heading [data-layer]")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-intro-seen", "true");
  });

  test("project summaries and case study remain accessible without hover", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/de/");
    const project = page.locator("#joggediballa");
    await project.scrollIntoViewIfNeeded();
    await expect(project.locator("dt")).toHaveText(["Aufgabe", "Mein Beitrag", "Ergebnis"]);
    await expect(project.locator("dd").last()).toContainText("Regelmässig im Einsatz");
    await project.getByRole("link").click();
    await expect
      .poll(() => page.locator("#case-study").evaluate((el) => el.getBoundingClientRect().top))
      .toBeLessThan(150);

    await page.locator("#portfolio").getByRole("link").click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(150);
  });
});
