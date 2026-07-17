// src/types/i18n-shapes.ts
//
// Typed re-exports of the inferred message-tree shapes from the DE
// locale (source-of-truth language).
//
// next-intl's `t.raw(key)` returns `unknown` — so every consumer of a
// structured message (an array, an object) has to cast at the boundary.
// Inventing local types at each cast site is what we used to do, and it
// drifted from the actual JSON whenever a new field was added.
//
// Post-SF-5: messages now live in per-route-segment files under
// `messages/{locale}/<group>.json`. We import each segment directly so
// each shape's provenance is explicit — the home-page shapes import
// from `home.json`, legal from `legal.json`, etc.
//
// Drift between de.json and en/fr/it is a separate concern not solved
// here — that's the "translation parity" sprint. This module only
// fixes the type-vs-source drift at the i18n boundary.

import type deCommon from "../../messages/de/common.json";
import type deHome from "../../messages/de/home.json";
import type deLegal from "../../messages/de/legal.json";

// --- meta -----------------------------------------------------------

export type MetaKeywords = (typeof deCommon)["meta"]["keywords"];

// --- about ----------------------------------------------------------

export type AboutParts = (typeof deHome)["about"]["parts"];
export type AboutAnfangenStamps = (typeof deHome)["about"]["marginalia"]["anfangen"]["stamps"];

// --- currently ------------------------------------------------------

export type CurrentlyItems = (typeof deHome)["currently"]["items"];

// --- skills ---------------------------------------------------------

export type SkillsTiers = (typeof deHome)["skills"]["tiers"];

// --- work -----------------------------------------------------------

export type WorkProjects = (typeof deHome)["work"]["projects"];
export type WorkSideProjects = (typeof deHome)["work"]["sideProjects"]["items"];

// --- caseStudy ------------------------------------------------------

export type CaseStudyFacts = (typeof deHome)["caseStudy"]["context"]["facts"];
export type CaseStudyStory = (typeof deHome)["caseStudy"]["context"]["story"];
export type CaseStudyStack = (typeof deHome)["caseStudy"]["platform"]["stack"];
export type CaseStudyHighlights = (typeof deHome)["caseStudy"]["highlights"]["items"];
export type CaseStudyHookStation = (typeof deHome)["caseStudy"]["stations"]["hook"];
export type CaseStudyStackStation = (typeof deHome)["caseStudy"]["stations"]["stack"];
export type CaseStudyHighlightAdmin = (typeof deHome)["caseStudy"]["stations"]["highlightAdmin"];
export type CaseStudyHighlightOverlay =
  (typeof deHome)["caseStudy"]["stations"]["highlightOverlay"];
export type CaseStudyPublicShots = (typeof deHome)["caseStudy"]["stations"]["publicShots"];

// Per-item helpers — `Highlight` is used in CaseStudy.tsx for `.find()`
// lookups; element types are projected from the array shape.
export type CaseStudyHighlight = CaseStudyHighlights[number];
export type CaseStudyHighlightFeature = CaseStudyHighlight["features"][number];

// --- legal ----------------------------------------------------------

// Impressum + Datenschutz share the same `sections` shape; either works
// for the `LegalDocument` cast since the renderer is namespace-agnostic.
export type LegalSections = (typeof deLegal)["legal"]["impressum"]["sections"];
