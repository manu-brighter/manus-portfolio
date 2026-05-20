import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type DatenschutzPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: DatenschutzPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.datenschutz" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    // See impressum/page.tsx — same rationale.
    robots: { index: false, follow: true },
  };
}

export default function DatenschutzPage({ params }: DatenschutzPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return <LegalDocument namespace="legal.datenschutz" />;
}
