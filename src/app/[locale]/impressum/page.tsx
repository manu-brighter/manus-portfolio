import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type ImpressumPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ImpressumPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.impressum" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    // Self-canonical override. The locale layout sets canonical to
    // `${SITE.url}/${locale}/` because it's called with pathname="";
    // without this override `/de/impressum/` would canonicalize to
    // `/de/`, sending Google a cross-page consolidation hint that
    // contradicts the noindex below.
    alternates: { canonical: `${SITE.url}/${locale}/impressum/` },
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
