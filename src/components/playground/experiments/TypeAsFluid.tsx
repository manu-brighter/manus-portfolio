"use client";

import { ExperimentChrome } from "../ExperimentChrome";

/**
 * Type-as-Fluid experiment (Sprint 1 stub).
 *
 * Real Sprint 3 deliverable: text rasterizer (Canvas2D → 8-bit alpha
 * → JFA-driven SDF compute pass on GPU) injecting density into the
 * fluid solver as the user types, with default-word rotation when
 * idle. For now this is a route-scaffold placeholder.
 */
export function TypeAsFluid() {
  return (
    <ExperimentChrome i18nKey="typeAsFluid">
      <div className="absolute inset-0 grid place-items-center">
        <p className="type-label-stamp text-ink-muted">[ Sprint 3 — rasterizer in progress ]</p>
      </div>
    </ExperimentChrome>
  );
}
