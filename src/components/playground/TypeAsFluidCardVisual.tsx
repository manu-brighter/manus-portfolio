/**
 * TypeAsFluidCardVisual — static placeholder visual for the home-page
 * Playground card pointing at /playground/type-as-fluid.
 *
 * Echoes the experiment's actual visual: the brand word in italic
 * Instrument Serif, partially absorbed by Riso spot ink behind it.
 * The text is visible but bleeding at the edges — exactly what a
 * just-stamped word looks like in the live experiment a moment after
 * the dye starts spreading.
 *
 * Sprint 4b will lay a hover-driven mini-sim on top of this and
 * cross-fade.
 */

type Props = { className?: string };

export function TypeAsFluidCardVisual({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <filter id="type-fluid-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="42" />
        </filter>
        <filter id="type-text-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <pattern
          id="type-fluid-halftone"
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

      {/* Soft Riso-spot blooms behind the word — mint + amber drift,
          violet pooling under the centre of the text. Wider blur than
          the ink-drop card so the text floats over a haze rather than
          competing with hard blobs. */}
      <g filter="url(#type-fluid-blur)">
        <ellipse cx="220" cy="250" rx="220" ry="160" fill="var(--color-spot-mint)" opacity="0.55" />
        <ellipse
          cx="600"
          cy="380"
          rx="200"
          ry="160"
          fill="var(--color-spot-amber)"
          opacity="0.55"
        />
        <ellipse
          cx="420"
          cy="320"
          rx="220"
          ry="150"
          fill="var(--color-spot-violet)"
          opacity="0.5"
        />
      </g>

      {/* Halftone */}
      <rect width="800" height="600" fill="url(#type-fluid-halftone)" />

      {/* The word — Instrument Serif Italic, slightly blurred to read
          as "ink, mid-bleed". Two layers: a soft underglow in spot-rose
          (offset, blurred) and the crisp ink mark on top. Same Riso-
          misregistration trick as the OverprintReveal hero treatment. */}
      <g fontFamily="var(--font-display, serif)" fontStyle="italic">
        <text
          x="402"
          y="350"
          textAnchor="middle"
          fontSize="180"
          fill="var(--color-spot-rose)"
          opacity="0.65"
          filter="url(#type-text-blur)"
          letterSpacing="-3"
        >
          Manuel.
        </text>
        <text
          x="400"
          y="348"
          textAnchor="middle"
          fontSize="180"
          fill="var(--color-ink)"
          letterSpacing="-3"
        >
          Manuel.
        </text>
      </g>

      {/* Mono kicker top-left */}
      <g fontFamily="var(--font-mono, monospace)" fill="var(--color-ink)">
        <text x="36" y="50" fontSize="13" letterSpacing="3">
          TYPE-AS-FLUID
        </text>
      </g>
    </svg>
  );
}
