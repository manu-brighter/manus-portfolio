/**
 * Sportscar profile silhouette — sloped roofline, low stance, single
 * wheel-arch detail. Wheels filled in spot-color.
 */

type Props = { spotVar: string };

export function AudiStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(1.5deg)" }}
    >
      <title>Sportscar</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body silhouette */}
        <path d="M 6 52 L 14 52 L 18 38 Q 24 30, 38 28 L 52 28 Q 62 28, 70 36 L 74 44 L 74 52 L 70 52" />
        {/* Roofline + windows */}
        <path d="M 22 38 L 28 32 L 50 32 L 56 38" />
        {/* Window divider */}
        <path d="M 38 32 L 38 38" />
        {/* Bottom line under wheels */}
        <path d="M 22 56 L 30 56 M 50 56 L 58 56" />
      </g>
      {/* Wheels — filled spot */}
      <circle cx={26} cy={56} r={6} fill={spotVar} stroke="var(--color-ink)" strokeWidth={2} />
      <circle cx={54} cy={56} r={6} fill={spotVar} stroke="var(--color-ink)" strokeWidth={2} />
    </svg>
  );
}
