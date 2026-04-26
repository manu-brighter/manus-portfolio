/**
 * PortfolioCardVisual — generative Riso placeholder for the meta-card.
 *
 * The Portfolio card on the Work section is self-referential: it
 * represents the very page the user is reading. Rather than embed a
 * screenshot of the hero (which would drift every time the design
 * iterates), we ship a static SVG-only abstraction of the same visual
 * language: paper backing, four spot-color blobs, halftone overlay,
 * a hint of the Hero's right-aligned italic mark. Phase 11 will swap
 * this for a real screenshot when the hero design is locked. See
 * CLAUDE.md Phase 7 deviations.
 *
 * SVG instead of CSS-only because we want soft Gaussian blur on the
 * blobs (filter-blur is shader-quality on SVG) plus crisp halftone
 * dots via `<pattern>`. Total payload < 2kB rendered, all inline.
 */

type PortfolioCardVisualProps = {
  className?: string;
};

export function PortfolioCardVisual({ className }: PortfolioCardVisualProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <filter id="riso-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="32" />
        </filter>
        <pattern
          id="riso-halftone"
          x="0"
          y="0"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="7" cy="7" r="1.4" fill="var(--color-ink)" opacity="0.18" />
        </pattern>
      </defs>

      {/* Paper backing */}
      <rect width="800" height="1000" fill="var(--color-paper-tint)" />

      {/* Four spot-color blobs — echo the fluid sim's posterized ink fields. */}
      <g filter="url(#riso-blur)">
        <ellipse cx="180" cy="320" rx="220" ry="260" fill="var(--color-spot-rose)" opacity="0.7" />
        <ellipse cx="620" cy="240" rx="180" ry="200" fill="var(--color-spot-amber)" opacity="0.6" />
        <ellipse cx="540" cy="700" rx="240" ry="220" fill="var(--color-spot-mint)" opacity="0.55" />
        <ellipse
          cx="220"
          cy="780"
          rx="200"
          ry="180"
          fill="var(--color-spot-violet)"
          opacity="0.5"
        />
      </g>

      {/* Halftone overlay — gives the blob composition a Riso "stamped" feel. */}
      <rect width="800" height="1000" fill="url(#riso-halftone)" />

      {/* Hint of the hero's right-aligned signature mark */}
      <g
        transform="translate(0, 0)"
        fontFamily="var(--font-display, serif)"
        fontStyle="italic"
        fill="var(--color-ink)"
        opacity="0.85"
      >
        <text x="760" y="540" textAnchor="end" fontSize="120" letterSpacing="-3">
          MH.
        </text>
        <text
          x="760"
          y="585"
          textAnchor="end"
          fontSize="14"
          fontFamily="var(--font-mono, monospace)"
          fontStyle="normal"
          letterSpacing="2.5"
          opacity="0.6"
        >
          MANUEL HELLER · MMXXVI
        </text>
      </g>
    </svg>
  );
}
