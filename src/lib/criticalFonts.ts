/**
 * The two font files the first screen cannot render without: the
 * Instrument Serif italic of the hero H1 and Inter's variable Latin
 * subset for all body copy. The locale layout preloads them so the
 * browser fetches both alongside the CSS instead of discovering them
 * only after the stylesheet has been parsed.
 *
 * The URLs are NOT hand-written. Turbopack emits fonts under
 * content-hashed names (`/_next/static/media/<name>.<hash>.woff2`), and
 * a preload whose URL differs from the one in the @font-face rule is
 * worse than none: the browser downloads the font twice. Importing the
 * same package file as an `asset` module makes Turbopack resolve it to
 * the very URL the fontsource CSS `url()` gets (same source file, same
 * content hash), and it follows any fontsource upgrade automatically.
 * tests/e2e/font-preload.spec.ts asserts that each preload is actually
 * consumed by an @font-face rule.
 *
 * Only Latin: the four locales are de/en/fr/it. Accented glyphs that
 * fall into latin-ext still load lazily through unicode-range.
 */

import instrumentSerifItalicLatin from "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2" with {
  turbopackModuleType: "asset",
};
import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2" with {
  turbopackModuleType: "asset",
};

export const CRITICAL_FONT_URLS: readonly string[] = [instrumentSerifItalicLatin, interLatin];
