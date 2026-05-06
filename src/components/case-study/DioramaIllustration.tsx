/**
 * DioramaIllustration — single SVG component rendering all background
 * elements of the Case Study diorama:
 *   - Comic-style table-edge outlines (top + bottom)
 *   - Embedded tools: camera, hot-shoe flash, pencil, ruler, coffee mug
 *     top-down
 *   - Decorative ink splats (Riso spot colors, scattered)
 *
 * ViewBox 4200x1000, preserveAspectRatio xMidYMid meet. Rendered at
 * h-full inside DioramaTrack (track is 420vh wide, so SVG fills track).
 *
 * The Lupe (magnifier) used to live here; it's been extracted into
 * DioramaLupe.tsx so it can sit on TOP of DioramaCards in z-order.
 * This component is now purely presentational (no hooks, no animation),
 * safe to render as a server component.
 */

export function DioramaIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 4200 1000"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      {/* Comic-style table-edge outlines (top + bottom) */}
      <path
        d="M 110 90 Q 600 75, 1200 100 Q 1800 80, 2400 105 Q 3000 85, 3600 105 L 4090 105"
        stroke="var(--color-ink)"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 110 960 Q 700 975, 1300 960 Q 1900 980, 2500 965 Q 3100 975, 3700 960 L 4090 960"
        stroke="var(--color-ink)"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />

      {/* Camera (Sony α7-style top-down, enlarged ~30% from prior iteration) */}
      <g transform="translate(240, 130)">
        <rect
          x={0}
          y={28}
          width={190}
          height={108}
          fill="var(--color-paper-tint)"
          stroke="var(--color-ink)"
          strokeWidth={3}
          rx={8}
        />
        <rect
          x={55}
          y={0}
          width={80}
          height={28}
          fill="var(--color-paper-tint)"
          stroke="var(--color-ink)"
          strokeWidth={3}
        />
        <circle cx={95} cy={82} r={38} fill="none" stroke="var(--color-ink)" strokeWidth={3} />
        <circle cx={95} cy={82} r={24} fill="var(--color-spot-rose)" opacity={0.5} />
        <circle cx={95} cy={82} r={14} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
        <circle cx={166} cy={40} r={5} fill="var(--color-ink)" />
      </g>

      {/* Hot-shoe flash (top-down) */}
      <g transform="translate(540, 145) rotate(8)">
        <rect
          x={0}
          y={0}
          width={90}
          height={55}
          fill="var(--color-paper-tint)"
          stroke="var(--color-ink)"
          strokeWidth={3}
          rx={3}
        />
        <rect
          x={8}
          y={8}
          width={74}
          height={39}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={1.5}
        />
        <line
          x1={20}
          y1={14}
          x2={20}
          y2={42}
          stroke="var(--color-ink)"
          strokeWidth={0.8}
          opacity={0.5}
        />
        <line
          x1={40}
          y1={14}
          x2={40}
          y2={42}
          stroke="var(--color-ink)"
          strokeWidth={0.8}
          opacity={0.5}
        />
        <line
          x1={60}
          y1={14}
          x2={60}
          y2={42}
          stroke="var(--color-ink)"
          strokeWidth={0.8}
          opacity={0.5}
        />
        <rect
          x={22}
          y={55}
          width={46}
          height={70}
          fill="var(--color-paper-tint)"
          stroke="var(--color-ink)"
          strokeWidth={3}
          rx={3}
        />
        <rect x={32} y={125} width={26} height={10} fill="var(--color-ink)" />
        <circle cx={45} cy={85} r={7} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
      </g>

      {/* Pencil */}
      <g transform="translate(1100, 145) rotate(-20)">
        <rect
          x={0}
          y={0}
          width={180}
          height={14}
          fill="var(--color-spot-amber)"
          stroke="var(--color-ink)"
          strokeWidth={2}
        />
        <polygon points="180,0 200,7 180,14" fill="var(--color-ink)" />
        <rect x={-15} y={0} width={15} height={14} fill="var(--color-ink)" />
      </g>

      {/* Ruler — placed in the gap between WhatCard (ends ~56vh) and StackCard (~66vh) */}
      <g transform="translate(880, 590) rotate(8)">
        <rect
          x={0}
          y={0}
          width={220}
          height={22}
          fill="var(--color-paper-tint)"
          stroke="var(--color-ink)"
          strokeWidth={3}
        />
        <g stroke="var(--color-ink)" strokeWidth={1}>
          <line x1={20} y1={0} x2={20} y2={14} />
          <line x1={40} y1={0} x2={40} y2={8} />
          <line x1={60} y1={0} x2={60} y2={14} />
          <line x1={80} y1={0} x2={80} y2={8} />
          <line x1={100} y1={0} x2={100} y2={14} />
          <line x1={120} y1={0} x2={120} y2={8} />
          <line x1={140} y1={0} x2={140} y2={14} />
          <line x1={160} y1={0} x2={160} y2={8} />
          <line x1={180} y1={0} x2={180} y2={14} />
          <line x1={200} y1={0} x2={200} y2={8} />
        </g>
      </g>

      {/* Coffee mug top-down */}
      <g transform="translate(3000, 170)">
        <circle
          cx={80}
          cy={80}
          r={105}
          fill="var(--color-paper-tint)"
          stroke="var(--color-ink)"
          strokeWidth={3}
        />
        <circle
          cx={80}
          cy={80}
          r={75}
          fill="var(--color-paper-shade)"
          stroke="var(--color-ink)"
          strokeWidth={3}
        />
        <circle cx={80} cy={80} r={60} fill="#5a3a22" />
        <ellipse cx={65} cy={65} rx={25} ry={15} fill="#7a5a3a" opacity={0.5} />
        <path
          d="M 155 80 Q 195 80, 195 50 L 195 30"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={3}
        />
      </g>

      {/* Decorative ink splats — Riso spot colors */}
      <ellipse
        cx={850}
        cy={850}
        rx={35}
        ry={20}
        fill="var(--color-spot-rose)"
        opacity={0.6}
        transform="rotate(-15 850 850)"
      />
      <ellipse cx={1500} cy={200} rx={40} ry={25} fill="var(--color-spot-amber)" opacity={0.55} />
      <ellipse cx={2400} cy={850} rx={32} ry={18} fill="var(--color-spot-mint)" opacity={0.5} />
      <ellipse cx={3700} cy={280} rx={38} ry={22} fill="var(--color-spot-violet)" opacity={0.55} />
      <circle cx={900} cy={820} r={4} fill="var(--color-spot-rose)" opacity={0.7} />
      <circle cx={2440} cy={880} r={3} fill="var(--color-spot-mint)" opacity={0.7} />
      <circle cx={3650} cy={250} r={4} fill="var(--color-spot-violet)" opacity={0.7} />
    </svg>
  );
}
