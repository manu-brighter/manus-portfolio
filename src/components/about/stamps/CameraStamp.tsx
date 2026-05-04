/**
 * Camera body silhouette — Sony α7-style mirrorless. Wide viewBox
 * (140x90) so the body proportions read like a real camera and the
 * lens has room. Outline-only; the lens centre carries the spot-
 * color accent.
 */

type Props = { spotVar: string };

export function CameraStamp({ spotVar }: Props) {
  return (
    <svg
      width={140}
      height={90}
      viewBox="0 0 140 90"
      aria-hidden="true"
      focusable="false"
      style={{ transform: "rotate(-1deg)" }}
    >
      <title>Camera</title>
      <g
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body with shoulders for the lens mount. */}
        <path
          d="M 18 30
             L 38 30
             L 46 22
             L 96 22
             L 104 30
             L 124 30
             L 124 72
             L 18 72
             Z"
        />
        {/* Top hump (viewfinder / hot-shoe). */}
        <path d="M 60 22 L 60 14 L 84 14 L 84 22" />
        {/* Lens ring outer + inner. */}
        <circle cx={70} cy={50} r={20} />
        <circle cx={70} cy={50} r={14} />
        {/* Grip indent (front-left). */}
        <path d="M 18 38 L 28 38" strokeWidth={1.5} />
        {/* Mode-dial circle on the body shoulder. */}
        <circle cx={114} cy={36} r={2.5} strokeWidth={1.5} />
      </g>
      {/* Lens centre — filled spot. */}
      <circle cx={70} cy={50} r={7} fill={spotVar} />
      {/* Shutter button. */}
      <circle cx={108} cy={28} r={2} fill="var(--color-ink)" />
    </svg>
  );
}
