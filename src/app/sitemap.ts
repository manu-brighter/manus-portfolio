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
 * Home-page entries declare the portrait + Joggediballa cover via the
 * `images` field — Next emits these as <image:image> children inside
 * the sitemap (Google's image-sitemap extension). Speeds up image-
 * search discovery; the JSON-LD Person/WebSite schema covers the
 * semantic side.
 *
 * lastModified is set to the build time. We don't track per-route
 * content edits; for a portfolio that's fine.
 */
const STATIC_PATHS = ["", "/impressum", "/datenschutz"] as const;

// Single canonical portrait URL — the 1200w JPG matches what JSON-LD
// (Person.image / ImageObject) declares so Google sees one consistent
// asset across both signals. The smaller srcset variants live behind
// the same logical image; declaring only the canonical width avoids
// dilution in image-search where one image must "win" the snippet.
const HOME_IMAGES = [`${SITE.url}/profile/manuel-heller-portrait-1200w.jpg`];

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
        ...(path === "" ? { images: HOME_IMAGES } : {}),
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
