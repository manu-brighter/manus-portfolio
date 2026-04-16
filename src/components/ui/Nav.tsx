"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

/**
 * Top navigation — Phase 2 (i18n wired).
 *
 * Editorial layout per plan §4.3 / §5:
 *   [ Brand (mono stamp) ]      [ Work · About · Playground · Contact ]
 *                                                       [ DE EN FR IT ]
 *
 * Client component because the locale switcher needs the current
 * pathname (to switch locale on the same route) and the active-locale
 * state for `aria-current`. Server-rendered text still comes through
 * `NextIntlClientProvider` which wraps the locale layout.
 */

const NAV_ITEMS = [
  { href: "#work", key: "work" },
  { href: "#about", key: "about" },
  { href: "#playground", key: "playground" },
  { href: "#contact", key: "contact" },
] as const;

export function Nav() {
  const t = useTranslations();
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.ariaLabel")}
      className="sticky top-0 z-50 border-paper-line border-b bg-paper/90 backdrop-blur-sm"
    >
      <div className="container-page flex items-center justify-between gap-6 py-4">
        <Link href="/" className="type-label-stamp" aria-label={t("brand.aria")}>
          {t("brand.label")}
        </Link>

        <div className="flex items-center gap-6 md:gap-10">
          <ul className="hidden items-center gap-5 md:flex md:gap-7">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="type-label text-ink transition-colors hover:text-ink-soft"
                >
                  {t(`nav.items.${item.key}`)}
                </a>
              </li>
            ))}
          </ul>

          {/* TODO(phase 3): `usePathname` strips query + hash. Once real
              in-page sections exist, compose `href` from `usePathname()`
              + `window.location.hash` so `#work`-anchored users don't
              lose position when switching locale. */}
          <ul aria-label={t("localeSwitcher.ariaLabel")} className="flex items-center gap-1.5">
            {routing.locales.map((locale) => {
              const isActive = locale === currentLocale;
              const name = t(`localeSwitcher.locales.${locale satisfies Locale}`);
              const label = isActive
                ? t("localeSwitcher.currentLabel", { name })
                : t("localeSwitcher.switchLabel", { name });

              return (
                <li key={locale}>
                  <Link
                    href={pathname}
                    locale={locale}
                    hrefLang={locale}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={label}
                    className={`type-label no-underline transition-colors ${
                      isActive ? "text-ink" : "text-ink-muted hover:text-ink-soft"
                    }`}
                  >
                    {locale.toUpperCase()}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
