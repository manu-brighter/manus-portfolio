/**
 * Top navigation — Phase 1 skeleton.
 *
 * Editorial layout per plan §4.3 / §5:
 *   [ Brand (mono stamp) ]      [ Work · About · Playground · Contact ]
 *                                                       [ DE EN FR IT ]
 *
 * The 4 nav items are an editorial cut from the 8 sections in §5:
 *   - Joggediballa is folded into Work as a case-study block
 *   - Skills folds into About
 *   - Photography is a teaser in the scroll flow (no nav entry)
 *
 * Hardcoded de-strings are intentional in Phase 1; replaced by next-intl
 * in Phase 2. Locale switcher is rendered as static stamps so the Phase 2
 * wiring doesn't require relayout.
 */

const NAV_ITEMS = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#playground", label: "Playground" },
  { href: "#contact", label: "Contact" },
] as const;

const LOCALES = [
  { code: "de", label: "DE", name: "Deutsch", active: true },
  { code: "en", label: "EN", name: "English", active: false },
  { code: "fr", label: "FR", name: "Français", active: false },
  { code: "it", label: "IT", name: "Italiano", active: false },
] as const;

export function Nav() {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-50 border-paper-line border-b bg-paper/90 backdrop-blur-sm"
    >
      <div className="container-page flex items-center justify-between gap-6 py-4">
        <a href="/" className="type-label-stamp" aria-label="Manuel Heller — home">
          MH<span aria-hidden="true">·</span>STUDIO
        </a>

        <div className="flex items-center gap-6 md:gap-10">
          <ul className="hidden items-center gap-5 md:flex md:gap-7">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="type-label text-ink transition-colors hover:text-ink-soft"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {/* TODO(i18n): wire to next-intl router in Phase 2 — will become
              <a aria-current="page" href="/<locale>/"> so that aria-current
              actually carries weight with assistive tech. Until then these
              are non-interactive <abbr>s announcing the full language name. */}
          <ul aria-label="Sprache" className="flex items-center gap-1.5">
            {LOCALES.map((locale) => (
              <li key={locale.code}>
                <abbr
                  className={`no-underline ${
                    locale.active ? "type-label text-ink" : "type-label text-ink-muted"
                  }`}
                  data-locale={locale.code}
                  title={locale.active ? `Aktuelle Sprache: ${locale.name}` : locale.name}
                >
                  {locale.label}
                </abbr>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
