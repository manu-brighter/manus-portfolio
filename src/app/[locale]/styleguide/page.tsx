import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { dur, ease } from "@/lib/motion/tokens";

/**
 * Internal design-system reference. Content stays English across all
 * locales on purpose: token names, CSS vars, and motion identifiers
 * are code-level artefacts — translating "--color-paper-tint" to
 * "--couleur-papier-teinte" would be absurd. The page still lives under
 * `[locale]` so the routing stays homogeneous and `generateStaticParams`
 * doesn't need a special case.
 *
 * Root layout already sets `robots: noindex` globally; repeated here for
 * safety in case Phase 11 inverts the default.
 */

export const metadata: Metadata = {
  title: "Styleguide — Manuel Heller",
  robots: { index: false, follow: false },
};

const PALETTE: Array<{ token: string; cssVar: string; role: string }> = [
  { token: "paper", cssVar: "--color-paper", role: "Dominant surface (≥70%)" },
  { token: "paper-tint", cssVar: "--color-paper-tint", role: "Elevated surface" },
  { token: "paper-shade", cssVar: "--color-paper-shade", role: "Sunken surface" },
  { token: "paper-line", cssVar: "--color-paper-line", role: "Hairlines, dividers" },
  { token: "ink", cssVar: "--color-ink", role: "Body text, bold outlines" },
  { token: "ink-soft", cssVar: "--color-ink-soft", role: "Secondary text" },
  { token: "ink-muted", cssVar: "--color-ink-muted", role: "Tertiary text (UI labels)" },
  { token: "ink-faint", cssVar: "--color-ink-faint", role: "Decorative only — not for text" },
  { token: "spot-rose", cssVar: "--color-spot-rose", role: "Primary spot (CTAs)" },
  { token: "spot-amber", cssVar: "--color-spot-amber", role: "Warm accent" },
  { token: "spot-mint", cssVar: "--color-spot-mint", role: "Cool accent + focus ring" },
  { token: "spot-violet", cssVar: "--color-spot-violet", role: "Secondary cool" },
];

const TYPE_SAMPLES = [
  { className: "type-display", label: "type-display", sample: "Heller, Manuel." },
  { className: "type-h1", label: "type-h1", sample: "Section headline" },
  { className: "type-h2", label: "type-h2", sample: "Sub-section headline" },
  { className: "type-h3", label: "type-h3", sample: "Tertiary headline" },
  {
    className: "type-body-lg",
    label: "type-body-lg",
    sample:
      "Lead body — sets the editorial tone for long-form sections like About and case studies.",
  },
  {
    className: "type-body",
    label: "type-body",
    sample:
      "Default body copy — stays inside the 65ch comfort range to keep reading rhythm steady across viewports.",
  },
  { className: "type-label", label: "type-label", sample: "Section · Eyebrow" },
] as const;

type StyleguideProps = {
  params: Promise<{ locale: string }>;
};

export default function StyleguidePage({ params }: StyleguideProps) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <div className="container-page space-y-20 py-16">
      <header className="space-y-3">
        <p className="type-label text-ink-muted">Internal · Design System</p>
        <h1 className="type-h1 text-ink">Tokens, type, motion.</h1>
        <p className="type-body text-ink-soft">
          Visual baseline for the Phase 1 design system. All tokens here are authoritative —
          components consume them, never duplicate.
        </p>
      </header>

      <section aria-labelledby="palette-heading" className="space-y-6">
        <h2 className="type-h2 text-ink" id="palette-heading">
          Palette
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {PALETTE.map((swatch) => (
            <li
              key={swatch.token}
              className="flex flex-col gap-2 border border-paper-line bg-paper-tint p-3"
            >
              <div
                aria-hidden="true"
                className="h-20 w-full border border-paper-line"
                style={{ background: `var(${swatch.cssVar})` }}
              />
              <div className="space-y-1">
                <p className="type-label text-ink">{swatch.token}</p>
                <p className="type-label text-ink-muted">{swatch.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type-heading" className="space-y-8">
        <h2 className="type-h2 text-ink" id="type-heading">
          Type scale
        </h2>
        <ul className="space-y-10">
          {TYPE_SAMPLES.map((entry) => (
            <li key={entry.label} className="grid grid-cols-12 items-baseline gap-x-6 gap-y-3">
              <p className="type-label col-span-12 text-ink-muted md:col-span-2">{entry.label}</p>
              <p className={`${entry.className} col-span-12 text-ink md:col-span-10`}>
                {entry.sample}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stamp-heading" className="space-y-6">
        <h2 className="type-h2 text-ink" id="stamp-heading">
          Mono stamps
        </h2>
        <div className="flex flex-wrap gap-2">
          <span className="type-label-stamp">zvoove · Frontend</span>
          <span className="type-label-stamp">Joggediballa · VP</span>
          <span className="type-label-stamp">Basel-Region</span>
          <span className="type-label-stamp">Section 00</span>
        </div>
      </section>

      <section aria-labelledby="motion-heading" className="space-y-6">
        <h2 className="type-h2 text-ink" id="motion-heading">
          Motion tokens
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="type-label mb-3 text-ink-muted">Easing</p>
            <ul className="space-y-2">
              {Object.entries(ease).map(([name, curve]) => (
                <li
                  key={name}
                  className="flex items-baseline justify-between gap-4 border-paper-line border-b py-2"
                >
                  <span className="type-label text-ink">{name}</span>
                  <code className="font-mono text-ink-muted text-xs">[{curve.join(", ")}]</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="type-label mb-3 text-ink-muted">Duration (s)</p>
            <ul className="space-y-2">
              {Object.entries(dur).map(([name, seconds]) => (
                <li
                  key={name}
                  className="flex items-baseline justify-between gap-4 border-paper-line border-b py-2"
                >
                  <span className="type-label text-ink">{name}</span>
                  <code className="font-mono text-ink-muted text-xs">{seconds}s</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="grid-heading" className="space-y-6">
        <h2 className="type-h2 text-ink" id="grid-heading">
          12-col grid
        </h2>
        <p className="type-body text-ink-soft">
          Container caps at <code className="font-mono text-ink">96rem</code> with responsive
          gutters. The grid below visualises the columns; gap shrinks on narrow viewports.
        </p>
        <div aria-hidden="true" className="grid-12 h-32 border border-paper-line bg-paper-tint p-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((col) => (
            <div key={col} className="flex items-center justify-center bg-ink/10 text-ink-soft">
              <span className="type-label">{col}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
