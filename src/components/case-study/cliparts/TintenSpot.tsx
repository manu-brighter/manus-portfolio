"use client";

/**
 * TintenSpot — inkblot, gentle opacity pulse 0.6→0.9→0.6 in 4s loop via CSS keyframes.
 *
 * The `@keyframes ink-spot-pulse` animation is defined in globals.css (Task 16).
 */
export function TintenSpot({
  className,
  spot = "rose",
}: {
  className?: string;
  spot?: "rose" | "amber" | "mint" | "violet";
}) {
  return (
    <svg
      width={48}
      height={48}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ animation: "ink-spot-pulse 4s ease-in-out infinite" }}
    >
      <title>Ink spot</title>
      <ellipse cx={24} cy={24} rx={18} ry={14} fill={`var(--color-spot-${spot})`} opacity="0.55" />
      <ellipse cx={28} cy={20} rx={6} ry={4} fill={`var(--color-spot-${spot})`} opacity="0.85" />
      <circle cx={36} cy={32} r={3} fill={`var(--color-spot-${spot})`} opacity="0.5" />
    </svg>
  );
}
