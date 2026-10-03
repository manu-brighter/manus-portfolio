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

type DatenschutzPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: DatenschutzPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "legal.datenschutz" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE.url}/${locale}/datenschutz/`;
  return {
    // `absolute`: metaTitle already ends in the name, and the locale
    // layout template would append " · Manuel Heller" a second time.
    title: { absolute: title },
    description,
    // See impressum/page.tsx — same rationale for canonical + robots.
    alternates: { canonical: url },
    ...buildPageShareMetadata({ locale, url, title, description }),
    robots: { index: false, follow: true },
  };
}

export default function DatenschutzPage({ params }: DatenschutzPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return <LegalDocument namespace="legal.datenschutz" />;
}
