import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CvDocument } from "@/components/cv/CvDocument";
import { routing } from "@/i18n/routing";
import { buildPageShareMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type CvPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CvPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "cv" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE.url}/${locale}/cv/`;
  return {
    // `absolute` bypasses the locale layout's title template. The
    // template appends " · Manuel Heller", and metaTitle already ends
    // in the name — Chrome derives the saved PDF's filename from
    // document.title, so the download came out as
    // "CV · Manuel Heller · Manuel Heller.pdf".
    title: { absolute: title },
    description,
    // Self-canonical override — same rationale as the legal pages: the
    // locale layout's canonical points at `/${locale}/`, which would
    // contradict the noindex below.
    alternates: { canonical: url },
    ...buildPageShareMetadata({ locale, url, title, description }),
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
