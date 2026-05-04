/**
 * Mountain stamp — twin-peak triangle with a chevron mark for the
 * carving line. Snow-cap accent in spot-color.
 */

type Props = { spotVar: string };

export function SchneeStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(2deg)" }}
    >
      <title>Mountain</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ground line */}
        <path d="M 8 60 L 72 60" />
        {/* Big peak */}
        <path d="M 12 60 L 32 22 L 52 60" />
        {/* Small peak behind */}
        <path d="M 40 60 L 56 32 L 68 60" />
        {/* Carving chevron line */}
        <path d="M 22 50 L 30 44 L 38 50" />
      </g>
      {/* Snow cap — filled spot */}
      <path
        d="M 27 30 L 32 22 L 37 30 Z"
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
