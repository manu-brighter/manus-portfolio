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
 * intentionally excluded — they're decorative, not content. The pages
 * themselves carry `robots: { index: false }`; not listing them here
 * is the second signal.
 *
 * Legal pages (impressum, datenschutz) are also excluded — they're
 * noindex'd via page-level metadata, so listing them in the sitemap
 * would send Google a contradictory signal ("discover this URL" +
 * "don't index it"). Footer links keep them discoverable for users.
 *
 * lastModified is set to the build time. We don't track per-route
 * content edits; for a portfolio that's fine.
 */
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

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routing.locales.map((locale) => ({
    url: `${SITE.url}/${locale}/`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 1.0,
    images: HOME_IMAGES,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.filter((l) => l !== locale).map((l) => [l, `${SITE.url}/${l}/`]),
      ),
    },
  }));
}
