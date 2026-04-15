/**
 * Site footer — Phase 1 skeleton.
 *
 * Layout:
 *   [ © · Basel-Region · MMXXVI ]            [ GH · LI · IG · MAIL ]
 *
 * Social handles are placeholders until the content gap in plan §15 is
 * filled. href="#" + aria-label keeps the markup semantic and axe-clean
 * without committing to dummy URLs.
 */

const SOCIAL_LINKS = [
  { label: "GH", href: "#", title: "GitHub" },
  { label: "LI", href: "#", title: "LinkedIn" },
  { label: "IG", href: "#", title: "Instagram" },
  { label: "MAIL", href: "#", title: "Email" },
] as const;

export function Footer() {
  return (
    <footer className="border-paper-line border-t bg-paper">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-8 md:flex-row md:items-center">
        <p className="type-label text-ink-muted">
          © Manuel Heller<span aria-hidden="true"> · </span>Basel-Region
          <span aria-hidden="true"> · </span>MMXXVI
        </p>

        <ul aria-label="Social links" className="flex items-center gap-2.5">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.title}>
              {/* TODO(content): wire real URLs once plan §15 gap is filled. */}
              <a
                aria-label={link.title}
                className="type-label-stamp transition-colors hover:bg-ink hover:text-paper-tint"
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
