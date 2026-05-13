/**
 * Locally re-exported case-study primitives.
 *
 * The Diorama trades on a 4-station narrative (hook -> what + stack ->
 * highlights -> public). Each station has a small shape with the same
 * fields:
 *   - `Fact` / `StackRow` — table rows in the What / Stack cards
 *   - `Feature` — bullet items inside the highlight cards
 *   - `DateCaption` — datestamp + polaroidCaption pair shared by hook,
 *     admin-highlight, overlay-highlight
 *
 * Pulling them into one barrel-shape file means DioramaCards consumes
 * one import for all four shapes instead of 4 (was 28 individual
 * props). The underlying types come from the i18n-shapes inference
 * (the canonical source for translated content shapes).
 */

import type {
  CaseStudyFacts,
  CaseStudyHighlightFeature,
  CaseStudyHookStation,
  CaseStudyStack,
} from "@/types/i18n-shapes";

export type Fact = CaseStudyFacts[number];
export type StackRow = CaseStudyStack[number];
export type Feature = CaseStudyHighlightFeature;
export type DateCaption = CaseStudyHookStation;
