/**
 * Riso-Plate-Corner-Marks — 4 small `+` registration crosses at the
 * corners of a section or block. References print-shop plate-
 * registration markers (the kind printers use to align colour
 * separations on real Risograph plates).
 *
 * Parent must have `position: relative` (or use the `.plate-corners`
 * helper class). The marks are absolutely positioned to the parent's
 * 4 corners with a 12px outset so they sit just outside the visible
 * frame.
 *
 * Decorative — `aria-hidden`. Pure SVG, no JS, no animation.
 */

const SIZE = 12;
const STROKE = 1.5;
const OUTSET = 6; // half the size, places the centre at the corner

function Cross() {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      focusable="false"
    >
      <title>Registration mark</title>
      <line
        x1={0}
        y1={SIZE / 2}
        x2={SIZE}
        y2={SIZE / 2}
        stroke="var(--color-ink)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <line
        x1={SIZE / 2}
        y1={0}
        x2={SIZE / 2}
        y2={SIZE}
        stroke="var(--color-ink)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlateCornerMarks() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ top: -OUTSET, left: -OUTSET }}
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ top: -OUTSET, right: -OUTSET }}
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ bottom: -OUTSET, left: -OUTSET }}
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ bottom: -OUTSET, right: -OUTSET }}
      >
        <Cross />
      </span>
    </>
  );
}
