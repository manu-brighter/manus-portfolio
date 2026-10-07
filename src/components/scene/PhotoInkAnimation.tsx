"use client";

import { type CSSProperties, useEffect, useId, useMemo, useState } from "react";
import { getSimPreset } from "@/lib/content/simPresets";
import { SPOT_RGB, type SpotColor } from "@/lib/palette";
import { useSimPresetStore } from "@/lib/simPresetStore";
import styles from "./PhotoInkAnimation.module.css";

/**
 * Light-mode ("Animation") photo reveal: an ink bloom eats the paper
 * sheet off the photo. Pure SVG + CSS keyframes, so it stays inside the
 * Light contract: no canvas/context, no pointer listener, no observer,
 * no ticker. The parent gates motion/graphics availability and supplies
 * the one-shot trigger.
 *
 * Choreography (~2.9s total, every photo slightly different because the
 * layout is seeded by the photo index; the earlier single aperture was
 * nearly full-frame after ~120ms and read as a uniform pop):
 *   - A first drop lands off-centre and hesitates for ~0.6s while it
 *     wicks into the fibres.
 *   - Meanwhile two to four secondary drops land at seeded spots and
 *     settle into pools, and spatter droplets pop in around every
 *     landing (first act: several small events, not one shape).
 *   - Then the first drop lets go and blooms across the frame, sweeping
 *     the pools up (second act: one big, slow front).
 *   - Every front carries a wet rim and a faint halo in the active
 *     preset's ink, misregistered by a seeded px offset (the spot plate
 *     out of register), and the shapes rotate slowly while they grow,
 *     so the irregular lobes travel instead of just scaling.
 *   - The sheet fades the last remnants out.
 *
 * Cost: the masked group re-rasterizes while it runs (as the earlier
 * single-aperture version did); nothing touches layout. The overlay
 * unmounts on completion. Reduced motion never mounts it (parent gate)
 * and the module CSS hides it as a second line.
 */

/** Upper bound on spatter droplets per photo (perf, see the spatter loop). */
const MAX_SPATTER = 6;
const SPOT_SLOT = { mint: 0, amber: 1, rose: 2, violet: 3 } as const;

type Props = {
  spotColor: SpotColor;
  reveal: boolean;
  className?: string;
  onComplete?: () => void;
  /** Photo index — seeds the drop layout so no two photos match. */
  seed?: number;
  /** width / height of the covered photo; keeps drops round. */
  aspect?: number;
};

// Sheet fade: starts a beat before the last bloom ends.
const FADE_LEAD_S = 0.2;
const FADE_S = 0.42;
// Rim and halo extend the hole by these factors (wet band, wicked tint).
const RIM_SCALE = 1.06;
const HALO_SCALE = 1.17;

type Drop = {
  id: string;
  d: string;
  cx: number;
  cy: number;
  /** Final scale of the unit shape (viewBox units). */
  s: number;
  delay: number;
  dur: number;
  r0: number;
  r1: number;
  kind: "bloom" | "pool" | "spatter";
};

type Layout = { width: number; drops: Drop[]; end: number; misreg: [number, number] };

