import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type Locale, routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/**
 * Open Graph locale per site locale. Facebook/LinkedIn expect a
 * `language_TERRITORY` pair; the bare "de" a plain swap produced is not
 * one. The site is Swiss, so the three national languages carry CH,
 * English goes to the generic en_US.
 */
export const OG_LOCALE: Record<Locale, string> = {
  de: "de_CH",
  en: "en_US",
  fr: "fr_CH",
  it: "it_CH",
};

/** og:locale + og:locale:alternate (the other three) for a locale. */
export function ogLocaleFields(locale: Locale): { locale: string; alternateLocale: string[] } {
  return {
    locale: OG_LOCALE[locale],
    alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
  };
}

/**
 * Share metadata for a sub-route (CV, legal, playground, styleguide).
 *
 * Next.js field-replaces `openGraph` / `twitter` per segment, so a page
 * that only sets `title` keeps the layout's home OG block and every share
 * shows the home title, description and URL. This rebuilds both blocks
 * for the page itself, keeping the locale's card images.
 */
export function buildPageShareMetadata({
  locale,
  url,
  title,
  description,
}: {
  locale: Locale;
  url: string;
  title: string;
  description?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      ...ogLocaleFields(locale),
      url,
      siteName: SITE.shortName,
      title,
      description,
      images: [
        {
          url: `${SITE.url}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: SITE.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE.url}/${locale}/twitter-image`],
    },
  };
}

/**
 * Build per-locale metadata for a route. Includes:
 *   - title + description per locale (from messages.meta.*)
 *   - canonical URL pointing at the current locale's path
 *   - alternates.languages for hreflang signalling (4 locales)
 *   - openGraph + twitter card metadata pointing at the dynamic
 *     OG/Twitter routes generated in Task 9
 *
 * Consumed by `src/app/[locale]/layout.tsx`'s `generateMetadata`.
 */
export async function buildLocaleMetadata({
  locale,
  pathname = "",
}: {
  locale: Locale;
  pathname?: string;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  const canonical = `${SITE.url}/${locale}${pathname}/`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE.url}/${l}${pathname}/`;
  }
  // x-default points at the default locale per Google's hreflang spec.
  languages["x-default"] = `${SITE.url}/${routing.defaultLocale}${pathname}/`;

  return {
    metadataBase: new URL(SITE.url),
    title: { default: title, template: t("titleTemplate") },
    description,
    authors: [{ name: SITE.author.name, url: `${SITE.url}/` }],
    creator: SITE.author.name,
    publisher: SITE.author.name,
    alternates: {
      canonical,
      languages,
    },
    ...buildPageShareMetadata({ locale, url: canonical, title, description }),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}
