"use client";

import { useNightTheme } from "@/components/scene/useNightTheme";

/**
 * RasterStamp — shared night-aware <img> for the hand-designed PNG
 * object-grid icons (car, joggediballa, pingpong). Under Nachtdruck
 * it swaps to the `-dark` variant (paper-light line art recolored by
 * hand in Photoshop, accent colors preserved) — CSS filters can't
 * re-ink raster accents without corrupting them, so the swap is a
 * second asset, not a treatment.
 *
 * The three SVG stamps (camera, schnee, tauchen) don't use this —
 * they re-token via CSS variables like the rest of the UI.
 *
 * Plain <img> with 1x + 2x srcSet — no <picture>/AVIF/WebP wrap
 * (browsers don't reliably fall through 404s on a matching <source>,
 * and the light variants never got AVIF/WebP renditions).
 */
export function RasterStamp({
  slug,
  width,
  height,
  rotate,
}: {
  slug: string;
  width: number;
  height: number;
  rotate: string;
}) {
  const night = useNightTheme();
  const base = night ? `/about/objects/${slug}-dark` : `/about/objects/${slug}`;
  return (
    <img
      src={`${base}-120w.png`}
      srcSet={`${base}-120w.png 1x, ${base}-240w.png 2x`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      width={width}
      height={height}
      className="block h-16 w-auto max-w-[140px] object-contain"
      style={{ transform: `rotate(${rotate})` }}
    />
  );
}
