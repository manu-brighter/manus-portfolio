// tests/e2e/work-links.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Work cards carry two destinations: the card itself (case study /
 * back to hero) and a secondary external link (the live club site, the
 * portfolio's source). The secondary link sits in its own row after the
 * card anchor, so no anchor may be nested in another and it must
 * receive its own clicks.
 */

test.describe("Work card secondary links", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/");
    await page.locator("#work").scrollIntoViewIfNeeded();
  });

  test("no nested anchors in the Work section", async ({ page }) => {
    await expect(page.locator("#work a a")).toHaveCount(0);
  });

  test("Jogge di Balla card links to the live site", async ({ page }) => {
    const card = page.locator("#joggediballa");
    const live = card.locator('a[href="https://joggediballa.ch"]');
    await expect(live).toHaveCount(1);
    await expect(live).toHaveAttribute("target", "_blank");
    await expect(live).toHaveAccessibleName(/^joggediballa\.ch/);
    await live.scrollIntoViewIfNeeded();
    // Actionability includes the hit test: fails if something else
    // would swallow the click.
    await live.click({ trial: true });
    // The card link itself is untouched.
    await expect(card.getByRole("link", { name: /Case Study/ })).toHaveCount(1);
  });

  test("hovering the secondary link does not press the CTA stamp", async ({ page }) => {
    const card = page.locator("#joggediballa");
    const cardLink = card.getByRole("link", { name: /Case Study/ });
    const stamp = cardLink.locator("span", { hasText: "Case Study" }).first();
    const live = card.locator('a[href="https://joggediballa.ch"]');
    const stampTranslate = () => stamp.evaluate((el) => getComputedStyle(el).translate);

    await live.scrollIntoViewIfNeeded();
    await live.hover();
    await page.waitForTimeout(300);
    expect(await stampTranslate()).toBe("none");

    await card.locator("h3").hover();
    await expect.poll(stampTranslate).not.toBe("none");
  });

  test("Portfolio card links to its source", async ({ page }) => {
    const card = page.locator("#portfolio");
    const source = card.locator('a[href="https://github.com/manu-brighter/manus-portfolio"]');
    await expect(source).toHaveCount(1);
    await expect(source).toHaveAccessibleName(/^Source/);
    await expect(source).toHaveAttribute("lang", "en");
    await source.scrollIntoViewIfNeeded();
    await source.click({ trial: true });
  });
});
