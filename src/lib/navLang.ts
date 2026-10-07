/**
 * Section labels in the nav are the English terms in every locale
 * ("Work", "About", ...), while the legal links stay localized. On the
 * de/fr/it pages those English labels need `lang="en"` so screen readers
 * switch pronunciation (WCAG 3.1.2) instead of reading "Work" as German.
 */
const ENGLISH_NAV_KEYS = new Set([
  "work",
  "about",
  "skills",
  "casestudy",
  "photography",
  "playground",
  "contact",
  "cv",
]);

export function navLabelLang(key: string, locale: string): "en" | undefined {
  return locale !== "en" && ENGLISH_NAV_KEYS.has(key) ? "en" : undefined;
}
