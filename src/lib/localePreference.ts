import type { Locale } from "@/i18n/routing";

/**
 * Remembered locale choice.
 *
 * The bare root (`src/app/page.tsx`) sniffs `navigator.languages` to
 * pick a locale, because `output: 'export'` rules out an Accept-
 * Language middleware redirect. That sniff is the right answer for a
 * first visit and the wrong one for every visit after an explicit
 * switch: a German browser that chose EN got thrown back to DE on the
 * next `/` hit, forever. Storing the choice lets the bootstrap prefer
 * it over the browser language.
 *
 * Only an EXPLICIT switch writes here (the Nav locale switcher).
 * Landing on `/en/` via a shared link is not a preference — the URL
 * already wins on its own, and treating it as a choice would let one
 * shared link silently re-language the whole site for the visitor.
 *
 * Key naming mirrors the other client-side stores (`manus-gpu-tier`,
 * `manus-sim-preset`). Read side lives in the inline bootstrap script,
 * which imports this constant so there is one source of truth.
 */
export const LOCALE_STORAGE_KEY = "manus-locale";

export function rememberLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage disabled (private mode, blocked site data). Detection
    // falls back to the browser-language sniff, i.e. the old behaviour.
  }
}
