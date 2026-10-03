// tests/e2e/json-ld.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Schema-validation guard for the JSON-LD output of `src/lib/seo/jsonLd.ts`.
 * Catches accidental regression of the Person.image upgrade, the
 * Organization.logo (site-logo SERP feature), and missing required
 * fields. Only asserts STRUCTURE — additions to the schema don't
 * break the test, but the asserted entities and their core fields
 * must remain.
 */

const LOCALES = ["de", "en", "fr", "it"] as const;

test.describe("@seo JSON-LD schema validation", () => {
  for (const locale of LOCALES) {
    test(`/${locale}/ emits a valid Person + WebSite + Organization @graph`, async ({ page }) => {
      await page.goto(`/${locale}/`);
      const scripts = page.locator('script[type="application/ld+json"]');
      await expect(scripts).toHaveCount(1);
      const raw = await scripts.first().textContent();
      expect(raw, "JSON-LD script tag must have content").toBeTruthy();
      const parsed = JSON.parse(raw ?? "{}") as Record<string, unknown>;
      expect(parsed["@context"], "JSON-LD @context").toBe("https://schema.org");
      const graph = parsed["@graph"];
      expect(Array.isArray(graph), "JSON-LD must carry an @graph array").toBe(true);
      const arr = graph as Array<Record<string, unknown>>;

      const person = arr.find((o) => o["@type"] === "Person");
      const webSite = arr.find((o) => o["@type"] === "WebSite");
      const organization = arr.find((o) => o["@type"] === "Organization");
      expect(person, "Person entry must exist").toBeDefined();
      expect(webSite, "WebSite entry must exist").toBeDefined();
      expect(organization, "Organization entry must exist (powers site-logo SERP)").toBeDefined();

      // Person shape
      expect(person?.name, "Person.name").toBeTruthy();
      expect(person?.["@id"], "Person.@id").toBe("https://manuelheller.dev/#person");
      expect(person?.url, "Person.url").toBe("https://manuelheller.dev/");
      const image = person?.image as Record<string, unknown> | undefined;
      expect(image, "Person.image must be present").toBeDefined();
      expect(image?.["@type"], "Person.image must be an ImageObject").toBe("ImageObject");
      expect(image?.contentUrl, "ImageObject.contentUrl").toBeTruthy();
      expect(image?.creator, "ImageObject.creator").toBeDefined();
      expect(image?.copyrightHolder, "ImageObject.copyrightHolder").toBeDefined();
      const sameAs = person?.sameAs as unknown[] | undefined;
      expect(Array.isArray(sameAs), "Person.sameAs must be an array").toBe(true);
      expect(sameAs?.length, "Person.sameAs non-empty").toBeGreaterThan(0);
      // Club account, modelled as memberOf, not a personal profile.
      expect(sameAs, "Person.sameAs excludes the club Instagram").not.toContain(
        "https://instagram.com/joggediballa",
      );
      const memberOf = person?.memberOf as Record<string, unknown> | undefined;
      expect(memberOf?.url, "Person.memberOf.url").toBe("https://joggediballa.ch");

      // WebSite shape
      expect(webSite?.name, "WebSite.name").toBeTruthy();
      expect(webSite?.url, "WebSite.url").toBeTruthy();
      expect(webSite?.inLanguage, `WebSite.inLanguage === ${locale}`).toBe(locale);
      const author = webSite?.author as Record<string, unknown> | undefined;
      expect(author?.["@id"], "WebSite.author references #person").toBe(person?.["@id"]);
      const publisher = webSite?.publisher as Record<string, unknown> | undefined;
      expect(publisher?.["@id"], "WebSite.publisher references #person").toBe(person?.["@id"]);

      // Organization shape — exists ONLY to carry `logo` so Google's
      // site-logo SERP feature has the property it documents. If this
      // entity disappears or the logo URL/property name drifts, the
      // logo-next-to-result effect silently stops working.
      expect(organization?.name, "Organization.name").toBeTruthy();
      expect(organization?.url, "Organization.url").toBeTruthy();
      const logo = organization?.logo as Record<string, unknown> | undefined;
      expect(logo, "Organization.logo must be present").toBeDefined();
      expect(logo?.["@type"], "Organization.logo must be an ImageObject").toBe("ImageObject");
      expect(logo?.url, "Organization.logo.url").toBeTruthy();
      expect(logo?.contentUrl, "Organization.logo.contentUrl").toBeTruthy();
    });
  }
});
