/**
 * Ping-pong stamp — clean paddle silhouette (oval rubber face,
 * tapered neck, rectangular handle with rounded grip end) plus ball.
 * Wider viewBox (140x90) so the paddle has room to breathe.
 * Outline-only with the rubber face accented in spot-color.
 */

type Props = { spotVar: string };

export function PingPongStamp({ spotVar }: Props) {
  return (
    <svg
      width={140}
      height={90}
      viewBox="0 0 140 90"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-2deg)" }}
    >
      <title>Ping-pong</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Paddle outline — oval face -> tapered neck -> handle ->
            rounded grip end. */}
        <path
          d="M 50 8
             Q 18 8, 18 32
             Q 18 56, 50 56
             L 54 60
             L 50 66
             L 50 80
             Q 50 86, 56 86
             L 70 86
             Q 76 86, 76 80
             L 76 66
             L 72 60
             L 76 56
             Q 108 56, 108 32
             Q 108 8, 76 8
             Z"
        />
        {/* Inner rubber-face contour — sits inside the face for the
            Riso double-line feel. */}
        <ellipse cx={63} cy={32} rx={36} ry={20} stroke={spotVar} strokeWidth={1.5} />
        {/* Grip-band detail across the handle. */}
        <path d="M 50 72 L 76 72" strokeWidth={1.5} />
      </g>
      {/* Ball — small filled circle to the right of the handle. */}
      <circle cx={120} cy={70} r={6} fill={spotVar} stroke="var(--color-ink)" strokeWidth={2} />
    </svg>
  );
}
