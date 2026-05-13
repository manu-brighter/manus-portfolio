/**
 * Riso-Plate-Corner-Marks — 4 small `+` registration crosses at the
 * corners of a section or block. References print-shop plate-
 * registration markers (the kind printers use to align colour
 * separations on real Risograph plates).
 *
 * Parent must have `position: relative` (or use the `.plate-corners`
 * helper class). The marks are absolutely positioned to the parent's
 * 4 corners with a 6px outset so they sit just outside the visible
 * frame on desktop. On mobile the outset is dropped (marks sit at
 * the edge instead of poking past it) — sections like About don't
 * have a max-width on small viewports, so a -6px outset on the right
 * mark would extend past the viewport edge and create a horizontal
 * scroll gutter that html's `overflow-x: clip` doesn't always catch
 * reliably on mobile Safari.
 *
 * Decorative — `aria-hidden`. Pure SVG, no JS, no animation.
 */

const SIZE = 12;
const STROKE = 1.5;

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
        className="pointer-events-none absolute top-0 left-0 md:-top-[6px] md:-left-[6px]"
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 md:-top-[6px] md:-right-[6px]"
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 md:-bottom-[6px] md:-left-[6px]"
      >
        <Cross />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 md:-bottom-[6px] md:-right-[6px]"
      >
        <Cross />
      </span>
    </>
  );
}
