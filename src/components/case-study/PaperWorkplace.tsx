/**
 * PaperWorkplace — full-bleed editorial detail-layer behind the Case Study stations.
 *
 * Renders one large absolutely-positioned SVG with scribble-pen lines, datum-stamps,
 * inkblots, and scratch-marks. The stations + cliparts overlay this layer.
 *
 * The SVG scrolls horizontally with the stations as a single continuous "table".
 * Width is intentionally large (4× viewport ≈ 6000px) to span all 6 stations; the
 * parent StationContainer translates this layer with the rest of the horizontal track.
 */

const SCRIBBLE_PATHS = [
  "M 50 200 Q 200 180, 400 220 T 800 200 Q 1000 240, 1200 200",
  "M 1500 600 Q 1700 580, 1900 620 T 2400 600",
  "M 3000 400 Q 3200 380, 3400 420 T 3800 400",
  "M 4500 700 Q 4700 680, 4900 720 T 5400 700",
];

const DATESTAMPS = [
  { x: 800, y: 100, text: "2024.06" },
  { x: 2400, y: 750, text: "2024.11" },
  { x: 3700, y: 200, text: "2025.03" },
  { x: 5200, y: 850, text: "2025.10" },
];

const INKBLOTS = [
  { cx: 1100, cy: 850, rx: 60, ry: 40, color: "rose" },
  { cx: 2700, cy: 200, rx: 80, ry: 50, color: "amber" },
  { cx: 4100, cy: 750, rx: 70, ry: 45, color: "mint" },
  { cx: 5400, cy: 350, rx: 75, ry: 48, color: "violet" },
];

const SCRATCHES = [
  { x1: 200, y1: 600, x2: 220, y2: 580 },
  { x1: 220, y1: 590, x2: 240, y2: 570 },
  { x1: 1900, y1: 300, x2: 1925, y2: 285 },
  { x1: 1920, y1: 295, x2: 1945, y2: 280 },
  { x1: 4400, y1: 500, x2: 4420, y2: 480 },
];

export function PaperWorkplace() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 6000 1000"
      preserveAspectRatio="none"
    >
      <title>Paper workplace texture</title>
      {SCRIBBLE_PATHS.map((d) => (
        <path
          key={d.slice(0, 16)}
          d={d}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.18}
        />
      ))}
      {DATESTAMPS.map((s) => (
        <text
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          fontFamily="monospace"
          fontSize={18}
          letterSpacing="0.2em"
          fill="var(--color-spot-amber)"
          opacity={0.4}
        >
          {s.text}
        </text>
      ))}
      {INKBLOTS.map((b) => (
        <ellipse
          key={`${b.cx}-${b.cy}`}
          cx={b.cx}
          cy={b.cy}
          rx={b.rx}
          ry={b.ry}
          fill={`var(--color-spot-${b.color})`}
          opacity={0.18}
          style={{ filter: "blur(8px)" }}
        />
      ))}
      {SCRATCHES.map((s) => (
        <line
          key={`${s.x1}-${s.y1}`}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="var(--color-ink)"
          strokeWidth={0.8}
          opacity={0.25}
        />
      ))}
    </svg>
  );
}
