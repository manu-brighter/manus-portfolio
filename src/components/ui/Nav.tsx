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
  { code: "de", label: "DE", active: true },
  { code: "en", label: "EN", active: false },
  { code: "fr", label: "FR", active: false },
  { code: "it", label: "IT", active: false },
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

          {/* TODO(i18n): wire to next-intl router in Phase 2.
              Static stamps for now so layout doesn't shift later. */}
          <ul aria-label="Language" className="flex items-center gap-1.5">
            {LOCALES.map((locale) => (
              <li key={locale.code}>
                <span
                  aria-current={locale.active ? "true" : undefined}
                  className={locale.active ? "type-label text-ink" : "type-label text-ink-faint"}
                  data-locale={locale.code}
                >
                  {locale.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
