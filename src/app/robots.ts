import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * robots.txt — production allows all crawlers, disallows the
 * playground experiments (decorative, not content) + .next internals.
 *
 * The playground rules use `/*\/playground/*` (wildcard) because the
 * actual routes are locale-prefixed (`/de/playground/...` etc), not
 * bare `/playground/`. The bare `/playground/*` pattern alone is kept
 * as a belt-and-suspenders for any future un-prefixed redirects.
 * Google supports `*` wildcards in robots.txt paths.
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
        disallow: ["/playground/*", "/*/playground/*", "/_next/", "/api/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
