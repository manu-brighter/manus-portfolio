export type InkPreference = "auto" | "light" | "full";

export const INK_PREFERENCE_KEY = "manus-ink-mode";

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

/** A QA URL is temporary and takes precedence over a saved visitor choice. */
export function resolveInkPreference(
  query: string | null,
  stored: string | null,
  defaultPreference: InkPreference = "auto",
): InkPreference {
  return parseInkPreference(query) ?? parseInkPreference(stored) ?? defaultPreference;
}

export function parseInkPreference(value: string | null): InkPreference | null {
  return value === "auto" || value === "light" || value === "full" ? value : null;
}

/** Two independent windows are required by the controller before reducing effects. */
export function isSlowInkWindow(intervals: readonly number[]): boolean {
  if (intervals.length < 90) return false;
  return intervals.filter((ms) => ms > 25).length / intervals.length >= 0.2;
}
