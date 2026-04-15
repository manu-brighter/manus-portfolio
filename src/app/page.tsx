/**
 * Home — Phase 1 hero placeholder.
 *
 * The fluid sim arrives in Phase 4. Until then this page proves the
 * editorial layout works: right-aligned Instrument Serif italic anchored
 * to the right edge, left mono-stamp column for biographical meta. The
 * left margin must read as "breathing room" — that's the slot the fluid
 * will eventually fill.
 *
 * Strings are de-baseline; next-intl integration lands in Phase 2.
 */

const STATUS_STAMPS = ["Section 00 · Hero", "Status · Booting"] as const;
const BIO_STAMPS = ["zvoove AG · Frontend", "Joggediballa · VP", "Basel-Region · CH"] as const;

export default function HomePage() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="container-page grid-12 relative min-h-[calc(100dvh-9rem)] items-end gap-y-12 py-16 md:py-24"
    >
      <div className="stamp-column col-span-12 self-start text-ink-muted md:col-span-4">
        {STATUS_STAMPS.map((label) => (
          <span key={label} className="type-label">
            {label}
          </span>
        ))}
      </div>

      <h1 id="hero-heading" className="type-display col-span-12 text-ink md:col-span-12">
        Heller, <span className="not-italic">/</span> Manuel.
      </h1>

      <div className="stamp-column col-span-12 md:col-span-5">
        {BIO_STAMPS.map((label) => (
          <span key={label} className="type-label-stamp">
            {label}
          </span>
        ))}
      </div>

      <p className="type-body-lg col-span-12 ml-auto text-right text-ink-soft md:col-span-7">
        Awwwards-grade craft portfolio
        <span aria-hidden="true"> — </span>
        <em>booting…</em>
      </p>
    </section>
  );
}
