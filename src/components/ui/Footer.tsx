import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Site footer — distinct paper-shade band with copyright, legal links,
 * and a Riso "stamp" signature line on the right.
 *
 * Layout (desktop, single row):
 *   [© · Basel-Region · MMXXVI · Impressum · Datenschutz]      [vibecoded · selbst gehostet · ohne tracker]
 *
 * Mobile: stacks vertically (copyright+legal first, signature below).
 *
 * The legal links use the localized <Link> from next-intl/navigation so
 * they land on locale-prefixed routes (/de/impressum etc., shipped in
 * Phase 11). z-10 lifts the footer above the persistent FluidSim canvas
 * stacking context so the band is actually visible at scroll-bottom.
 *
 * The previous social-stamp row (GH/LI/IG/MAIL) was removed because
 * those handles already render as real links in the Contact section
 * directly above; duplicating them in the footer was redundant.
 *
 * Server component — no client-side state needed.
 */

const LEGAL_LINKS = [
  { href: "/impressum", key: "impressum" },
  { href: "/datenschutz", key: "datenschutz" },
] as const;

const SIGNATURE_STAMPS = ["vibecoded", "selbst gehostet", "ohne tracker"] as const;

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

        <p className="type-label-stamp text-ink-muted">
          {SIGNATURE_STAMPS.map((stamp, i) => (
            <span key={stamp}>
              {i > 0 ? (
                <span aria-hidden="true" className="mx-2">
                  ·
                </span>
              ) : null}
              {stamp}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
