import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * Global 404. Static export emits this as `out/404.html`; Nginx will be
 * configured (Sprint 6) to serve it on any unknown path. Owns its own
 * `<html>`/`<body>` because the root layout is a pass-through (same
 * pattern as `src/app/page.tsx`).
 *
 * Strings come from the `notFound` namespace of the default locale's
 * messages — the page is served for ANY unknown URL incl. ones the user
 * typed at `/en/...` or `/fr/...`, so route-based locale detection
 * doesn't apply. We pin to `routing.defaultLocale` (de) and offer a
 * locale-switch row in the footer for users who want to land on their
 * preferred locale's home.
 *
 * Visual: Riso paper backdrop, asymmetric right-aligned italic
 * headline (the Hero pattern), spot-rose ink-drop SVG as the lone
 * decoration. No fluid sim — this is a static fallback, the canvas
 * shouldn't even mount.
 *
 * `<html lang>` is hardcoded `de` to match the rendered copy. SEO is
 * `noindex` so this is purely an AT signal: a screen reader switching
 * to a German voice is correct here.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "notFound" });
  return {
    title: `${t("metaTitle")} · Manuel Heller`,
    description: t("body"),
    robots: { index: false, follow: false },
  };
}

export default async function GlobalNotFound() {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "notFound" });
  const tLocale = await getTranslations({
    locale: routing.defaultLocale,
    namespace: "localeSwitcher",
  });

  return (
    <html lang={routing.defaultLocale}>
      <body className="bg-paper text-ink">
        <main
          id="main"
          className="container-page flex min-h-dvh flex-col justify-between py-16 md:py-24"
        >
          <header className="flex items-start justify-between gap-6">
            <p className="type-label-stamp">{t("stamp")}</p>
            <p className="type-label text-ink-muted">
              <span aria-hidden="true">manuelheller.dev</span>
            </p>
          </header>

          <div className="grid-12 items-center gap-y-10 py-16 md:py-24">
            <div
              aria-hidden="true"
              className="col-span-12 flex justify-center md:col-span-4 md:justify-start"
            >
              {/* Spot-rose ink drop with mint misregistration ghost.
                  Decorative — page meaning lives in the headline + body. */}
              <svg
                width="180"
                height="220"
                viewBox="0 0 180 220"
                className="max-w-[55vw] md:max-w-none"
                role="presentation"
              >
                <title>Ink drop</title>
                <path
                  d="M90 18 C 130 80, 162 130, 162 160 C 162 192, 130 214, 90 214 C 50 214, 18 192, 18 160 C 18 130, 50 80, 90 18 Z"
                  fill="var(--color-spot-mint)"
                  transform="translate(3 3)"
                  opacity="0.85"
                />
                <path
                  d="M90 18 C 130 80, 162 130, 162 160 C 162 192, 130 214, 90 214 C 50 214, 18 192, 18 160 C 18 130, 50 80, 90 18 Z"
                  fill="var(--color-spot-rose)"
                  stroke="var(--color-ink)"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="col-span-12 md:col-span-8">
              <h1 className="type-display text-ink">{t("headline")}</h1>
              <p className="type-body-lg ml-auto mt-8 text-right text-ink-soft">{t("body")}</p>
              <div className="mt-10 flex flex-col items-end gap-3">
                <a href={`/${routing.defaultLocale}/`} className="riso-submit no-underline">
                  ← {t("backHome")}
                </a>
                <a
                  href={`/${routing.defaultLocale}/#work`}
                  className="type-label text-ink-muted underline decoration-spot-rose decoration-2 underline-offset-4 transition-colors hover:text-ink"
                >
                  {t("backWork")} →
                </a>
              </div>
            </div>
          </div>

          <footer className="flex flex-col items-start justify-between gap-4 border-paper-line border-t pt-6 md:flex-row md:items-center">
            <p className="type-label text-ink-muted">© Manuel Heller · Basel-Region · MMXXVI</p>
            <ul aria-label={tLocale("ariaLabel")} className="flex items-center gap-1.5">
              {routing.locales.map((locale) => {
                const name = tLocale(`locales.${locale}`);
                return (
                  <li key={locale}>
                    <a
                      href={`/${locale}/`}
                      hrefLang={locale}
                      aria-label={tLocale("switchLabel", { name })}
                      className="type-label text-ink-muted no-underline transition-colors hover:text-ink"
                    >
                      {locale.toUpperCase()}
                    </a>
                  </li>
                );
              })}
            </ul>
          </footer>
        </main>
      </body>
    </html>
  );
}
