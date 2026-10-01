export type InkPreference = "auto" | "light" | "full";

export const INK_PREFERENCE_KEY = "manus-ink-mode";

/** A QA URL is temporary and takes precedence over a saved visitor choice. */
export function resolveInkPreference(query: string | null, stored: string | null): InkPreference {
  return parseInkPreference(query) ?? parseInkPreference(stored) ?? "auto";
}

export function parseInkPreference(value: string | null): InkPreference | null {
  return value === "auto" || value === "light" || value === "full" ? value : null;
}

/** Two independent windows are required by the controller before reducing effects. */
export function isSlowInkWindow(intervals: readonly number[]): boolean {
  if (intervals.length < 90) return false;
  return intervals.filter((ms) => ms > 25).length / intervals.length >= 0.2;
}
