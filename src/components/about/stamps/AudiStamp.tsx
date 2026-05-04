/**
 * Audi S5 B8.5 coupé profile silhouette — flat sports-car stance,
 * long bonnet, fastback roofline. Wider viewBox (140x90) so the
 * coupé proportions read correctly instead of looking like a tall
 * city-car. Outline-only; spot-color reserved for the wheel rims.
 */

type Props = { spotVar: string };

export function AudiStamp({ spotVar }: Props) {
  return (
    <svg
      width={140}
      height={90}
      viewBox="0 0 140 90"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(0.5deg)" }}
    >
      <title>Audi S5 coupé</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Coupé silhouette: front bumper -> long flat hood ->
            steep windshield -> low roofline -> fastback C-pillar ->
            short rear deck -> rear bumper. */}
        <path
          d="M 8 64
             L 10 54
             L 14 50
             L 28 47
             L 44 44
             L 52 41
             L 60 25
             L 84 25
             L 96 32
             L 110 41
             L 122 46
             L 128 50
             L 130 56
             L 130 64"
        />
        {/* Beltline / shoulder running from cowl to C-pillar base. */}
        <path d="M 52 41 L 110 41" />
        {/* B-pillar splitting front + rear door windows. */}
        <path d="M 76 26 L 76 41" />
        {/* Front headlight + grille hint. */}
        <path d="M 8 58 L 16 56" />
        {/* Rear taillight chip. */}
        <path d="M 124 54 L 130 56" />
        {/* Door handle. */}
        <path d="M 64 47 L 70 47" strokeWidth={1.5} />
        {/* Rocker panel between wheel arches. */}
        <path d="M 38 64 L 92 64" />
        {/* Subtle ducktail spoiler on the trunk lid. */}
        <path d="M 122 46 L 124 44" strokeWidth={1.5} />
      </g>
      {/* Front wheel — outline + spot-rim + lug nuts. */}
      <circle cx={28} cy={64} r={10} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
      <circle cx={28} cy={64} r={5} fill={spotVar} stroke="var(--color-ink)" strokeWidth={1.2} />
      <circle cx={28} cy={64} r={1} fill="var(--color-ink)" />
      {/* Rear wheel — outline + spot-rim + lug nuts. */}
      <circle cx={102} cy={64} r={10} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
      <circle cx={102} cy={64} r={5} fill={spotVar} stroke="var(--color-ink)" strokeWidth={1.2} />
      <circle cx={102} cy={64} r={1} fill="var(--color-ink)" />
      {/* Ground reference ticks. */}
      <g stroke="var(--color-ink)" strokeWidth={1.5} strokeLinecap="round">
        <path d="M 14 78 L 42 78" />
        <path d="M 88 78 L 116 78" />
      </g>
    </svg>
  );
}
