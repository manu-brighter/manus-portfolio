import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CvDocument } from "@/components/cv/CvDocument";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type CvPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CvPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cv" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    // Self-canonical override — same rationale as the legal pages: the
    // locale layout's canonical points at `/${locale}/`, which would
    // contradict the noindex below.
    alternates: { canonical: `${SITE.url}/${locale}/cv/` },
    // Personal document: linked for humans (footer + contact), kept out
    // of the index. `follow` stays true so outbound profile links keep
    // their discovery value.
    robots: { index: false, follow: true },
  };
}

export default function CvPage({ params }: CvPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return <CvDocument />;
}
