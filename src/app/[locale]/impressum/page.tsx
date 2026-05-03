import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LegalDocument } from "@/components/sections/LegalDocument";
import { routing } from "@/i18n/routing";

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
  };
}

export default function ImpressumPage({ params }: ImpressumPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return <LegalDocument namespace="legal.impressum" />;
}
