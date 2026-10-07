// tests/e2e/tile-reveal-gallery.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * Off-the-screen tile overlay as a gallery: prev/next buttons, arrow
 * keys and a touch swipe walk through every revealable tile (pingpong
 * has no master and stays out), with wrap-around, a counter, a live
 * region, a Tab trap over the three controls, and focus restored to
 * the tile of the picture shown LAST.
 *
 * The overlay is a fixed div, not a <dialog>, and the mobile hamburger
 * keeps a permanent role="dialog" node, so select it by its label.
 */

const OVERLAY = '[aria-labelledby="tile-reveal-caption"]';
const TOTAL = 5;

async function openTile(page: Page, name: RegExp) {
  await page.goto("/de/");
  const tile = page.locator("#about-objects button", { hasText: name }).first();
  await tile.scrollIntoViewIfNeeded();
  await tile.click();
  const overlay = page.locator(OVERLAY);
  await expect(overlay).toBeVisible();
  return overlay;
}

test.describe("@about tile reveal gallery", () => {
  test("arrow keys and buttons page through every revealable tile with wrap-around", async ({
    page,
  }) => {
    const overlay = await openTile(page, /Kamera/);
    const counter = overlay.getByTestId("tile-reveal-counter");
    const figure = overlay.getByTestId("tile-reveal-figure");
    await expect(counter).toHaveText(`1 / ${TOTAL}`);
    await expect(figure).toHaveAttribute("data-tile", "camera");
    // Focus starts on close, as before the gallery existed.
    await expect(overlay.getByRole("button", { name: "Schliessen" })).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText(`2 / ${TOTAL}`);
    await expect(figure).toHaveAttribute("data-tile", "audi");
    await expect(figure).toHaveAttribute("data-tile-nav", "next");

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(counter).toHaveText(`${TOTAL} / ${TOTAL}`);
    await expect(figure).toHaveAttribute("data-tile", "tauchen");
    await expect(figure).toHaveAttribute("data-tile-nav", "prev");

    await overlay.getByRole("button", { name: "Nächstes Bild" }).click();
    await expect(counter).toHaveText(`1 / ${TOTAL}`);
    await overlay.getByRole("button", { name: "Vorheriges Bild" }).click();
    await expect(counter).toHaveText(`${TOTAL} / ${TOTAL}`);

    // pingpong (no master) never appears in the walk.
    for (let i = 0; i < TOTAL; i++) {
      await page.keyboard.press("ArrowRight");
      await expect(figure).not.toHaveAttribute("data-tile", "pingpong");
    }

    // The live region announces the switch with counter, name and caption.
    await expect(overlay.locator("[aria-live='polite']")).toContainText(`${TOTAL} / ${TOTAL}`);
    await expect(overlay.locator("[aria-live='polite']")).toContainText("Tiefe");
  });

  test("Tab cycles prev, next, close without leaving the overlay", async ({ page }) => {
    const overlay = await openTile(page, /Kamera/);
    const prev = overlay.getByRole("button", { name: "Vorheriges Bild" });
    const next = overlay.getByRole("button", { name: "Nächstes Bild" });
    const close = overlay.getByRole("button", { name: "Schliessen" });
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(prev).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(next).toBeFocused();
  });

  test("closing restores focus to the tile that was showing last", async ({ page }) => {
    const overlay = await openTile(page, /Kamera/);
    await page.keyboard.press("ArrowRight");
    await expect(overlay.getByTestId("tile-reveal-counter")).toHaveText(`2 / ${TOTAL}`);
    await page.keyboard.press("Escape");
    await expect(page.locator(OVERLAY)).toHaveCount(0);
    const focusedName = await page.evaluate(() => document.activeElement?.textContent ?? "");
    expect(focusedName).toContain("Audi");
  });

  test("@a11y the open overlay has no axe violations after a switch", async ({ page }) => {
    const overlay = await openTile(page, /Kamera/);
    await page.keyboard.press("ArrowRight");
    await expect(overlay.getByTestId("tile-reveal-counter")).toHaveText(`2 / ${TOTAL}`);
    // Let the switch snap settle so contrast is measured on the final frame.
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page })
      .include(OVERLAY)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("a horizontal touch swipe pages, a vertical one does not", async ({ page }) => {
    const overlay = await openTile(page, /Kamera/);
    const counter = overlay.getByTestId("tile-reveal-counter");
    const swipe = async (dx: number, dy: number) => {
      await overlay.evaluate(
        (el, [x, y]) => {
          const at = (type: string, cx: number, cy: number) =>
            el.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                pointerType: "touch",
                clientX: cx,
                clientY: cy,
              }),
            );
          at("pointerdown", 300, 300);
          at("pointerup", 300 + x, 300 + y);
        },
        [dx, dy] as const,
      );
    };
    await swipe(-120, 10);
    await expect(counter).toHaveText(`2 / ${TOTAL}`);
    await swipe(120, -5);
    await expect(counter).toHaveText(`1 / ${TOTAL}`);
    await swipe(-120, 200);
    await expect(counter).toHaveText(`1 / ${TOTAL}`);
  });
});
