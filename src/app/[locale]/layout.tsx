import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SceneProvider } from "@/components/scene/SceneProvider";
import { Footer } from "@/components/ui/Footer";
import { Loader } from "@/components/ui/Loader";
import { Nav } from "@/components/ui/Nav";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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

  return (
    <html lang={locale}>
      {/* suppressHydrationWarning: browser extensions like ColorZilla
          and Grammarly inject attributes onto <body> before React
          hydrates (e.g. `cz-shortcut-listen`). These can't be
          predicted server-side, so we silence the mismatch warning
          for the body element only — children are still validated
          normally. Standard Next.js pattern for this case. */}
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
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
            </SceneProvider>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
