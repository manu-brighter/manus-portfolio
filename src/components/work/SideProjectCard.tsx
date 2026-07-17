import type { SpotColor } from "@/lib/palette";
import { SPOT_CSS_VAR } from "@/lib/palette";

/**
 * SideProjectCard — compact B-side unit under the two Work hero cards.
 *
 * Deliberately quieter than WorkCard: no GSAP choreography, no fluid
 * splats, no media frame — a bordered riso stamp-card that reads like
 * a catalog entry and links out to the GitHub repo. The hover language
 * is the site-wide stamp affordance (translate + hard offset shadow in
 * the card's spot color), pure CSS so the component stays server-side.
 *
 * Whole card is one external link — the CTA row is decorative
 * affordance, not a second interactive element (nested links are an
 * a11y trap).
 */

type SideProjectCardProps = {
  title: string;
  tagline: string;
  description: string;
  stack: string[];
  ctaLabel: string;
  href: string;
  spot: SpotColor;
};

export function SideProjectCard({
  title,
  tagline,
  description,
  stack,
  ctaLabel,
  href,
  spot,
}: SideProjectCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col gap-4 border-[1.5px] border-ink bg-paper-tint p-5 transition-[transform,box-shadow] duration-200 ease-out hover:translate-x-[-2px] hover:translate-y-[-2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-4 focus-visible:ring-offset-paper md:p-6"
      style={{ "--card-spot": SPOT_CSS_VAR[spot] } as React.CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="font-display italic text-ink text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.1] tracking-[-0.015em]">
          {title}
        </h4>
        {/* Spot dot — color as fill only (AA rule), the tagline below
            carries the text. */}
        <span
          aria-hidden="true"
          className="size-3 shrink-0 rounded-full border border-ink/40"
          style={{ background: "var(--card-spot)" }}
        />
      </div>

      <p className="type-label text-ink-muted">{tagline}</p>

      <p className="type-body-sm text-ink-soft">{description}</p>

      <ul className="mt-auto flex flex-wrap gap-2 pt-2">
        {stack.map((s) => (
          <li
            key={s}
            className="rounded-[2px] border border-ink/30 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft"
          >
            {s}
          </li>
        ))}
      </ul>

      <span className="inline-flex items-center gap-2 self-start rounded-[2px] border-[1.5px] border-ink bg-paper px-3 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-ink transition-[transform,box-shadow] duration-200 group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[3px_3px_0_var(--card-spot)]">
        {ctaLabel}
        <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}
