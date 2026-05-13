/**
 * Riso spot-color palette — single source of truth.
 *
 * Mirrors the four `--color-spot-*` design tokens declared in
 * `src/app/globals.css` `@theme`. Values are duplicated here in
 * runtime-friendly forms (normalised RGB tuples for WebGL uniforms,
 * hex literals for GSAP, CSS-var strings for inline styles, Tailwind
 * class names) so consumers can pick whichever encoding fits their
 * call site without re-defining the palette inline.
 *
 * Adding a new spot, or changing the colour of an existing slot, is a
 * three-file change: update `globals.css`, update `SPOT_RGB` + `SPOT_HEX`
 * here, and re-run `node scripts/generate-favicons.mjs` if the favicon
 * accent shifts.
 */

export type SpotColor = "rose" | "amber" | "mint" | "violet";

export const SPOT_COLORS: readonly SpotColor[] = ["rose", "amber", "mint", "violet"];

/**
 * Normalised RGB tuples (0..1 per channel) — suitable for `gl.uniform3f`
 * and the splat colour parameter accepted by `FluidOrchestrator` /
 * `PhotoInkMask` / `InkWipeOverlay`.
 *
 * Must stay in lock-step with the `@theme --color-spot-*` values in
 * `src/app/globals.css` (canonical hex → RGB conversion):
 *   rose   `#ff6ba0`  = (255, 107, 160) / 255
 *   amber  `#ffc474`  = (255, 196, 116) / 255
 *   mint   `#7ce8c4`  = (124, 232, 196) / 255
 *   violet `#b89aff`  = (184, 154, 255) / 255
 */
export const SPOT_RGB: Record<SpotColor, readonly [number, number, number]> = {
  rose: [1.0, 0.42, 0.627],
  amber: [1.0, 0.769, 0.455],
  mint: [0.486, 0.91, 0.769],
  violet: [0.722, 0.604, 1.0],
};

/** Paper backdrop colour (`--color-paper` ≙ `#f0e8dc`). */
export const PAPER_COLOR: readonly [number, number, number] = [0.941, 0.91, 0.863];

/** Ink colour (`--color-ink` ≙ `#0a0608`). */
export const INK_COLOR: readonly [number, number, number] = [0.039, 0.024, 0.031];

/**
 * CSS custom-property references — for inline `style` props and CSS
 * variable composition (e.g. `--block-spot: var(--color-spot-rose)`).
 */
export const SPOT_CSS_VAR: Record<SpotColor, string> = {
  rose: "var(--color-spot-rose)",
  amber: "var(--color-spot-amber)",
  mint: "var(--color-spot-mint)",
  violet: "var(--color-spot-violet)",
};

/**
 * Static Tailwind class map for spot-background utilities.
 *
 * Tailwind v4 JIT scans literal class strings; dynamic interpolations
 * like `` `bg-spot-${slot}` `` are purged. Always look up via this map
 * (project-wide rule documented in `.claude/CLAUDE.md`).
 */
export const SPOT_BG_CLASS: Record<SpotColor, string> = {
  rose: "bg-spot-rose",
  amber: "bg-spot-amber",
  mint: "bg-spot-mint",
  violet: "bg-spot-violet",
};

/**
 * Hex literals — for consumers that can't read CSS variables at runtime
 * (GSAP `backgroundColor` tweens, Leva accent inputs, OG image renderers).
 * Kept in sync with `SPOT_RGB` by construction; if you change one,
 * change the other.
 */
export const SPOT_HEX: Record<SpotColor, string> = {
  rose: "#ff6ba0",
  amber: "#ffc474",
  mint: "#7ce8c4",
  violet: "#b89aff",
};

/** Uniform-random spot pick. Used by the playground mini-sims and the
 *  Type-as-Fluid stamp pipeline. */
export function randomSpot(): SpotColor {
  // SPOT_COLORS has exactly 4 entries, index 0..3 always defined.
  const idx = Math.floor(Math.random() * SPOT_COLORS.length);
  return SPOT_COLORS[idx] as SpotColor;
}
