"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

/**
 * Site footer — distinct paper-shade band with copyright, legal links,
 * and a Riso "stamp" signature line on the right.
 *
 * Layout (desktop, single row):
 *   [© · Basel-Region · Impressum · Datenschutz]      [MH · STUDIO · MMXXVI]
 *
 * Mobile: stacks vertically (copyright+legal first, signature below).
 *
 * The legal links use the localized <Link> from next-intl/navigation so
 * they land on locale-prefixed routes (/de/impressum etc., shipped in
 * Phase 11). z-10 lifts the footer above the persistent FluidSim canvas
 * stacking context so the band is actually visible at scroll-bottom.
 *
 * Click handler kills all live ScrollTrigger pin-spacers BEFORE the
 * route swap fires (same pattern as PlaygroundCard, see Phase 7
 * deviation). Otherwise React's removeChild on the unmounting case-
 * study section throws NotFoundError because the pin-spacer wraps
 * the section, so it's no longer a direct child of <main>.
 *
 * Component must be "use client" because of the click handler.
 */

const LEGAL_LINKS = [
  { href: "/impressum", key: "impressum" },
  { href: "/datenschutz", key: "datenschutz" },
] as const;

const SIGNATURE_STAMPS = ["MH", "STUDIO", "MMXXVI"] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav.items");
  const router = useRouter();
  const pathname = usePathname();

  // Don't render on playground experiment routes — those routes
  // present a fullscreen WebGL experiment and the editorial paper-
  // shade footer band would clip into the experiment's chrome.
  if (pathname.startsWith("/playground/")) return null;

  const onLegalLinkClick =
    (href: (typeof LEGAL_LINKS)[number]["href"]) => (e: ReactMouseEvent<HTMLAnchorElement>) => {
      // Respect modifier-clicks (open in new tab etc.) — don't intercept.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      // Revert ALL ScrollTrigger pin spacers BEFORE the route change
      // unmounts the home page tree. Otherwise React's removeChild
      // fails because a pin-spacer div wraps the case-study section,
      // so the section is no longer a direct child of <main>.
      // kill(true) restores the original DOM hierarchy.
      for (const trigger of ScrollTrigger.getAll()) trigger.kill(true);
      router.push(href);
    };

  return (
    <footer className="relative z-10 border-paper-line border-t-2 bg-paper-shade">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
        <p className="type-label text-ink-muted">
          © Manuel Heller
          <span aria-hidden="true"> · </span>
          {t("location")}
          <span aria-hidden="true" className="mx-3">
            ·
          </span>
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.key}>
              {i > 0 ? <span aria-hidden="true"> · </span> : null}
              <Link
                href={link.href}
                onClick={onLegalLinkClick(link.href)}
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
