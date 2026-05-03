import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Global 404. Static export emits this as `out/404.html`; Nginx will be
 * configured (Sprint 6) to serve it on any unknown path. Owns its own
 * `<html>`/`<body>` because the root layout is a pass-through (same
 * pattern as `src/app/page.tsx`).
 *
 * Strings are hardcoded DE — the page is served for ANY unknown URL
 * including ones the user typed at `/en/...` or `/fr/...`, so we can't
 * pull locale from the route. DE is the project's default locale; the
 * locale-switch row at the bottom hands users a quick way back into
 * their preferred locale's homepage.
 *
 * Visual: Riso paper backdrop, asymmetric right-aligned italic
 * headline (the Hero pattern), spot-rose ink-drop SVG as the lone
 * decoration. No fluid sim — this is a static fallback, the canvas
 * shouldn't even mount.
 */

export const metadata: Metadata = {
  title: "404 · Im Fluid versickert · Manuel Heller",
  description: "Diese Seite ist im Fluid versickert. Zurück zur Startseite.",
  robots: { index: false, follow: false },
};

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  it: "Italiano",
};

export default function GlobalNotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body className="bg-paper text-ink">
        <main
          id="main"
          className="container-page flex min-h-dvh flex-col justify-between py-16 md:py-24"
        >
          <header className="flex items-start justify-between gap-6">
            <p className="type-label-stamp">Error 404</p>
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
              <h1 className="type-display text-ink">Diese Seite ist im Fluid versickert.</h1>
              <p className="type-body-lg ml-auto mt-8 text-right text-ink-soft">
                Die URL existiert nicht — Tippfehler, alter Link, oder die Tinte hat sie
                verschluckt. Beides ist möglich.
              </p>
              <div className="mt-10 flex flex-col items-end gap-3">
                <a href={`/${routing.defaultLocale}/`} className="riso-submit no-underline">
                  ← Zurück zur Startseite
                </a>
                <a
                  href={`/${routing.defaultLocale}/#work`}
                  className="type-label text-ink-muted underline decoration-spot-rose decoration-2 underline-offset-4 transition-colors hover:text-ink"
                >
                  Oder direkt zu den Arbeiten →
                </a>
              </div>
            </div>
          </div>

          <footer className="flex flex-col items-start justify-between gap-4 border-paper-line border-t pt-6 md:flex-row md:items-center">
            <p className="type-label text-ink-muted">© Manuel Heller · Basel-Region · MMXXVI</p>
            <ul aria-label="Sprache wechseln" className="flex items-center gap-1.5">
              {routing.locales.map((locale) => (
                <li key={locale}>
                  <a
                    href={`/${locale}/`}
                    hrefLang={locale}
                    aria-label={`Zu ${LOCALE_LABELS[locale]} wechseln`}
                    className="type-label text-ink-muted no-underline transition-colors hover:text-ink"
                  >
                    {locale.toUpperCase()}
                  </a>
                </li>
              ))}
            </ul>
          </footer>
        </main>
      </body>
    </html>
  );
}
