// tests/e2e/seo-files.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Validity + canonical-URL guards for the static SEO files emitted
 * by Next.js metadata API at build time.
 */

test.describe("@seo sitemap.xml", () => {
  test("returns 200, parses as valid XML, has urlset + entries", async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/sitemap.xml`);
    expect(response.status(), "HTTP status").toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType.toLowerCase()).toContain("xml");
    const body = await response.text();
    // Root element + sitemap-protocol namespace
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    // sitemap.ts emits 4 entries — one home per locale. Legal pages
    // (impressum, datenschutz) and playground experiments are noindex'd
    // at the page level, so listing them here would send Google a
    // contradictory "discover-but-don't-index" signal.
    const locMatches = body.match(/<loc>/g) ?? [];
    expect(locMatches.length, "<loc> count").toBeGreaterThanOrEqual(4);
    // hreflang alternates emitted via xhtml:link rel="alternate"
    expect(body).toContain("xhtml:link");
    expect(body).toContain('rel="alternate"');
  });
});

test.describe("@seo robots.txt", () => {
  test("returns 200, has User-agent + Sitemap, no full-site Disallow", async ({
    request,
    baseURL,
  }) => {
    const response = await request.get(`${baseURL}/robots.txt`);
    expect(response.status(), "HTTP status").toBe(200);
    const body = await response.text();
    expect(body, "must contain User-agent: *").toMatch(/User-[Aa]gent:\s*\*/i);
    expect(body, "must point at sitemap.xml").toMatch(/Sitemap:\s*\S*sitemap\.xml/);
    // Allow line-wrapped Disallow paths but reject "Disallow: /"
    // alone (would deindex everything). robots.ts emits
    // disallow: ["/_next/"] which is fine — noindex routes use the
    // page-level robots meta tag instead of a robots.txt disallow.
    const disallowAll = /^Disallow:\s*\/\s*$/m.test(body);
    expect(disallowAll, "must NOT have Disallow: / (full-site deindex)").toBe(false);
  });
});
