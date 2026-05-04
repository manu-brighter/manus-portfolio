/**
 * Ping-pong stamp — paddle (with grip) plus ball. Paddle face filled
 * in spot-color.
 */

type Props = { spotVar: string };

export function PingPongStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(1deg)" }}
    >
      <title>Ping-pong</title>
      {/* Paddle face */}
      <ellipse
        cx={36}
        cy={34}
        rx={20}
        ry={22}
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
      {/* Paddle handle */}
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 30 56 L 22 70 L 32 72 L 38 60" />
        {/* Face contour */}
        <ellipse cx={36} cy={34} rx={14} ry={16} />
      </g>
      {/* Ball — small filled circle */}
      <circle
        cx={62}
        cy={56}
        r={5}
        fill="var(--color-paper-tint)"
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
    </svg>
  );
}
