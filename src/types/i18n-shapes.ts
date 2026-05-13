// src/types/i18n-shapes.ts
//
// Typed re-exports of the inferred message-tree shapes from de.json.
//
// next-intl's `t.raw(key)` returns `unknown` — so every consumer of a
// structured message (an array, an object) has to cast at the boundary.
// Inventing local types at each cast site is what we used to do, and it
// drifted from the actual JSON whenever a new field was added.
//
// This module imports `messages/de.json` once (TS already does this for
// the IntlMessages declaration in `i18n.d.ts`) and re-exports the
// inferred shapes as named types. Cast sites now use these directly:
//   const parts = t.raw("parts") as AboutParts;
//
// Drift between de.json and en/fr/it/it is a separate concern not
// solved here — that's the "translation parity" sprint. This module
// only fixes the type-vs-source drift at the i18n boundary.

import type messages from "../../messages/de.json";

type Messages = typeof messages;

// --- meta -----------------------------------------------------------

export type MetaKeywords = Messages["meta"]["keywords"];

// --- about ----------------------------------------------------------

export type AboutParts = Messages["about"]["parts"];
export type AboutAnfangenStamps = Messages["about"]["marginalia"]["anfangen"]["stamps"];

// --- currently ------------------------------------------------------

export type CurrentlyItems = Messages["currently"]["items"];

// --- skills ---------------------------------------------------------

export type SkillsTiers = Messages["skills"]["tiers"];

// --- work -----------------------------------------------------------

export type WorkProjects = Messages["work"]["projects"];

// --- caseStudy ------------------------------------------------------

export type CaseStudyFacts = Messages["caseStudy"]["context"]["facts"];
export type CaseStudyStory = Messages["caseStudy"]["context"]["story"];
export type CaseStudyStack = Messages["caseStudy"]["platform"]["stack"];
export type CaseStudyHighlights = Messages["caseStudy"]["highlights"]["items"];
export type CaseStudyHookStation = Messages["caseStudy"]["stations"]["hook"];
export type CaseStudyStackStation = Messages["caseStudy"]["stations"]["stack"];
export type CaseStudyHighlightAdmin = Messages["caseStudy"]["stations"]["highlightAdmin"];
export type CaseStudyHighlightOverlay = Messages["caseStudy"]["stations"]["highlightOverlay"];
export type CaseStudyPublicShots = Messages["caseStudy"]["stations"]["publicShots"];

// Per-item helpers — `Highlight` is used in CaseStudy.tsx for `.find()`
// lookups; element types are projected from the array shape.
export type CaseStudyHighlight = CaseStudyHighlights[number];
export type CaseStudyHighlightFeature = CaseStudyHighlight["features"][number];

// --- legal ----------------------------------------------------------

// Impressum + Datenschutz share the same `sections` shape; either works
// for the `LegalDocument` cast since the renderer is namespace-agnostic.
export type LegalSections = Messages["legal"]["impressum"]["sections"];
