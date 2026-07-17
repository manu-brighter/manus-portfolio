/**
 * Off-the-screen tile-reveal manifest — mirrors which masters exist in
 * `content-input/about/tiles/` and what `scripts/optimize-assets.mjs`
 * (group `about-tiles`) emits from them.
 *
 * Manuel provides BOTH crops per tile ({key}-landscape.jpg +
 * {key}-portrait.jpg); the pipeline only scales. To bring a new tile
 * online: drop the two masters, run the pipeline, add the key to
 * TILE_REVEAL_KEYS, and give the tile a `reveal` entry (alt + caption)
 * in all four locale catalogs. Tiles without an entry here stay
 * decorative figures.
 */

export type StampKey = "camera" | "audi" | "joggediballa" | "schnee" | "tauchen" | "pingpong";

export type TileOrientation = "landscape" | "portrait";

/** Tiles with generated reveal assets. pingpong has no master yet. */
export const TILE_REVEAL_KEYS = ["camera", "audi", "joggediballa", "schnee", "tauchen"] as const;

export type RevealTileKey = (typeof TILE_REVEAL_KEYS)[number];

const DEFAULT_WIDTHS: Record<TileOrientation, readonly number[]> = {
  landscape: [800, 1200, 1600],
  portrait: [540, 810, 1080],
};

/** tauchen's portrait master is a 648px video still — the pipeline
 *  caps its widths so the srcset never advertises upscales. */
const WIDTH_OVERRIDES: Partial<
  Record<RevealTileKey, Partial<Record<TileOrientation, readonly number[]>>>
> = {
  tauchen: { portrait: [540] },
};

const JPG_FALLBACK: Record<TileOrientation, number> = { landscape: 1200, portrait: 540 };

export function hasTileReveal(key: StampKey): key is RevealTileKey {
  return (TILE_REVEAL_KEYS as readonly string[]).includes(key);
}

function widthsFor(key: RevealTileKey, orientation: TileOrientation): readonly number[] {
  return WIDTH_OVERRIDES[key]?.[orientation] ?? DEFAULT_WIDTHS[orientation];
}

export function tileRevealSrcSet(
  key: RevealTileKey,
  orientation: TileOrientation,
  ext: "avif" | "webp",
): string {
  return widthsFor(key, orientation)
    .map((w) => `/about/tiles/${key}-${orientation}-${w}w.${ext} ${w}w`)
    .join(", ");
}

export function tileRevealJpg(key: RevealTileKey, orientation: TileOrientation): string {
  return `/about/tiles/${key}-${orientation}-${JPG_FALLBACK[orientation]}w.jpg`;
}
