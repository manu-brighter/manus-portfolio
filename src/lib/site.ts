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
  name: "Manuel Heller — Craft Portfolio",
  shortName: "Manuel Heller",
  tagline: "Full-Stack Developer · Visual Tinkerer",
  description:
    "Full-Stack Developer mit künstlerischem Auge. Code, Foto, Design: alles dasselbe Handwerk in unterschiedlicher Form.",
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
} as const;
