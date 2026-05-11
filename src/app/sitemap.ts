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
 * Home-page entries declare every craft-relevant image visible on the
 * page via the `images` field — Next emits these as <image:image>
 * children inside the sitemap (Google's image-sitemap extension).
 * Speeds up image-search discovery; the JSON-LD Person/WebSite schema
 * covers the semantic side. We list the canonical JPG fallback URL
 * for each image (Google reads JPG/PNG/WebP via image-sitemap; AVIF
 * has spotty support, so the JPG is the safe bet).
 *
 * Playground experiment routes (`/[locale]/playground/[slug]`) are
 * intentionally excluded — they're decorative, not content. Blocked
 * via robots.txt (`/*\/playground/*`).
 *
 * lastModified is set to the build time. We don't track per-route
 * content edits; for a portfolio that's fine.
 */
const STATIC_PATHS = ["", "/impressum", "/datenschutz"] as const;

// Every craft image visible on the home page that's worth surfacing
// in Google Image Search. Each entry uses the JPG fallback width
// (matching what optimize-assets.mjs emits) for maximum crawler
// compatibility — declaring only one width per image avoids the
// "which size wins the snippet" dilution problem.
const HOME_IMAGES = [
  // Identity — JSON-LD's Person.image references this exact URL.
  `${SITE.url}/profile/manuel-heller-portrait-1200w.jpg`,
  // Photography section — Manuel's wildlife / landscape work.
  `${SITE.url}/photography/01-pelican-1200w.jpg`,
  `${SITE.url}/photography/02-koenigsegg-1200w.jpg`,
  `${SITE.url}/photography/03-panorama-1920w.jpg`,
  `${SITE.url}/photography/04-tree-lake-1200w.jpg`,
  `${SITE.url}/photography/05-crocodile-1200w.jpg`,
  // Work section — featured project covers.
  `${SITE.url}/projects/joggediballa/homepage-800w.jpg`,
  `${SITE.url}/projects/joggediballa/goennerverwaltung-800w.jpg`,
  `${SITE.url}/projects/joggediballa/admin-800w.jpg`,
  `${SITE.url}/projects/portfolio/homepage-800w.jpg`,
];

// Per-path crawl-hint tuning. Home shifts more often (typo fixes,
// content polish, new case studies) so signal weekly; legal pages are
// boilerplate that rarely changes — yearly is honest. Google treats
// these as hints not commands, but explicit honest values reduce
// wasted crawl budget.
const CHANGE_FREQ = {
  "": "weekly",
  "/impressum": "yearly",
  "/datenschutz": "yearly",
} as const;

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
        changeFrequency: CHANGE_FREQ[path],
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
