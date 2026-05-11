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
      contentUrl: `${SITE.url}/profile/manuel-heller-portrait-1200w.jpg`,
      url: `${SITE.url}/profile/manuel-heller-portrait-1200w.jpg`,
      width: 1200,
      height: 1800,
      caption: PORTRAIT_CAPTION[locale],
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

  // Organization entity exists ONLY to carry the `logo` property — that
  // is the schema.org / Google-documented path for the "site logo next
  // to result" SERP feature (the joggediballa.ch effect referenced in
  // the original site-logo polish). `WebSite.image` is valid schema but
  // Google's logo docs explicitly look at Organization.logo, so the
  // previous WebSite.image-only approach silently missed the goal.
  //
  // 512×512 paper-bg PNG — square shape and paper-bg both important:
  // square so Google doesn't crop, paper bg so it looks clean against
  // Google's dark search surfaces (transparent variant would show
  // whatever bg color Google chose underneath).
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.shortName,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: `${SITE.url}/icon-512.png`,
      contentUrl: `${SITE.url}/icon-512.png`,
      width: 512,
      height: 512,
    },
  };

  return [person, webSite, organization];
}
