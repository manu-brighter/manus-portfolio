import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/**
 * Sitemap — enumerates all locale-prefixed routes for search-engine
 * discovery. Each entry includes alternates for the other 3 locales
 * via the `alternates.languages` field, signalling to Google that
 * /de/, /en/, /fr/, /it/ are translations of one another (the
 * hreflang protocol — also redundantly emitted as <link rel="alternate"
 * hreflang="..."/> via generateMetadata in Task 8 for AT/legacy crawlers).
 *
 * lastModified is set to the build time. We don't track per-route
 * content edits; for a portfolio that's fine.
 */
const STATIC_PATHS = ["", "/impressum", "/datenschutz"] as const;

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      const url = `${SITE.url}/${locale}${path}/`;
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "monthly",
        priority: path === "" ? 1.0 : 0.5,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.filter((l) => l !== locale).map((l) => [l, `${SITE.url}/${l}${path}/`]),
          ),
        },
      });
    }
  }

  return entries;
}
