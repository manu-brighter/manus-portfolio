import { expect, test } from "@playwright/test";

test.describe("entry and project navigation", () => {
  test("CV is directly reachable from the visible header", async ({ page }) => {
    await page.goto("/de/");
    const cv = page
      .getByRole("navigation", { name: "Hauptnavigation", exact: true })
      .getByRole("link", { name: "CV", exact: true });
    await expect(cv).toBeInViewport();
    await cv.click();
    await expect(page).toHaveURL(/\/de\/cv\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Manuel Heller");
  });

  test.beforeEach(async ({ page }) => {
    // Observe the whole startup, so a short-lived blocking overlay cannot
    // disappear before the assertion and give us a false pass.
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const intro = document.querySelector('[data-testid="loader-overlay"]');
        if (!intro || getComputedStyle(intro).display === "none") return;
        document.documentElement.dataset.introSeen = "true";
        if (getComputedStyle(intro).pointerEvents !== "none") {
          document.documentElement.dataset.introBlocked = "true";
        }
      });
      observer.observe(document, { subtree: true, childList: true });
    });
  });

  test("document startup and reload reveal content without a fullscreen overlay", async ({
    page,
  }) => {
    await page.goto("/de/", { waitUntil: "domcontentloaded" });
    await page.locator('nav a[href="/de/"]:not([hreflang])').click();
    await expect(page.locator("#hero-heading")).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-intro-seen", "true");
    await expect(page.locator("html")).not.toHaveAttribute("data-intro-blocked", "true");

    await page.reload();
    await page.getByRole("button", { name: "Visuals", exact: true }).click();
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

  test("project summaries and case study remain accessible without hover", async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/de/");
    // The mobile destination replaces the server-rendered desktop section
    // after hydration, then loads its carousel chunk. SSR project copy is
    // already visible during that gap and does not prove navigation is ready.
    if (isMobile) {
      await expect(page.getByTestId("cs-carousel-track")).toBeAttached();
    }
    const project = page.locator("#joggediballa");
    await project.scrollIntoViewIfNeeded();
    await expect(project.locator("dt")).toHaveText(["Aufgabe", "Mein Beitrag", "Ergebnis"]);
    await expect(project.locator("dd").last()).toContainText("Vereinsalltag und Eventabend");
    await project.getByRole("link", { name: /Case Study/ }).click();
    await expect
      .poll(() => page.locator("#case-study").evaluate((el) => el.getBoundingClientRect().top))
      .toBeLessThan(150);

    await page
      .locator("#portfolio")
      .getByRole("link", { name: /Diese Seite/ })
      .click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(150);
  });
});
