import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type Locale, routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

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
    keywords: t.raw("keywords") as string[],
    authors: [{ name: SITE.author.name, url: SITE.url }],
    creator: SITE.author.name,
    publisher: SITE.author.name,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      locale: locale.replace("-", "_"),
      url: canonical,
      siteName: SITE.shortName,
      title,
      description,
      images: [
        {
          url: `${SITE.url}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE.url}/${locale}/twitter-image`],
    },
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
