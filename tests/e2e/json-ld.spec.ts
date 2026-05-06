// tests/e2e/json-ld.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Schema-validation guard for the JSON-LD output of `src/lib/seo/jsonLd.ts`.
 * Catches accidental regression of the Person.image upgrade (back to
 * a plain icon-512.png URL string) and missing required fields. Only
 * asserts STRUCTURE — additions to the schema don't break the test.
 */

const LOCALES = ["de", "en", "fr", "it"] as const;

test.describe("@seo JSON-LD schema validation", () => {
  for (const locale of LOCALES) {
    test(`/${locale}/ emits a valid Person + WebSite array`, async ({ page }) => {
      await page.goto(`/${locale}/`);
      const scripts = page.locator('script[type="application/ld+json"]');
      await expect(scripts).toHaveCount(1);
      const raw = await scripts.first().textContent();
      expect(raw, "JSON-LD script tag must have content").toBeTruthy();
      const parsed = JSON.parse(raw ?? "[]") as unknown;
      expect(Array.isArray(parsed), "JSON-LD must be an array").toBe(true);
      const arr = parsed as Array<Record<string, unknown>>;
      expect(arr.length, "expected exactly 2 entries (Person + WebSite)").toBe(2);

      const person = arr.find((o) => o["@type"] === "Person");
      const webSite = arr.find((o) => o["@type"] === "WebSite");
      expect(person, "Person entry must exist").toBeDefined();
      expect(webSite, "WebSite entry must exist").toBeDefined();

      // Person shape
      expect(person?.name, "Person.name").toBeTruthy();
      expect(person?.url, "Person.url").toBeTruthy();
      const image = person?.image as Record<string, unknown> | undefined;
      expect(image, "Person.image must be present").toBeDefined();
      expect(image?.["@type"], "Person.image must be an ImageObject").toBe("ImageObject");
      expect(image?.contentUrl, "ImageObject.contentUrl").toBeTruthy();
      expect(image?.creator, "ImageObject.creator").toBeDefined();
      expect(image?.copyrightHolder, "ImageObject.copyrightHolder").toBeDefined();
      expect(Array.isArray(person?.sameAs), "Person.sameAs must be an array").toBe(true);
      expect((person?.sameAs as unknown[]).length, "Person.sameAs non-empty").toBeGreaterThan(0);

      // WebSite shape
      expect(webSite?.name, "WebSite.name").toBeTruthy();
      expect(webSite?.url, "WebSite.url").toBeTruthy();
      expect(webSite?.inLanguage, `WebSite.inLanguage === ${locale}`).toBe(locale);
      const author = webSite?.author as Record<string, unknown> | undefined;
      expect(author?.["@type"], "WebSite.author is a Person").toBe("Person");
      expect(author?.name, "WebSite.author.name").toBeTruthy();
    });
  }
});
