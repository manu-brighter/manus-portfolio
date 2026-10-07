// tests/e2e/misreg-a11y.spec.ts
import { expect, test } from "@playwright/test";

/**
 * `.misreg-hover` draws its mint/rose ghosts with
 * `content: attr(data-text)`. Those pseudo-elements are always
 * generated (opacity 0 at rest), and generated content counts towards
 * the accessible text, so screen readers read each skill name three
 * times. The CSS alt text (`content: attr(data-text) / ""`) has to keep
 * the ghosts out of the accessibility tree.
 *
 * Two independent checks per skill item:
 *   - Playwright's accname implementation (aria snapshot), which honours
 *     CSS alt text the way the spec describes.
 *   - Chromium's real accessibility tree over CDP: exactly one text node
 *     carries the skill name inside its list item.
 */

const ITEM_SELECTOR = "#skills ul > li:has(.misreg-hover)";

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test.describe("misreg ghosts stay out of the accessibility tree", () => {
  test("skill list items expose each name once", async ({ page, browserName }) => {
    await page.goto("/de/");
    const items = page.locator(ITEM_SELECTOR);
    await expect(items.first()).toBeAttached();
    const count = await items.count();
    expect(count).toBeGreaterThan(5);

    const cdp = browserName === "chromium" ? await page.context().newCDPSession(page) : null;
    if (cdp) await cdp.send("Accessibility.enable");

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const name = (await item.locator(".misreg-hover").getAttribute("data-text")) ?? "";
      expect(name, "skill item needs data-text").not.toBe("");

      const snapshot = await item.ariaSnapshot();
      expect(countOccurrences(snapshot, name), `aria snapshot of "${name}": ${snapshot}`).toBe(1);

      if (cdp) {
        const { result } = await cdp.send("Runtime.evaluate", {
          expression: `document.querySelectorAll(${JSON.stringify(ITEM_SELECTOR)})[${i}]`,
        });
        const { nodes } = await cdp.send("Accessibility.queryAXTree", {
          objectId: result.objectId,
          accessibleName: name,
        });
        const textNodes = nodes.filter((n) => n.role?.value === "StaticText" && n.ignored !== true);
        expect(textNodes.length, `Chromium AX text nodes named "${name}"`).toBe(1);
      }
    }
  });
});
