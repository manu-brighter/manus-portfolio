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
    <footer className="relative z-10 border-paper-line border-t-2 bg-paper-shade">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
        <p className="type-label text-ink-muted">
          © Manuel Heller
          <span aria-hidden="true"> · </span>
          {t("location")}
          <span aria-hidden="true"> · </span>
          {t("year")}
          <span aria-hidden="true" className="mx-3">
            ·
          </span>
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.key}>
              {i > 0 ? <span aria-hidden="true"> · </span> : null}
              <Link
                href={link.href}
                className="text-ink underline decoration-ink-soft underline-offset-2 transition-colors hover:decoration-ink"
                aria-label={tNav(link.key)}
              >
                {tNav(link.key)}
              </Link>
            </span>
          ))}
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
    </footer>
  );
}
