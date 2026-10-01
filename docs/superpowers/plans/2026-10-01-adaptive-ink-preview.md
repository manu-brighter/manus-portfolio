# Adaptive Ink Preview Implementation Plan

> Historical prototype plan. Superseded by the approved
> [production Ink Studio plan](2026-10-01-ink-studio-polish.md).
> Production Auto starts Light, explicit choices are persisted, and the
> query parameter remains a temporary QA override. Integration validation
> and release status are tracked in the production plan.

> Execution: implement in bounded steps with independent review. Do not publish the prototype before visual review.

**Goal:** Compare a continuously animated lightweight ink renderer with the existing full simulation on Manuel's actual laptop, with an honest manual override.

**Architecture:** Query-gated preview state in SceneProvider selects either the current renderer or LiteInkScene. A shared effectsReduced context value disables secondary GPU effects only in the light preview. A pure frame-window classifier supports automatic reduction and its tests.

**Tech Stack:** Existing Next, React, Zustand, GSAP shared ticker, WebGL2, Playwright. No dependencies or new browser storage.

**Execution result:** The three prototype implementation tasks below were completed for local comparison. That comparison led to the approved production Ink Studio work. Its integrated QA, review and release remain tracked separately in the production plan above.

## Global constraints

- Preserve content, themes, reduced motion and ordinary routes.
- Work on feat/adaptive-ink-preview in the existing separate checkout.
- English code/docs, localized visible UI in de/en/fr/it, no em dashes or attribution.
- Actual GPU evidence only from the visible browser whose renderer is recorded.

## 1. Baseline and browser contract

- [x] Run qa/measure-laptop.cjs against production; record hardware, idle/pointer/scroll samples.
- [x] Add tests/e2e/ink-preview.spec.ts before renderer changes. The default route must have no preview panel; `?ink-preview=light` must show light canvas; checking the full-simulation switch replaces it with the existing canvas; reduced motion mounts neither.
- [x] Run focused test against the unchanged local export and observe the missing preview fail.

## 2. Light renderer and controller

- [x] Add src/components/scene/LiteInkScene.tsx and src/shaders/ink-lite/render.frag.glsl. Component receives `onUnavailable: () => void` to report a failed renderer honestly; it owns a disposable context and subscribes to the existing ticker/preset store. Cap output to 900,000 pixels and at most native DPR1; skip hidden frames and limit effect updates to 60Hz.
- [x] Add src/lib/inkPreview.ts with InkPreference = auto | light | full and a pure frame-window classifier. A slow window requires >=90 samples and >=20% intervals above25ms. A single stall cannot meet the fraction; reset background/resize windows. Require two consecutive slow windows before automatic reduction.
- [x] Add a hook/controller with six-second warmup; manual preferences override automatic reduction. Reset clears windows and warmup. UI distinguishes measured reduction, manual light and automatic full.
- [x] Integrate only when a recognized ink-preview query is present. SceneContext gains effectsReduced:boolean, false by default.

## 3. Shared effect budget and review

- [x] Gate PhotoInkMask, InkCursor and InkWipeOverlay effects on effectsReduced; show original unmasked photos in light mode. Mini previews remain explicit interactions for this comparison and are documented as a remaining budget integration.
- [x] Run focused tests, typecheck, production build and lint on changed files. Test themes and mobile/reduced-motion paths. Independently review modifications.
- [x] Compare current full, existing minimal, and new light on the same viewport with sequential visible-browser workloads. Inspect screenshots, keep a local comparison URL available, and report measured limitations without claiming production completion.
