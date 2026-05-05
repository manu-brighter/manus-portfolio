/**
 * InkSplat — small static SVG ink-splash decoration. Used as scattered
 * accents inside stations and between-stations on the case-study track.
 *
 * Pure SVG, no animation (apart from the parent's track translate during
 * horizontal scroll). The splat shape is hand-drawn-irregular: a main
 * blob with 2-3 detached droplet specks for "wet ink dropped on paper"
 * feel.
 */

type Spot = "rose" | "amber" | "mint" | "violet" | "ink";

const SPOT_VAR: Record<Spot, string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
  ink: "var(--color-ink)",
};

type Props = {
  spot?: Spot;
  /** SVG width in px. Default 60. */
  size?: number;
  /** Rotation in degrees for the whole splat. Default random-ish via
   *  per-call value (caller picks). */
  rotate?: number;
  /** Decorative opacity. Default 0.55. */
  opacity?: number;
  className?: string;
};

export function InkSplat({
  spot = "ink",
  size = 60,
  rotate = 0,
  opacity = 0.55,
  className,
}: Props) {
  const fill = SPOT_VAR[spot];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, opacity }}
    >
      <title>Ink splat</title>
      {/* Main blob — irregular ellipse with bumps */}
      <path
        d="M 18 22 Q 12 14, 24 12 Q 38 8, 42 18 Q 50 24, 44 34 Q 40 44, 28 42 Q 16 44, 16 32 Q 12 26, 18 22 Z"
        fill={fill}
      />
      {/* Detached droplet 1 — top-right */}
      <circle cx={50} cy={14} r={2.5} fill={fill} />
      {/* Detached droplet 2 — bottom-left */}
      <circle cx={10} cy={48} r={3.5} fill={fill} />
      {/* Detached droplet 3 — small speck */}
      <circle cx={52} cy={42} r={1.5} fill={fill} />
    </svg>
  );
}
