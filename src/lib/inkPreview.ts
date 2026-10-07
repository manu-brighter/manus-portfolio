export type InkPreference = "light" | "full";

export const INK_PREFERENCE_KEY = "manus-ink-mode";

/** Animation is the default on every device. Simulation only runs after an
 * explicit visitor choice or a temporary QA link asks for it. */
export const DEFAULT_INK_PREFERENCE: InkPreference = "light";

/** Ignore compilation/reveal work and allow page assets to settle, with a
 * bounded wait so a stalled download cannot disable adaptation forever. */
export function createInkWarmup(startedAt: number, minimumMs = 6000) {
  let settledAt: number | null = null;
  return (now: number, pageSettled: boolean): boolean => {
    if (!pageSettled) settledAt = null;
    if (settledAt === null && pageSettled) settledAt = now;
    return (
      now - startedAt >= minimumMs &&
      ((settledAt !== null && now - settledAt >= 2000) || now - startedAt >= 15000)
    );
  };
}

/** A QA URL is temporary and takes precedence over a saved visitor choice.
 * Anything unrecognised, including the retired "auto" value, counts as no
 * preference and resolves to Animation. */
export function resolveInkPreference(query: string | null, stored: string | null): InkPreference {
  return parseInkPreference(query) ?? parseInkPreference(stored) ?? DEFAULT_INK_PREFERENCE;
}

export function parseInkPreference(value: string | null): InkPreference | null {
  return value === "light" || value === "full" ? value : null;
}

/** Two independent windows are required by the controller before reducing effects. */
export function isSlowInkWindow(intervals: readonly number[]): boolean {
  if (intervals.length < 90) return false;
  return intervals.filter((ms) => ms > 25).length / intervals.length >= 0.2;
}
