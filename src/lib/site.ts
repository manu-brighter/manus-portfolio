/**
 * Site-level constants — single source of truth for domain, identity,
 * and contact channels. Consumed by Contact section, legal pages, and
 * the upcoming Sprint 3 SEO/meta layer (sitemap, OG cards, JSON-LD).
 *
 * URL is hardcoded for now. When CI gains a preview-vs-prod split we
 * can swap to `process.env.NEXT_PUBLIC_SITE_URL ?? "https://manuelheller.dev"`
 * — same shape, no consumer change.
 */

export const SITE = {
  url: "https://manuelheller.dev",
  alias: "https://manuelheller.ch",
  name: "Manuel Heller · Craft Portfolio",
  shortName: "Manuel Heller",
  tagline: "Full-Stack Developer · PHP & Vue",
  description:
    "Softwareentwicklung mit PHP und Vue, Schnittstellen und Testautomatisierung. Eigene Webprojekte, AI-gestützte Entwicklung und Fotografie.",
  author: {
    name: "Manuel Heller",
    region: "Basel-Region, Schweiz",
    email: "manuelheller@bluewin.ch",
    socials: {
      github: "https://github.com/manu-brighter",
      linkedin: "https://linkedin.com/in/manuel-heller-15a831223",
      photos: "https://manuelheller.myportfolio.com/portfolio",
      instagram: "https://instagram.com/joggediballa",
    },
  },
  /** Public repos referenced from the Work side-projects strip. URLs
   *  live here, not in the i18n catalogs — one file beats four JSONs
   *  in sync (same rationale as the socials). */
  repos: {
    claudeCodeKit: "https://github.com/manu-brighter/claude-code-kit",
    shotCounter: "https://github.com/manu-brighter/shot-counter",
  },
} as const;
