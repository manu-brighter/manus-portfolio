"use client";

import dynamic from "next/dynamic";

/**
 * Client-component shim around AmbientRecorder. The recorder is a
 * dev-only `?record-bg=N` capture tool — it carries MediaRecorder
 * glue + UI scaffolding that nobody on prod needs, so we want it
 * tree-shaken from production bundles.
 *
 * Why this exists as its own file:
 *
 * Next 16 / Turbopack rejects `next/dynamic({ ssr: false })` inside
 * Server Components ([locale]/layout.tsx is one). `ssr: false` is
 * only valid in Client Components. This shim is the smallest Client
 * boundary that contains the dynamic call so the Server Component
 * tree above stays clean.
 *
 * Production bundle behavior: `process.env.NODE_ENV` is a build-time
 * constant; the `=== "production"` branch collapses to `null`, the
 * dynamic() call is unreachable, and Turbopack's tree-shaker drops
 * the AmbientRecorder chunk entirely. Dev bundle pays the lazy-chunk
 * cost (loaded on demand when the gate renders).
 */
const AmbientRecorder =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(
        () =>
          import("@/components/scene/AmbientRecorder").then((m) => ({
            default: m.AmbientRecorder,
          })),
        { ssr: false },
      );

export function AmbientRecorderDevGate() {
  return AmbientRecorder ? <AmbientRecorder /> : null;
}
