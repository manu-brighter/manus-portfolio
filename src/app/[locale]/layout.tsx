import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { AmbientRecorderDevGate } from "@/components/scene/AmbientRecorderDevGate";
import { InkWipeOverlay } from "@/components/scene/InkWipeOverlay";
import { SceneProvider } from "@/components/scene/SceneProvider";
import { Footer } from "@/components/ui/Footer";
import { Loader } from "@/components/ui/Loader";
import { Nav } from "@/components/ui/Nav";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { type Locale, routing } from "@/i18n/routing";
import { buildJsonLd } from "@/lib/seo/jsonLd";
import { buildLocaleMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return buildLocaleMetadata({ locale: locale as Locale, pathname: "" });
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("skipLink");
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  const jsonLd = buildJsonLd(locale as Locale, tMeta("description"));

  return (
    <html lang={locale}>
      {/* suppressHydrationWarning: browser extensions like ColorZilla
          and Grammarly inject attributes onto <body> before React
          hydrates (e.g. `cz-shortcut-listen`). These can't be
          predicted server-side, so we silence the mismatch warning
          for the body element only — children are still validated
          normally. Standard Next.js pattern for this case. */}
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: ld+json must be raw, not text
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MotionProvider>
            <SceneProvider>
              <a className="skip-link" href="#main">
                {t("label")}
              </a>
              <Nav />
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
              <ScrollProgress />
              <Loader />
              <InkWipeOverlay />
              <AmbientRecorderDevGate />
            </SceneProvider>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
