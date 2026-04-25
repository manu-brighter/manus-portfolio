/**
 * Minimal char-splitter — plan §6.3 Overprint-Reveal uses duplicated DOM
 * chars (three layers: rose-ghost, mint-ghost, ink) rather than GSAP
 * SplitText, to keep the initial JS bundle under the §12 130kB-gz budget
 * (SplitText costs ~6–8kB gz and we already avoid ScrollTrigger for the
 * same reason).
 *
 * The splitter takes plain text and returns per-char records. Whitespace
 * is preserved as a flagged entry so OverprintReveal can render it as a
 * non-animating, non-breakable spacer (a literal `&nbsp;` so the three
 * layers line up vertically regardless of soft-wrap collapsing).
 *
 * Unicode note: we iterate via `Array.from` so surrogate pairs (emoji,
 * CJK extensions, combining marks in theory) stay grouped. The hero
 * strings are Latin-only so this is future-proofing, not a current need.
 */

export type CharRecord = {
  /** The char (or grapheme cluster) to render. */
  char: string;
  /** Sequential index across the full string (whitespace inclusive). */
  index: number;
  /** `true` for any character matching `/\s/` (space, tab, newline). */
  isWhitespace: boolean;
};

const WHITESPACE = /\s/;

export function splitChars(text: string): CharRecord[] {
  const graphemes = Array.from(text);
  return graphemes.map((char, index) => ({
    char,
    index,
    isWhitespace: WHITESPACE.test(char),
  }));
}
