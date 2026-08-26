"use client";

import { routing } from "@/i18n/routing";
import { rememberLocale } from "@/lib/localePreference";

/**
 * NotFoundLocaleLinks — the 404 page's language row.
 *
 * Client component for one reason: clicking a language here IS an
 * explicit choice, exactly like the Nav switcher, so it has to record
 * the preference. Without that, a visitor who lands on a dead link and
 * picks English still gets bounced back to the default locale by the
 * bare-root language sniff on their next visit (see `src/app/page.tsx`).
 * `localStorage.setItem` is synchronous, so it lands before the browser
 * leaves the document.
 *
 * Endonyms are hard-coded rather than pulled from next-intl: the 404
 * page has no `[locale]` segment and therefore no message context, and
 * a language row that names every language in its OWN language is what
 * a lost visitor can read anyway.
 *
 * Plain <a>, not next/link: the 404 page owns its own <html> shell and
 * the client router's soft navigation across that root-shell boundary
 * silently no-ops (links did nothing on click). A full page load is the
 * correct behavior when leaving the error document.
 */

const LOCALE_NAMES: Record<(typeof routing.locales)[number], string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  it: "Italiano",
};

export function NotFoundLocaleLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {routing.locales.map((locale) => (
        <a
          key={locale}
          href={`/${locale}/`}
          onClick={() => rememberLocale(locale)}
          className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {LOCALE_NAMES[locale]}
        </a>
      ))}
    </div>
  );
}
