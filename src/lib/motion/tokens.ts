/**
 * Motion tokens — single source of truth for all animation timings.
 * Plan §4.4. Consumed by GSAP, Lenis, and the shared RAF ticker.
 *
 * Cubic-bezier tuples are GSAP-native `CustomEase` input (4 numbers).
 * Durations are seconds.
 */

export type CubicBezier = readonly [number, number, number, number];

export const ease = {
  standard: [0.25, 0.1, 0.25, 1] satisfies CubicBezier,
  decelerate: [0, 0, 0.2, 1] satisfies CubicBezier,
  accelerate: [0.4, 0, 1, 1] satisfies CubicBezier,
  /** Hero reveals, section entrances — overshoots into stillness. */
  expo: [0.16, 1, 0.3, 1] satisfies CubicBezier,
  /** Signature snap-in, Druck-Feel — the Riso misregistration lock. */
  riso: [0.7, 0, 0.2, 1] satisfies CubicBezier,
  /** Fluid-sim cursor reactions — soft lead, slight tail. */
  fluidDrag: [0.4, 0.1, 0.2, 0.9] satisfies CubicBezier,
} as const;

export const dur = {
  /** Hover, focus, tap — riso-print snappy feel. */
  micro: 0.14,
  short: 0.28,
  medium: 0.56,
  long: 1.1,
  /** Loader, hero one-time choreography. */
  epic: 2.2,
} as const;

export type EaseToken = keyof typeof ease;
export type DurToken = keyof typeof dur;

/** Convenience: convert a cubic-bezier tuple to the CSS `cubic-bezier(...)` string. */
export const cssEase = (token: EaseToken): string => {
  const [a, b, c, d] = ease[token];
  return `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
};
