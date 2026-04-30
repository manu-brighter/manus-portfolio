/**
 * InkDropCardVisual — static placeholder visual for the home-page
 * Playground card pointing at /playground/ink-drop-studio.
 *
 * Pure SVG, no shader. Echoes the studio's actual visual language:
 * paper backing, overlapping Riso-spot blurred blobs (the layered-
 * ink look the toon shader produces from the dye field), halftone
 * overlay, plus a small "studio" stamp mark in the top-left to hint
 * at the route's identity.
 *
 * Sprint 4b will lay a hover-driven mini-sim on top of this and
 * cross-fade between them; the SVG stays as the cheap idle state.
 */

type Props = { className?: string };

export function InkDropCardVisual({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <filter id="ink-drop-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="36" />
        </filter>
        <pattern
          id="ink-drop-halftone"
          x="0"
          y="0"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="6" cy="6" r="1.2" fill="var(--color-ink)" opacity="0.18" />
        </pattern>
      </defs>

      {/* Paper backing */}
      <rect width="800" height="600" fill="var(--color-paper-tint)" />

      {/* Three overlapping spots — sized + placed to suggest a fresh
          studio session: a dominant violet bloom, an amber edge, a
          mint trail. Mirrors the toon shader's density-to-spot ladder
          collapsing into a few large Riso layers. */}
      <g filter="url(#ink-drop-blur)">
        <ellipse
          cx="320"
          cy="280"
          rx="220"
          ry="200"
          fill="var(--color-spot-violet)"
          opacity="0.78"
        />
        <ellipse cx="540" cy="220" rx="160" ry="140" fill="var(--color-spot-rose)" opacity="0.7" />
        <ellipse
          cx="190"
          cy="430"
          rx="170"
          ry="150"
          fill="var(--color-spot-amber)"
          opacity="0.65"
        />
        <ellipse cx="600" cy="450" rx="200" ry="170" fill="var(--color-spot-mint)" opacity="0.6" />
      </g>

      {/* Halftone overlay — the Riso "stamped" texture */}
      <rect width="800" height="600" fill="url(#ink-drop-halftone)" />

      {/* Mono kicker in upper-left corner — Riso receipt stamp */}
      <g fontFamily="var(--font-mono, monospace)" fill="var(--color-ink)">
        <text x="36" y="50" fontSize="13" letterSpacing="3">
          INK DROP STUDIO
        </text>
      </g>
    </svg>
  );
}
