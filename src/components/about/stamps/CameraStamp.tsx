/**
 * Camera body silhouette — Sony α7-style mirrorless. The lens centre
 * is filled in spot-color (first accent), the body outline is ink.
 * Hand-cut feel via slight asymmetry and rounded line caps.
 */

type Props = { spotVar: string };

export function CameraStamp({ spotVar }: Props) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-2deg)" }}
    >
      <title>Camera</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body */}
        <path d="M 12 26 L 22 26 L 26 20 L 54 20 L 58 26 L 68 26 L 68 60 L 12 60 Z" />
        {/* Top hump (viewfinder) */}
        <path d="M 32 20 L 32 14 L 48 14 L 48 20" />
        {/* Lens ring outer */}
        <circle cx={40} cy={43} r={14} />
        {/* Lens ring inner */}
        <circle cx={40} cy={43} r={9} />
      </g>
      {/* Lens centre — filled spot */}
      <circle cx={40} cy={43} r={5} fill={spotVar} />
      {/* Shutter dot */}
      <circle cx={62} cy={31} r={1.5} fill="var(--color-ink)" />
    </svg>
  );
}
