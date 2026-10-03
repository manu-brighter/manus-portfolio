import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { routing } from "@/i18n/routing";
import { buildPageShareMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type ImpressumPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ImpressumPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "legal.impressum" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE.url}/${locale}/impressum/`;
  return {
    // `absolute`: metaTitle already ends in the name, and the locale
    // layout template would append " · Manuel Heller" a second time.
    title: { absolute: title },
    description,
    // Self-canonical override. The locale layout sets canonical to
    // `${SITE.url}/${locale}/` because it's called with pathname="";
    // without this override `/de/impressum/` would canonicalize to
    // `/de/`, sending Google a cross-page consolidation hint that
    // contradicts the noindex below.
    alternates: { canonical: url },
    ...buildPageShareMetadata({ locale, url, title, description }),
    // Legal boilerplate has no SEO value and exposes contact info to scrapers.
    // `follow` stays true so Google can still discover outbound links from
    // datenschutz (e.g. to upstream policies).
    robots: { index: false, follow: true },
  };
}

export default function ImpressumPage({ params }: ImpressumPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return <LegalDocument namespace="legal.impressum" />;
}