/** mulberry32 — tiny deterministic PRNG, plenty for a layout seed. */
function rng(seed: number): () => number {
  let a = (seed * 2654435761 + 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Irregular closed blob around the origin, unit-ish radius, smoothed
 * with Catmull-Rom → cubic Béziers. Returns the path and the smallest
 * radius ALONG the smoothed outline (sampled, not just the vertices),
 * so the primary bloom's final scale covers the frame exactly when it
 * ends instead of long before. */
function blobPath(rand: () => number, lumpy: number): { d: string; rMin: number } {
  const n = 9 + Math.floor(rand() * 4);
  const p2 = rand() * Math.PI * 2;
  const p3 = rand() * Math.PI * 2;
  const p5 = rand() * Math.PI * 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * (Math.PI / n) * 0.8;
    const r =
      1 +
      lumpy *
        (0.45 * Math.sin(2 * a + p2) +
          0.3 * Math.sin(3 * a + p3) +
          0.15 * Math.sin(5 * a + p5) +
          0.35 * (rand() - 0.5));
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const at = (i: number) => pts[(i + n) % n] as [number, number];
  let d = `M${round(at(0)[0])} ${round(at(0)[1])}`;
  let rMin = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(x2)} ${round(y2)}`;
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      const u = 1 - t;
      const bx = u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2;
      const by = u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2;
      rMin = Math.min(rMin, Math.hypot(bx, by));
    }
  }
  return { d: `${d}Z`, rMin };
}

function buildLayout(seed: number, aspect: number): Layout {
  const rand = rng(seed + 1);
  const width = 100 * Math.min(4, Math.max(0.4, aspect));
  const height = 100;
  const range = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const farthest = (x: number, y: number) =>
    Math.max(
      Math.hypot(x, y),
      Math.hypot(width - x, y),
      Math.hypot(x, height - y),
      Math.hypot(width - x, height - y),
    );

  const drops: Drop[] = [];
  const centres: [number, number, number][] = [];

  // Primary drop: off-centre, slowest, the only one that must cover.
  {
    const cx = width * range(0.36, 0.64);
    const cy = height * range(0.36, 0.62);
    const { d, rMin } = blobPath(rand, 0.26);
    const dur = range(2.55, 2.7);
    const r0 = range(-30, 30);
    drops.push({
      id: "p",
      d,
      cx,
      cy,
      // Sized so a TYPICAL lobe reaches the farthest corner right at
      // the end; only the narrowest lobe falls short, and that corner
      // sliver soaks away in the sheet fade. Sizing for the narrowest
      // lobe instead (farthest / rMin) finished the visible reveal at
      // ~60% of the run, because the wide lobes and the secondary pools
      // had long eaten every corner by then.
      s: farthest(cx, cy) / (0.5 * (rMin + 1)),
      delay: 0,
      dur,
      r0,
      r1: r0 + range(-38, 38),
      kind: "bloom",
    });
    centres.push([cx, cy, 0]);
  }

  // Secondary drops: land during the primary's hesitation and settle
  // into pools (decelerating, done by mid-run), so the first act is
  // several landings and the second act is the primary sweeping them up.
  const secondary = 2 + Math.floor(rand() * 2) + (width > 2.5 * height ? 1 : 0);
  for (let i = 0; i < secondary; i++) {
    let cx = 0;
    let cy = 0;
    // Keep them apart so the fronts meet instead of stacking.
    for (let tries = 0; tries < 8; tries++) {
      cx = width * range(0.1, 0.9);
      cy = height * range(0.14, 0.86);
      if (centres.every(([x, y]) => Math.hypot((x - cx) / width, (y - cy) / height) > 0.3)) break;
    }
    const { d } = blobPath(rand, 0.38);
    const delay = 0.22 + i * range(0.26, 0.36) + range(0, 0.15);
    const dur = range(1.05, 1.35);
    const r0 = range(-40, 40);
    drops.push({
      id: `s${i}`,
      d,
      cx,
      cy,
      // Pools, not floods: they meet the primary front, never beat it.
      s: Math.sqrt(width * height) * range(0.24, 0.38),
      delay,
      dur,
      r0,
      r1: r0 + range(-55, 55),
      kind: "pool",
    });
    centres.push([cx, cy, delay]);
  }

  // Spatter: small droplets thrown around each landing, capped so the
  // masked layer stays cheap to re-rasterize (it repaints every frame).
  let spatterLeft = MAX_SPATTER;
  for (const [i, [px, py, pDelay]] of centres.entries()) {
    const count = Math.min(spatterLeft, 1 + Math.floor(rand() * 2));
    spatterLeft -= count;
    for (let j = 0; j < count; j++) {
      const a = rand() * Math.PI * 2;
      const dist = height * range(0.12, 0.3);
      const { d } = blobPath(rand, 0.25);
      drops.push({
        id: `d${i}-${j}`,
        d,
        cx: px + Math.cos(a) * dist * (width > height ? 1.3 : 1),
        cy: py + Math.sin(a) * dist,
        s: range(1.3, 3.2),
        delay: pDelay + range(0.12, 0.5),
        dur: range(1.2, 1.6),
        r0: 0,
        r1: range(-30, 30),
        kind: "spatter",
      });
    }
  }

  const end = drops.reduce((m, drop) => Math.max(m, drop.delay + drop.dur), 0);
  const misreg: [number, number] = [range(0.6, 1.3) * (rand() < 0.5 ? -1 : 1), range(0.5, 1.1)];
  return { width, drops, end, misreg };
}

function dropStyle(drop: Drop, mult: number): CSSProperties {
  return {
    "--s": drop.s,
    "--m": mult,
    "--r0": `${drop.r0}deg`,
    "--r1": `${drop.r1}deg`,
    "--delay": `${drop.delay}s`,
    "--dur": `${drop.dur}s`,
  } as CSSProperties;
}

export function PhotoInkAnimation({
  spotColor,
  className,
  reveal,
  onComplete,
  seed = 0,
  aspect = 1.5,
}: Props) {
  const maskId = useId();
  const presetId = useSimPresetStore((state) => state.presetId);
  const [settled, setSettled] = useState(false);
  const layout = useMemo(() => buildLayout(seed, aspect), [seed, aspect]);
  useEffect(() => {
    if (settled) onComplete?.();
  }, [settled, onComplete]);
  const ink = getSimPreset(presetId).visuals.ladder?.[SPOT_SLOT[spotColor]] ?? SPOT_RGB[spotColor];
  const inkColor = `rgb(${ink.map((channel) => Math.round(channel * 255)).join(" ")})`;
  const totalS = layout.end - FADE_LEAD_S + FADE_S;

  useEffect(() => {
    if (!reveal || settled) return;
    // Release even when a background tab or user stylesheet suppresses events.
    const timer = window.setTimeout(() => setSettled(true), (totalS + 0.6) * 1000);
    return () => window.clearTimeout(timer);
  }, [reveal, settled, totalS]);

  if (settled) return null;
  const { width, drops, misreg } = layout;
  // Halo only ahead of the main bloom: pools are small enough that their
  // rim carries the edge, and every extra masked shape costs a repaint.
  const fronts = drops.filter((drop) => drop.kind === "bloom");
  const dropClass = (drop: Drop) => styles[drop.kind];
  return (
    <div
      aria-hidden="true"
      data-testid="photo-ink-animation"
      data-revealing={reveal}
      className={`${styles.overlay} ${reveal ? styles.running : ""} ${className ?? ""}`}
      style={
        {
          "--fade-delay": `${layout.end - FADE_LEAD_S}s`,
          "--fade-dur": `${FADE_S}s`,
        } as CSSProperties
      }
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setSettled(true);
      }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        className={styles.sheet}
      >
        <defs>
          {drops.map((drop) => (
            <path key={drop.id} id={`${maskId}-${drop.id}`} d={drop.d} />
          ))}
          <mask
            id={maskId}
            x="-10"
            y="-10"
            width={width + 20}
            height="120"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
          >
            <rect x="-10" y="-10" width={width + 20} height="120" fill="white" />
            <g fill="black">
              {drops.map((drop) => (
                <g key={drop.id} transform={`translate(${round(drop.cx)} ${round(drop.cy)})`}>
                  <use
                    href={`#${maskId}-${drop.id}`}
                    className={dropClass(drop)}
                    style={dropStyle(drop, 1)}
                  />
                </g>
              ))}
            </g>
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <rect
            x="-10"
            y="-10"
            width={width + 20}
            height="120"
            style={{ fill: "var(--color-paper)" }}
          />
          {/* Wicked tint ahead of each bloom front, then the wet rim.
              Both sit a seeded offset out of register with the hole —
              the spot plate landing slightly off the key plate. */}
          <g
            transform={`translate(${round(misreg[0])} ${round(misreg[1])})`}
            style={{ fill: inkColor }}
          >
            {/* fill-opacity, not group opacity: group opacity forces an
                offscreen layer per frame; overlapping fronts simply
                overprint a little darker, which suits the print look. */}
            <g fillOpacity={0.2}>
              {fronts.map((drop) => (
                <g key={drop.id} transform={`translate(${round(drop.cx)} ${round(drop.cy)})`}>
                  <use
                    href={`#${maskId}-${drop.id}`}
                    className={dropClass(drop)}
                    style={dropStyle(drop, HALO_SCALE)}
                  />
                </g>
              ))}
            </g>
            <g fillOpacity={0.55}>
              {drops.map((drop) => (
                <g key={drop.id} transform={`translate(${round(drop.cx)} ${round(drop.cy)})`}>
                  <use
                    href={`#${maskId}-${drop.id}`}
                    className={dropClass(drop)}
                    style={dropStyle(drop, drop.kind === "spatter" ? 1.35 : RIM_SCALE)}
                  />
                </g>
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
