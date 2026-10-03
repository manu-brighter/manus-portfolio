import type { Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";

// Per-locale image captions — mirror the translated alt-text in
// messages/{locale}.json so Google's per-language Rich Results surface
// the right description for /en/, /fr/, /it/ visitors instead of the
// German fallback. Kept here (one map) rather than reading from the
// next-intl JSON because jsonLd builds at module-eval time and the
// next-intl client store isn't available in a server-component / build
// context.
const PORTRAIT_CAPTION: Record<Locale, string> = {
  de: "Portraitfoto Manuel Heller, Full-Stack Developer Basel",
  en: "Portrait photo Manuel Heller, Full-Stack Developer Basel",
  fr: "Photo portrait Manuel Heller, développeur full-stack Bâle",
  it: "Foto ritratto Manuel Heller, sviluppatore full-stack Basilea",
};

const PERSON_ID = `${SITE.url}/#person`;
const WEBSITE_ID = `${SITE.url}/#website`;
const ORGANIZATION_ID = `${SITE.url}/#organization`;

/**
 * JSON-LD structured data, embedded as a single
 * <script type="application/ld+json"> tag in the locale layout.
 *
 * One `@graph` with stable `@id`s instead of loose top-level objects, so
 * crawlers resolve every reference to the same entity rather than seeing
 * three unrelated "Manuel Heller" nodes:
 *
 * Person (#person) -> Manuel as the named author of the site; populates
 * the knowledge panel for personal-name searches. `sameAs` lists only his
 * own profiles; Jogge di Balla is modelled as `memberOf` with the club's
 * own URL and Instagram.
 *
 * WebSite (#website) -> the site's identity, published by #person, with
 * the rendered locale as `inLanguage`.
 *
 * Organization (#organization) exists ONLY to carry `logo`, which is the
 * Google-documented property for the site logo next to a search result
 * (`WebSite.image` is valid schema but Google's logo docs read
 * Organization.logo). 512x512 paper-bg PNG: square so Google doesn't crop,
 * paper bg so it reads cleanly on dark search surfaces.
 */
export function buildJsonLd(locale: Locale, description: string): Record<string, unknown> {
  const home = `${SITE.url}/`;
  const personRef = { "@id": PERSON_ID };

  const person = {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE.author.name,
    url: home,
    image: {
      "@type": "ImageObject",
      contentUrl: `${SITE.url}/profile/manuel-heller-portrait-1200w.jpg`,
      url: `${SITE.url}/profile/manuel-heller-portrait-1200w.jpg`,
      width: 1200,
      height: 1800,
      caption: PORTRAIT_CAPTION[locale],
      creator: personRef,
      copyrightHolder: personRef,
      copyrightNotice: `© ${SITE.author.name}`,
    },
    jobTitle: "Full-Stack Developer",
    worksFor: {
      "@type": "Organization",
      name: "zvoove Switzerland AG",
    },
    memberOf: {
      "@type": "Organization",
      name: SITE.joggediballa.name,
      url: SITE.joggediballa.url,
      sameAs: [SITE.joggediballa.instagram],
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Basel",
      addressRegion: "BS",
      addressCountry: "CH",
    },
    nationality: {
      "@type": "Country",
      name: "CH",
    },
    // Honest claim — DE (native), EN (fluent), FR (working). Site is
    // localised to IT as well, but Manuel doesn't actually speak Italian
    // beyond tourist-level, so it's deliberately excluded from the SEO
    // claim. If that changes, add "it" here.
    knowsLanguage: ["de", "en", "fr"],
    knowsAbout: [
      "Full-Stack Development",
      "PHP",
      "Vue.js",
      "TypeScript",
      "Webdesign",
      "Wildlife Photography",
      "WebGL Shaders",
      "AI-Assisted Development",
    ],
    email: `mailto:${SITE.author.email}`,
    sameAs: [SITE.author.socials.github, SITE.author.socials.linkedin, SITE.author.socials.photos],
  };

  const webSite = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: home,
    description,
    inLanguage: locale,
    author: personRef,
    publisher: personRef,
  };

  const organization = {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE.shortName,
    url: home,
    logo: {
      "@type": "ImageObject",
      url: `${SITE.url}/icon-512.png`,
      contentUrl: `${SITE.url}/icon-512.png`,
      width: 512,
      height: 512,
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [person, webSite, organization],
  };
}
