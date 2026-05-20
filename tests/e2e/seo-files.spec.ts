// tests/e2e/seo-files.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Validity + canonical-URL guards for the static SEO files emitted
 * by Next.js metadata API at build time, plus per-route robots-meta
 * regression guards for the noindex routes.
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
    // Exactly 4 entries: one home per locale. Legal pages (impressum,
    // datenschutz) and playground experiments are noindex'd at the
    // page level, so listing them here would send Google a
    // contradictory "discover-but-don't-index" signal. Locking the
    // count instead of `>= 4` catches accidental re-additions.
    const locMatches = body.match(/<loc>/g) ?? [];
    expect(locMatches.length, "<loc> count").toBe(4);
    // Exactly the home URLs — no legal or playground paths.
    for (const locale of ["de", "en", "fr", "it"]) {
      expect(body, `${locale} home loc`).toContain(
        `<loc>https://manuelheller.dev/${locale}/</loc>`,
      );
    }
    expect(body, "must NOT contain impressum").not.toMatch(/impressum/i);
    expect(body, "must NOT contain datenschutz").not.toMatch(/datenschutz/i);
    expect(body, "must NOT contain playground").not.toMatch(/playground/i);
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
    // Legal + playground routes must NOT be disallowed at the
    // crawler level — they rely on the page-level noindex meta tag,
    // which requires the page to be crawl-allowed.
    expect(body, "must NOT disallow /impressum").not.toMatch(/Disallow:[^\n]*impressum/i);
    expect(body, "must NOT disallow /datenschutz").not.toMatch(/Disallow:[^\n]*datenschutz/i);
    expect(body, "must NOT disallow /playground").not.toMatch(/Disallow:[^\n]*playground/i);
  });
});

/**
 * Per-route robots-meta regression guard. If a page's `generateMetadata`
 * drops the `robots` override (e.g. refactor that forgets the field-replace
 * semantics of Next.js metadata merging), the locale layout's
 * `index: true` default takes over silently. This test catches that.
 */
test.describe("@seo robots meta on noindex routes", () => {
  const NOINDEX_ROUTES: Array<{ path: string; content: RegExp }> = [
    // Legal: `follow` stays true for outbound link discovery.
    { path: "/de/impressum/", content: /noindex,\s*follow/i },
    { path: "/de/datenschutz/", content: /noindex,\s*follow/i },
    { path: "/en/impressum/", content: /noindex,\s*follow/i },
    // Playground + Styleguide: dead-end routes, follow off.
    { path: "/de/playground/ink-drop-studio/", content: /noindex,\s*nofollow/i },
    { path: "/de/playground/type-as-fluid/", content: /noindex,\s*nofollow/i },
    { path: "/de/styleguide/", content: /noindex,\s*nofollow/i },
  ];

  for (const { path, content } of NOINDEX_ROUTES) {
    test(`${path} has correct robots meta`, async ({ request, baseURL }) => {
      const response = await request.get(`${baseURL}${path}`);
      expect(response.status(), "HTTP status").toBe(200);
      const body = await response.text();
      const match = body.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
      expect(match, `robots meta tag present on ${path}`).not.toBeNull();
      expect(match?.[1], `robots content on ${path}`).toMatch(content);
    });
  }

  test("/de/ home stays indexable", async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/de/`);
    expect(response.status()).toBe(200);
    const body = await response.text();
    const match = body.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
    expect(match?.[1]).toMatch(/index,\s*follow/i);
    expect(match?.[1]).not.toMatch(/noindex/i);
  });
});

/**
 * Canonical-URL self-reference guard for noindex'd routes. The locale
 * layout sets `alternates.canonical` with pathname="" (i.e. `/de/`),
 * so sub-routes must override or they'd canonicalize to home — a
 * cross-page consolidation hint that contradicts the noindex. Latent
 * bug until noindex is removed; this test pins the contract.
 */
test.describe("@seo canonical URLs on legal routes", () => {
  const LEGAL_ROUTES = [
    { path: "/de/impressum/", canonical: "https://manuelheller.dev/de/impressum/" },
    { path: "/de/datenschutz/", canonical: "https://manuelheller.dev/de/datenschutz/" },
    { path: "/en/impressum/", canonical: "https://manuelheller.dev/en/impressum/" },
    { path: "/fr/datenschutz/", canonical: "https://manuelheller.dev/fr/datenschutz/" },
  ];

  for (const { path, canonical } of LEGAL_ROUTES) {
    test(`${path} self-canonical`, async ({ request, baseURL }) => {
      const response = await request.get(`${baseURL}${path}`);
      expect(response.status()).toBe(200);
      const body = await response.text();
      const match = body.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
      expect(match?.[1], `canonical on ${path}`).toBe(canonical);
    });
  }
});
