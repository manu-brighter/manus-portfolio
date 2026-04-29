"use client";

import dynamic from "next/dynamic";
import type { ExperimentSlug } from "@/lib/content/playground";

/**
 * Client-side experiment switchboard.
 *
 * Each experiment is dynamic-imported with `ssr: false` so:
 *   1. The experiment's WebGL setup never runs in the SSG pass
 *      (avoids `getContext('webgl2')` on a non-existent canvas).
 *   2. The Leva panel + sim shaders only ship in their route's
 *      chunk — initial bundle stays unaffected.
 *
 * Loading-state is intentionally minimal — paper bg + a centred
 * mono label. The experiments themselves take the screen on hydrate.
 */

const InkDropStudio = dynamic(
  () => import("./experiments/InkDropStudio").then((m) => m.InkDropStudio),
  {
    ssr: false,
    loading: () => <ExperimentLoading label="Booting Ink Drop Studio…" />,
  },
);

const TypeAsFluid = dynamic(() => import("./experiments/TypeAsFluid").then((m) => m.TypeAsFluid), {
  ssr: false,
  loading: () => <ExperimentLoading label="Booting Type-as-Fluid…" />,
});

function ExperimentLoading({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-paper">
      <p className="type-label-stamp text-ink">{label}</p>
    </div>
  );
}

export function ExperimentRouter({ slug }: { slug: ExperimentSlug }) {
  switch (slug) {
    case "ink-drop-studio":
      return <InkDropStudio />;
    case "type-as-fluid":
      return <TypeAsFluid />;
  }
}
