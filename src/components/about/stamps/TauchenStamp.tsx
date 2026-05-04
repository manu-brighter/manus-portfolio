/**
 * Diving mask stamp — frame, twin glass, head-strap, escape bubble.
 * Wide viewBox (140x90) so both glass panels have room and the strap
 * doesn't get clipped. Outline-only; spot-color reserved for the
 * glass panes (which read as the colour the diver looks through).
 */

type Props = { spotVar: string };

export function TauchenStamp({ spotVar }: Props) {
  return (
    <svg
      width={140}
      height={90}
      viewBox="0 0 140 90"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-1deg)" }}
    >
      <title>Diving mask</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Mask frame — rounded rectangle with rubber skirt feel. */}
        <path
          d="M 26 30
             L 26 60
             Q 26 70, 36 70
             L 104 70
             Q 114 70, 114 60
             L 114 30
             Q 114 22, 104 22
             L 36 22
             Q 26 22, 26 30 Z"
        />
        {/* Bridge between the two glass panes. */}
        <path d="M 66 36 L 74 36" />
        <path d="M 66 56 L 74 56" />
        {/* Head straps left + right. */}
        <path d="M 26 38 L 12 38" />
        <path d="M 26 54 L 12 54" />
        <path d="M 114 38 L 128 38" />
        <path d="M 114 54 L 128 54" />
      </g>
      {/* Left glass pane — spot fill. */}
      <rect
        x={32}
        y={28}
        width={28}
        height={36}
        rx={4}
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
      {/* Right glass pane — spot fill. */}
      <rect
        x={80}
        y={28}
        width={28}
        height={36}
        rx={4}
        fill={spotVar}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
      {/* Escape bubble. */}
      <circle cx={124} cy={14} r={3.5} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
      <circle cx={130} cy={20} r={1.6} fill="var(--color-ink)" />
    </svg>
  );
}
