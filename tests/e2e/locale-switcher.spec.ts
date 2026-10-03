// tests/e2e/locale-switcher.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Navbar locale switcher structure (globe toggle + crawlable links).
 *
 * The closed switcher is a single icon toggle; the four options are real
 * `<a href hreflang lang>` links that ship in the static HTML even while
 * collapsed, so crawlers discover every locale variant from every page.
 * locale-switch.spec.ts owns the actual navigation; this spec owns the
 * markup contract and the open/close focus behaviour.
 */

const LOCALES = ["de", "en", "fr", "it"] as const;

test.describe("navbar locale switcher", () => {
  test("closed: icon toggle, crawlable hreflang links, single tab stop", async ({ page }) => {
    await page.goto("/de/cv/");
    const toggle = page.getByTestId("locale-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAccessibleName(/deutsch/i);
    // No visible "DE" code next to "CV" any more: the toggle is an icon.
    await expect(toggle).not.toContainText("DE");

    const panel = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
    await expect(panel).toHaveAttribute("aria-hidden", "true");
    await expect(panel).toBeHidden();

    for (const locale of LOCALES) {
      const link = page.locator(`nav a[hreflang="${locale}"]`);
      await expect(link).toHaveCount(1);
      // Locale-stripped pathname + trailingSlash: /cv -> /<locale>/cv/
      await expect(link).toHaveAttribute("href", `/${locale}/cv/`);
      await expect(link).toHaveAttribute("lang", locale);
      await expect(link).toHaveAttribute("tabindex", "-1");
    }
    await expect(page.locator('nav a[hreflang="de"]')).toHaveAttribute("aria-current", "true");
  });

  test("links are present in the server HTML (no JS needed)", async ({ request }) => {
    const html = await (await request.get("/en/")).text();
    for (const locale of LOCALES) {
      expect(html, `${locale} link in static HTML`).toMatch(
        new RegExp(`<a[^>]*href="/${locale}/"[^>]*hrefLang="${locale}"`, "i"),
      );
    }
  });

  test("opening exposes the links; Escape closes and restores focus", async ({
    page,
    browserName,
  }) => {
    await page.goto("/de/");
    const toggle = page.getByTestId("locale-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const panel = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
    await expect(panel).not.toHaveAttribute("aria-hidden", "true");
    for (const name of ["Deutsch", "English", "Français", "Italiano"]) {
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    }

    // Keyboard reaches the options in order. WebKit skips links on Tab
    // by default (Safari's "Press Tab to highlight each item" is off),
    // so focus the first link directly there.
    if (browserName === "webkit") {
      await page.locator('nav a[hreflang="de"]').focus();
    } else {
      await page.keyboard.press("Tab");
      await expect(page.locator('nav a[hreflang="de"]')).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator('nav a[hreflang="en"]')).toBeFocused();
    }

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(panel).toBeHidden();
  });

  test("clicking the current locale only collapses", async ({ page }) => {
    await page.goto("/de/");
    const toggle = page.getByTestId("locale-toggle");
    await toggle.click();
    await page.getByRole("link", { name: "Deutsch", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/\/de\/$/);
  });

  test("reduced motion swaps instantly without inline animation state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/de/");
    const toggle = page.getByTestId("locale-toggle");
    await toggle.click();
    const panel = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
    await expect(panel).toBeVisible();
    // No GSAP timeline in this branch: classes alone drive the state.
    await expect(panel).not.toHaveAttribute("style", /./);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("open panel stays inside a 360px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/de/");
    await page.getByTestId("locale-toggle").click();
    const list = page.getByRole("list", { name: "Sprache" });
    await expect(list).toBeVisible();
    const box = await list.boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
