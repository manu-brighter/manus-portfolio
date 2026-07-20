// tests/e2e/side-projects-rail.spec.ts
import { expect, test } from "@playwright/test";

/**
 * The Work side-projects strip is a side-scroll rail on phones and a
 * two-column grid from `md` up.
 *
 * It is CSS-only (Tailwind utilities on the container) so Work and
 * SideProjectCard stay server components — there is no JS carousel to
 * assert against, which makes the computed layout the contract.
 *
 * Viewport-driven rather than device-pinned: the switch is a width
 * media query, so this runs meaningfully under every project.
 */

test.describe("Work side-projects rail", () => {
  test("scrolls horizontally with snap points on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/de/");

    const rail = page.getByTestId("side-rail");
    await rail.scrollIntoViewIfNeeded();

    const geo = await rail.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        overflowX: cs.overflowX,
        snap: cs.scrollSnapType,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        cards: el.children.length,
      };
    });

    expect(geo.display).toBe("flex");
    expect(geo.overflowX).toBe("auto");
    expect(geo.snap).toContain("mandatory");
    expect(geo.cards).toBeGreaterThan(1);
    // Actually overflows, otherwise there is nothing to swipe and the
    // next card never peeks (which is the entire affordance).
    expect(geo.scrollWidth).toBeGreaterThan(geo.clientWidth);
    // `overflow-x: auto` forces `overflow-y` to compute to `auto` too.
    // The rail's padding-block has to absorb the cards' hover translate
    // and focus ring, or a nested vertical scrollbar appears.
    expect(geo.scrollHeight).toBe(geo.clientHeight);
  });

  test("reverts to a two-column grid on a desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/de/");

    const rail = page.getByTestId("side-rail");
    await rail.scrollIntoViewIfNeeded();

    const geo = await rail.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        columns: cs.gridTemplateColumns.split(" ").length,
        overflowX: cs.overflowX,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    });

    expect(geo.display).toBe("grid");
    expect(geo.columns).toBe(2);
    expect(geo.overflowX).toBe("visible");
    expect(geo.scrollWidth).toBe(geo.clientWidth);
  });

  test("every card stays a real link", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/de/");

    const links = page.getByTestId("side-rail").locator("a[href]");
    await expect(links).toHaveCount(2);
    for (const href of await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")))) {
      expect(href).toMatch(/^https:\/\/github\.com\//);
    }
  });
});
