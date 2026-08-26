import "./globals.css";
// Mirrors root layout — 404 owns its own document shell, fonts must be imported here too
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { NotFoundAnimation } from "./not-found-animation";
import { NotFoundLocaleLinks } from "./not-found-locale-links";

export async function generateMetadata(): Promise<Metadata> {
  // Mirror the body-string strategy: pull from `notFound` namespace at
  // `routing.defaultLocale`. The 404 page's <html lang> is hardcoded to
  // the default locale (no [locale] segment can run on a not-found URL
  // by definition), so the title follows the same source of truth.
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "notFound" });
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "notFound" });

  return (
    <html lang={routing.defaultLocale}>
      <body
        className="flex min-h-dvh flex-col items-center justify-center bg-paper text-ink"
        suppressHydrationWarning
      >
        <main className="container-page flex max-w-xl flex-col items-center gap-10 py-20 text-center">
          {/* Ink bloom — 4 spot-colour blobs animating in */}
          <NotFoundAnimation />

          <div className="space-y-4">
            <h1 className="type-h2 italic">{t("headline")}</h1>
            <p className="type-body text-ink-soft">{t("body")}</p>
          </div>

          <NotFoundLocaleLinks />
        </main>
      </body>
    </html>
  );
}
