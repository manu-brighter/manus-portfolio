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
  /** Home title. Mirrors `meta.title` in every locale common.json (identical
   *  English string in all four locales); used where no catalog is
   *  available synchronously (OG image `alt` exports, manifest). */
  name: "Manuel Heller · Software Developer · Photographer",
  shortName: "Manuel Heller",
  tagline: "Full-Stack Developer · PHP & Vue",
  description:
    "Softwareentwicklung mit PHP und Vue, Schnittstellen und Testautomatisierung. Eigene Webprojekte, AI-gestützte Entwicklung und Fotografie.",
  author: {
    name: "Manuel Heller",
    region: "Region Basel, Schweiz",
    /** Split on purpose: joined only in the browser (`@/lib/email`) so
     *  the address never ships as plaintext for mail harvesters. */
    email: { user: "manuelheller", domain: "bluewin.ch" },
    socials: {
      github: "https://github.com/manu-brighter",
      linkedin: "https://linkedin.com/in/manuel-heller-15a831223",
      photos: "https://manuelheller.myportfolio.com/portfolio",
    },
  },
  /** Jogge di Balla, the association Manuel co-founded (case study).
   *  Its Instagram is the club's account, not a personal profile, so
   *  it lives here and not under `author.socials`. */
  joggediballa: {
    name: "Jogge di Balla",
    url: "https://joggediballa.ch",
    instagram: "https://instagram.com/joggediballa",
  },
  /** Public repos referenced from the Work side-projects strip. URLs
   *  live here, not in the i18n catalogs — one file beats four JSONs
   *  in sync (same rationale as the socials). */
  repos: {
    claudeCodeKit: "https://github.com/manu-brighter/claude-code-kit",
    shotCounter: "https://github.com/manu-brighter/shot-counter",
    flyConnectomeSim: "https://github.com/manu-brighter/fly-connectome-sim",
    mercurius: "https://github.com/manu-brighter/mercurius-quant-bot",
  },
} as const;
