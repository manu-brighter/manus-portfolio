/**
 * Mountain stamp — twin-peak alpine silhouette with carving chevron.
 * Wide viewBox (140x90) so the peaks have horizontal space and the
 * scene reads as panorama, not stacked. Outline-only; spot-color
 * accent on the snow cap of the dominant peak.
 */

type Props = { spotVar: string };

export function SchneeStamp({ spotVar }: Props) {
  return (
    <svg
      width={140}
      height={90}
      viewBox="0 0 140 90"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(1deg)" }}
    >
      <title>Mountain</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ground / horizon line. */}
        <path d="M 8 76 L 132 76" />
        {/* Big peak (left dominant). */}
        <path d="M 18 76 L 50 18 L 82 76" />
        {/* Small peak behind (right). */}
        <path d="M 64 76 L 92 32 L 122 76" />
        {/* Carving chevron / ski track on the big peak slope. */}
        <path d="M 32 60 L 42 52 L 52 60" />
        <path d="M 38 50 L 46 44 L 54 50" strokeWidth={1.5} />
        {/* Sun / moon disc top-right. */}
        <circle cx={118} cy={20} r={4} strokeWidth={1.5} />
      </g>
      {/* Snow cap on the dominant peak — filled spot. */}
      <path
        d="M 42 32 L 50 18 L 58 32 Z"
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
