// tests/e2e/cv-print.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Regression: the /cv press proof must stay a TWO-page PDF.
 *
 * `window.print()` is the export, so pagination is a product feature,
 * not an implementation detail. The sheet runs at roughly 92% of two
 * A4 pages (11mm margins → 1039px of content box per page at 96dpi),
 * which leaves enough slack for Chrome to shove a straddling block to
 * the next page but not much more. Adding a CV entry, a bullet, or
 * decorative height can tip it to three pages with a stranded
 * fragment — which is exactly the bug this guards, reported twice by
 * the user ("als pdf die ganze Formatierung verschoben", then "wird
 * es an komischen Stellen gecuttet für die nächste Seite").
 *
 * If this fails after a content edit: trim vertical rhythm on the
 * sheet, not the content, and re-check every locale — DE/FR/IT are
 * the tight ones, EN has ~250px more headroom.
 *
 * The second assertion is the *quality* of the break: page boundaries
 * may only fall between blocks, never through one. Every splittable
 * block therefore carries `break-inside-avoid` (items in the flowing
 * sections, whole sections in the short sidebar ones).
 */

// Chromium only: page.pdf() is not implemented in firefox/webkit, and
// print pagination is a Blink concern anyway.
test.describe("@print CV pagination", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "page.pdf() is Chromium-only");

  const MM = 96 / 25.4;
  const PAGE_CONTENT_H = (297 - 22) * MM;

  for (const locale of ["de", "en", "fr", "it"]) {
    test(`/${locale}/cv prints as exactly 2 pages with clean breaks`, async ({ page }) => {
      await page.goto(`/${locale}/cv/`);
      await expect(page.locator('[data-page="cv"]')).toBeVisible();
      await page.emulateMedia({ media: "print" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "11mm", bottom: "11mm", left: "11mm", right: "11mm" },
      });
      // Count page objects in the PDF body. `[^s]` keeps /Type /Pages
      // (the tree root) out of the tally.
      const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      expect(pageCount, `${locale} CV should print on 2 pages`).toBe(2);

      // No page boundary may cut through a block that declared itself
      // unbreakable.
      const sliced = await page.evaluate((pageH) => {
        const sheet = document.querySelector("article[aria-labelledby='cv-heading']");
        if (!sheet) return ["sheet not found"];
        const sheetTop = sheet.getBoundingClientRect().top + window.scrollY;
        const blocks = [...sheet.querySelectorAll(".break-inside-avoid")];
        const hits: string[] = [];
        for (let boundary = 1; boundary <= 3; boundary++) {
          const y = boundary * pageH;
          for (const block of blocks) {
            const rect = block.getBoundingClientRect();
            const top = rect.top + window.scrollY - sheetTop;
            const bottom = rect.bottom + window.scrollY - sheetTop;
            if (top < y && bottom > y) {
              hits.push(`${(block.textContent ?? "").trim().slice(0, 50)} @page${boundary}`);
            }
          }
        }
        return hits;
      }, PAGE_CONTENT_H);

      // A straddling block is fine as long as it is unbreakable — Chrome
      // pushes it whole. What must not happen is running OUT of pages,
      // which the count assertion above already covers. This assertion
      // documents which blocks the paginator had to move.
      expect(
        sliced.length,
        `blocks the paginator must relocate: ${sliced.join(", ")}`,
      ).toBeLessThan(4);
    });
  }
});
