// tests/e2e/font-preload.spec.ts
import { expect, test } from "@playwright/test";

/**
 * The locale layout preloads the hero serif italic and Inter's Latin
 * subset (src/lib/criticalFonts.ts). A preload only helps when its URL
 * is byte-identical to the one the @font-face rule requests; otherwise
 * the browser downloads the font twice. Both URLs are content-hashed,
 * so this guards against them drifting apart.
 */

test("critical font preloads match the @font-face URLs and download once", async ({ page }) => {
  const fontRequests = new Map<string, number>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith(".woff2")) {
      fontRequests.set(url.pathname, (fontRequests.get(url.pathname) ?? 0) + 1);
    }
  });

  await page.goto("/de/");
  await page.evaluate(() => document.fonts.ready);

  const hrefs = await page
    .locator('head link[rel="preload"][as="font"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute("href") ?? ""));
  expect(hrefs).toHaveLength(2);
  expect(hrefs.some((h) => h.includes("instrument-serif-latin-400-italic"))).toBe(true);
  expect(hrefs.some((h) => h.includes("inter-latin-wght-normal"))).toBe(true);

  const fontFaceSources = await page.evaluate(() => {
    const sources: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSFontFaceRule) sources.push(rule.style.getPropertyValue("src"));
      }
    }
    return sources;
  });

  for (const href of hrefs) {
    const file = href.split("/").pop() ?? "";
    expect(
      fontFaceSources.some((src) => src.includes(file)),
      `${file} must be referenced by an @font-face rule`,
    ).toBe(true);
    expect(fontRequests.get(href), `${href} must be fetched exactly once`).toBe(1);
  }
});
