import { useTranslations } from "next-intl";

/**
 * Site footer — Phase 2 (i18n wired).
 *
 * Layout:
 *   [ © · Basel-Region · MMXXVI ]            [ GH · LI · IG · MAIL ]
 *
 * Social handles stay non-interactive stamps until plan §15 content gap
 * is filled. Using `<a href="#">` would satisfy axe but trap keyboard
 * users on a no-op link; labels-as-spans avoid that while keeping the
 * visual composition identical. `aria-label` communicates the platform
 * name to assistive tech.
 *
 * Server component — no client-side state needed.
 */

const SOCIAL_STAMPS = [
  { label: "GH", key: "github" },
  { label: "LI", key: "linkedin" },
  { label: "IG", key: "instagram" },
  { label: "MAIL", key: "email" },
] as const;

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-paper-line border-t bg-paper">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-8 md:flex-row md:items-center">
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
    </footer>
  );
}
