"use client";

import { ExperimentChrome } from "../ExperimentChrome";

/**
 * Ink Drop Studio experiment (Sprint 1 stub).
 *
 * Real Sprint 2 deliverable: full Navier–Stokes sandbox with Leva
 * panel (velocity/dye dissipation, vorticity, pressure iters, splat
 * radius, ink color), plus Bomb / Freeze / Reset buttons. For now
 * this is a route-scaffold placeholder that lets the slug round-trip
 * end-to-end (build → static export → navigation).
 */
export function InkDropStudio() {
  return (
    <ExperimentChrome i18nKey="inkDropStudio">
      <div className="absolute inset-0 grid place-items-center">
        <p className="type-label-stamp text-ink-muted">[ Sprint 2 — sandbox in progress ]</p>
      </div>
    </ExperimentChrome>
  );
}
