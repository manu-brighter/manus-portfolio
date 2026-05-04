/**
 * CoffeeRing — static elliptical ring stain, light brown. No animation.
 */
export function CoffeeRing({ className }: { className?: string }) {
  return (
    <svg
      width={80}
      height={56}
      viewBox="0 0 80 56"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: "rotate(8deg)" }}
    >
      <title>Coffee ring</title>
      <ellipse
        cx={40}
        cy={28}
        rx={32}
        ry={20}
        fill="none"
        stroke="#8b6f47"
        strokeWidth={2.5}
        opacity={0.32}
      />
      <ellipse
        cx={40}
        cy={28}
        rx={28}
        ry={17}
        fill="none"
        stroke="#8b6f47"
        strokeWidth={1}
        opacity={0.18}
      />
    </svg>
  );
}
