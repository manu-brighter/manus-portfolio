/**
 * Jogge di Balla stamp — derived from the official logo (oval frame
 * + cocktail glass + boxed wordmark + "since 2022" footer). Wide
 * viewBox (140x90) so the oval reads as oval, not a circle. Outline-
 * only; spot-color reserved for the cocktail-glass olive accent.
 */

type Props = { spotVar: string };

export function JoggediballaStamp({ spotVar }: Props) {
  return (
    <svg
      width={140}
      height={90}
      viewBox="0 0 140 90"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-0.5deg)" }}
    >
      <title>Jogge di Balla</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Wide oval outer frame. */}
        <ellipse cx={70} cy={45} rx={64} ry={40} />
        {/* Cocktail glass — V-shape bowl, stem, base. */}
        <path d="M 60 14 L 80 14 L 70 24 Z" />
        <path d="M 70 24 L 70 30" />
        <path d="M 64 30 L 76 30" strokeWidth={1.5} />
        {/* Top divider strokes flanking the cocktail glass. */}
        <path d="M 18 26 L 56 26" strokeWidth={1.5} />
        <path d="M 84 26 L 122 26" strokeWidth={1.5} />
        {/* Boxed wordmark — wide rectangle for the central monogram. */}
        <rect x={28} y={36} width={84} height={22} strokeWidth={1.5} />
        {/* Bottom divider stroke under the wordmark. */}
        <path d="M 22 65 L 118 65" strokeWidth={1.5} />
      </g>
      {/* Olive in the cocktail — spot-color accent. */}
      <circle cx={70} cy={19} r={2} fill={spotVar} />
      {/* Wordmark — fits inside the box. */}
      <text
        x={70}
        y={52}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={16}
        fontStyle="italic"
        fontWeight={400}
        fill="var(--color-ink)"
      >
        Jogge di Balla
      </text>
      {/* "SINCE 2022" footer. */}
      <text
        x={70}
        y={76}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={6}
        letterSpacing="0.2em"
        fill="var(--color-ink)"
      >
        SINCE 2022
      </text>
    </svg>
  );
}
