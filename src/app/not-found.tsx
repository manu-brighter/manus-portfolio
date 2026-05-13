import "./globals.css";
// Mirrors root layout — 404 owns its own document shell, fonts must be imported here too
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { NotFoundAnimation } from "./not-found-animation";

export const metadata: Metadata = {
  title: "404 · Im Fluid versickert",
  robots: { index: false, follow: false },
};

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

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/de/"
              className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Deutsch
            </Link>
            <Link
              href="/en/"
              className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              English
            </Link>
            <Link
              href="/fr/"
              className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Français
            </Link>
            <Link
              href="/it/"
              className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Italiano
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
