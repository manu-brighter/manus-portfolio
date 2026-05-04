/**
 * Joggediballa wordmark stamp — "JdB" monogram in the project's
 * Instrument-Serif Italic style, framed by a Riso-stamp box.
 */

type Props = { spotVar: string };

export function JoggediballaStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-1deg)" }}
    >
      <title>Joggediballa</title>
      {/* Stamp frame */}
      <rect
        x={10}
        y={18}
        width={60}
        height={44}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Inner soft frame in spot */}
      <rect x={14} y={22} width={52} height={36} fill="none" stroke={spotVar} strokeWidth={1} />
      {/* Monogram */}
      <text
        x={40}
        y={49}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={22}
        fontStyle="italic"
        fontWeight={400}
        fill="var(--color-ink)"
      >
        JdB
      </text>
    </svg>
  );
}
