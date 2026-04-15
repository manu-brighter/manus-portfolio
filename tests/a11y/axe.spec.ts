import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Tagged `@a11y` so `pnpm test:a11y` can filter. CI runs the full
 * suite — axe violations fail the build (plan §9).
 *
 * Rule-tags scanned: wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice.
 * Reduced-motion media emulated separately (plan §9 non-negotiable).
 */
const ROUTES = ["/", "/styleguide"] as const;

for (const route of ROUTES) {
  test.describe(`@a11y axe — ${route}`, () => {
    test("default motion preference — no WCAG AA violations", async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .analyze();

      expect(results.violations, `axe violations on ${route} (default motion)`).toEqual([]);
    });

    test("reduced-motion — no WCAG AA violations", async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      try {
        await page.goto(route);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
          .analyze();
        expect(results.violations, `axe violations on ${route} (reduced-motion)`).toEqual([]);
      } finally {
        await context.close();
      }
    });
  });
}
