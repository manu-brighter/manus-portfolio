import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * robots.txt — production allows all crawlers; only `/_next/` internals are
 * disallowed.
 *
 * Routes we don't want indexed (playground experiments, legal pages,
 * styleguide) use page-level `robots: { index: false }` metadata instead
 * of robots.txt disallow. Rationale: a robots.txt disallow stops the crawl
 * before Google can read the noindex tag — if a third party links to the
 * URL, it can still appear in SERPs as a snippet-less listing. noindex on
 * a crawl-allowed page is the only signal that reliably keeps a URL out of
 * the index.
 *
 * For preview deploys / local builds, set NEXT_PUBLIC_ROBOTS_DISALLOW=true
 * to disallow everything (prevents Lighthouse/preview URLs from being
 * indexed if accidentally exposed).
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.NEXT_PUBLIC_ROBOTS_DISALLOW === "true";

  if (isPreview) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${SITE.url}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/_next/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
