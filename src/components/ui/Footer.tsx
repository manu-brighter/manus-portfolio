import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Site footer.
 *
 * Layout (desktop):
 *   [ © · Basel-Region · MMXXVI ]            [ GH · LI · IG · MAIL ]
 *   [ Impressum · Datenschutz ]
 *
 * Mobile: stacks. Social handles stay non-interactive stamps (no real
 * links yet on the corresponding social profiles for the IG slot, and
 * the abbr-with-title pattern preserves keyboard order without an
 * `<a href="#">` no-op). Legal links use the localized `<Link>` from
 * next-intl/navigation so they land on the locale-prefixed routes
 * (`/de/impressum`, `/en/impressum`, …) that Phase 11 ships.
 *
 * Server component — no client-side state needed.
 */

const SOCIAL_STAMPS = [
  { label: "GH", key: "github" },
  { label: "LI", key: "linkedin" },
  { label: "IG", key: "instagram" },
  { label: "MAIL", key: "email" },
] as const;

const LEGAL_LINKS = [
  { href: "/impressum", key: "impressum" },
  { href: "/datenschutz", key: "datenschutz" },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav.items");

  return (
    <footer className="border-paper-line border-t bg-paper">
      <div className="container-page flex flex-col gap-6 py-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="type-label text-ink-muted">
            © Manuel Heller
            <span aria-hidden="true"> · </span>
            {t("location")}
            <span aria-hidden="true"> · </span>
            {t("year")}
          </p>

          <ul aria-label={t("socialAriaLabel")} className="flex items-center gap-2.5">
            {SOCIAL_STAMPS.map((stamp) => (
              <li key={stamp.key}>
                <abbr className="type-label-stamp no-underline" title={t(`social.${stamp.key}`)}>
                  {stamp.label}
                </abbr>
              </li>
            ))}
          </ul>
        </div>

        <ul
          aria-label={t("legalAriaLabel")}
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          {LEGAL_LINKS.map((link) => (
            <li key={link.key}>
              <Link
                href={link.href}
                className="type-label text-ink-muted no-underline transition-colors hover:text-ink"
              >
                {tNav(link.key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
