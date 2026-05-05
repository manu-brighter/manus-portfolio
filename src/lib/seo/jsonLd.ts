import type { Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/**
 * JSON-LD structured data — Person + WebSite schema. Embedded as a
 * single <script type="application/ld+json"> tag in the locale layout.
 *
 * Person -> search engines surface Manuel as the named author of the
 * site; populates the right-side knowledge panel for personal-name
 * searches.
 *
 * WebSite -> declares the site's identity, sets up sitelinks search
 * box (if/when site-internal search exists), and provides locale
 * alternates as `inLanguage`.
 */
export function buildJsonLd(locale: Locale, description: string) {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.author.name,
    url: SITE.url,
    image: `${SITE.url}/icon-512.png`,
    jobTitle: "Full-Stack Developer",
    worksFor: {
      "@type": "Organization",
      name: "zvoove Switzerland AG",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Basel",
      addressRegion: "BS",
      addressCountry: "CH",
    },
    email: `mailto:${SITE.author.email}`,
    sameAs: [
      SITE.author.socials.github,
      SITE.author.socials.linkedin,
      SITE.author.socials.photos,
      SITE.author.socials.instagram,
    ],
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description,
    inLanguage: locale,
    author: {
      "@type": "Person",
      name: SITE.author.name,
      url: SITE.url,
    },
    publisher: {
      "@type": "Person",
      name: SITE.author.name,
    },
  };

  return [person, webSite];
}
