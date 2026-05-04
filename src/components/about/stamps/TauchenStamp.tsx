/**
 * Diving mask stamp — frame, glass, snorkel-strap detail. Glass
 * filled in spot-color.
 */

type Props = { spotVar: string };

export function TauchenStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-1.5deg)" }}
    >
      <title>Diving mask</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Mask frame */}
        <path d="M 14 32 L 14 50 Q 14 56, 20 56 L 60 56 Q 66 56, 66 50 L 66 32 Q 66 26, 60 26 L 20 26 Q 14 26, 14 32 Z" />
        {/* Bridge (between left + right glass) */}
        <path d="M 38 36 L 42 36 M 38 46 L 42 46" />
        {/* Strap left */}
        <path d="M 14 38 L 6 38" />
        {/* Strap right */}
        <path d="M 66 38 L 74 38" />
      </g>
      {/* Glass left — filled spot */}
      <rect
        x={18}
        y={30}
        width={18}
        height={20}
        rx={3}
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
      {/* Glass right — filled spot */}
      <rect
        x={44}
        y={30}
        width={18}
        height={20}
        rx={3}
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
      {/* Bubble */}
      <circle cx={68} cy={20} r={3} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
    </svg>
  );
}
