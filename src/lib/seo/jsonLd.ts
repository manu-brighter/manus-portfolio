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
    image: {
      "@type": "ImageObject",
      contentUrl: `${SITE.url}/profile/portrait-1200w.jpg`,
      url: `${SITE.url}/profile/portrait-1200w.jpg`,
      width: 800,
      height: 1200,
      caption: "Portraitfoto Manuel Heller, Full-Stack Developer Basel",
      creator: {
        "@type": "Person",
        name: SITE.author.name,
      },
      copyrightHolder: {
        "@type": "Person",
        name: SITE.author.name,
      },
      copyrightNotice: `© ${SITE.author.name}`,
    },
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
    nationality: {
      "@type": "Country",
      name: "CH",
    },
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
    // `image` powers Google's "site logo next to result" feature
    // (the way joggediballa.ch gets its big square logo beside
    // search snippets). 512×512 paper-bg PNG — square shape and
    // paper-bg both important: square so Google doesn't crop, paper
    // bg so it looks clean against Google's dark search surfaces
    // (transparent variant would show whatever bg color Google
    // chose underneath).
    image: {
      "@type": "ImageObject",
      url: `${SITE.url}/icon-512.png`,
      contentUrl: `${SITE.url}/icon-512.png`,
      width: 512,
      height: 512,
    },
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
