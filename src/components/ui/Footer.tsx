/**
 * Site footer — Phase 1 skeleton.
 *
 * Layout:
 *   [ © · Basel-Region · MMXXVI ]            [ GH · LI · IG · MAIL ]
 *
 * Social handles render as non-interactive <span> stamps until plan §15
 * content gap is filled. Using <a href="#"> would satisfy axe but trap
 * keyboard users on a no-op link; labels-as-spans avoid that while
 * keeping the visual composition identical. aria-labels communicate
 * the platform name to assistive tech.
 */

const SOCIAL_LINKS = [
  { label: "GH", title: "GitHub" },
  { label: "LI", title: "LinkedIn" },
  { label: "IG", title: "Instagram" },
  { label: "MAIL", title: "Email" },
] as const;

export function Footer() {
  return (
    <footer className="border-paper-line border-t bg-paper">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-8 md:flex-row md:items-center">
        <p className="type-label text-ink-muted">
          © Manuel Heller<span aria-hidden="true"> · </span>Basel-Region
          <span aria-hidden="true"> · </span>MMXXVI
        </p>

        {/* TODO(content): swap <abbr> → <a href={url}> once plan §15 URLs land. */}
        <ul aria-label="Social-Kanäle" className="flex items-center gap-2.5">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.title}>
              <abbr className="type-label-stamp no-underline" title={link.title}>
                {link.label}
              </abbr>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
