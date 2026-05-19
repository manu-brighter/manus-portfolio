// tests/e2e/keyboard-nav.spec.ts
import { devices, expect, test } from "@playwright/test";

/**
 * F-testing-coverage-9: Keyboard navigation E2E.
 *
 * CLAUDE.md "keyboard nav, visible :focus-visible ring" is non-negotiable.
 * Axe tests verify markup structure but cannot simulate Tab-focus order
 * or focus management. These tests cover:
 *
 *   1. Skip-link: first Tab from a fresh load focuses the skip-link,
 *      Enter navigates focus to #main (or its first focusable child).
 *   2. Nav Tab order: each nav item receives a visible :focus-visible
 *      outline when focused via Tab.
 *   3. Locale-switcher Escape return: Tab to the active locale button,
 *      Enter to expand, Escape to collapse — focus returns to the trigger.
 *
 * Desktop Chrome only (keyboard nav is consistent enough that mobile-
 * chrome adds no new signal at this layer).
 */

test.use({ ...devices["Desktop Chrome"] });

test.describe("keyboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/");
    // Move focus to <body> so Tab starts from a predictable origin.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
  });

  test("first Tab focuses the skip-link", async ({ page }) => {
    await page.keyboard.press("Tab");

    const activeId = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      // Return class or tag name to identify the skip-link
      return {
        tag: el.tagName.toLowerCase(),
        href: (el as HTMLAnchorElement).getAttribute?.("href"),
        className: (el as HTMLElement).className,
      };
    });

    expect(activeId?.tag).toBe("a");
    expect(activeId?.href).toBe("#main");
  });

  test("skip-link Enter moves focus to #main", async ({ page }) => {
    await page.keyboard.press("Tab");
    // Confirm we're on the skip-link.
    const onSkipLink = await page.evaluate(
      () => document.activeElement?.getAttribute?.("href") === "#main",
    );
    expect(onSkipLink).toBe(true);

    await page.keyboard.press("Enter");

    // Focus should now be on #main or its first focusable child.
    const focusedId = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return (el as HTMLElement).id || (el.closest("[id]") as HTMLElement | null)?.id || null;
    });
    expect(focusedId).toBe("main");
  });

  test("nav items have visible focus outline when focused via Tab", async ({ page }) => {
    // Tab past the skip-link into the nav area.
    // Layout: skip-link → brand link → [hamburger (hidden on desktop)] → nav items
    // Tab enough times to land on at least one nav item.
    const MAX_TABS = 12;
    let foundNavItem = false;

    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        // Only check elements inside <nav>
        const nav = el.closest("nav");
        if (!nav) return null;
        const style = getComputedStyle(el);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      });

      if (outline) {
        foundNavItem = true;
        // A visible focus outline must have a non-"none" style and non-zero width.
        expect(outline.outlineStyle, "nav item should have visible outline style").not.toBe("none");
        expect(outline.outlineWidth, "nav item should have non-zero outline width").not.toBe("0px");
      }
    }

    expect(
      foundNavItem,
      "at least one nav item should have been focused during Tab traversal",
    ).toBe(true);
  });

  test("locale-switcher Escape collapses and focus returns to trigger", async ({ page }) => {
    // Tab to find the active locale button (aria-expanded is set on it).
    const MAX_TABS = 15;
    let expandedTrigger = false;

    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        return {
          ariaExpanded: el.getAttribute("aria-expanded"),
          ariaCurrent: el.getAttribute("aria-current"),
          tag: el.tagName.toLowerCase(),
        };
      });

      // The active locale button has aria-current="true" and aria-expanded
      if (info?.tag === "button" && info.ariaCurrent === "true" && info.ariaExpanded !== null) {
        expandedTrigger = true;

        // Open the locale switcher.
        await page.keyboard.press("Enter");

        // aria-expanded should now be "true".
        const openState = await page.evaluate(() =>
          document.activeElement?.getAttribute("aria-expanded"),
        );
        expect(openState).toBe("true");

        // Capture the trigger element for later focus comparison.
        const triggerLabel = await page.evaluate(
          () => (document.activeElement as HTMLElement | null)?.getAttribute("aria-label") ?? "",
        );

        // Collapse with Escape.
        await page.keyboard.press("Escape");

        // aria-expanded should now be "false".
        const closedState = await page.evaluate(() =>
          document.activeElement?.getAttribute("aria-expanded"),
        );
        expect(closedState).toBe("false");

        // Focus should have returned to the trigger (same aria-label).
        const afterLabel = await page.evaluate(
          () => (document.activeElement as HTMLElement | null)?.getAttribute("aria-label") ?? "",
        );
        expect(afterLabel).toBe(triggerLabel);

        break;
      }
    }

    expect(
      expandedTrigger,
      "should have found and interacted with the locale-switcher trigger",
    ).toBe(true);
  });
});
