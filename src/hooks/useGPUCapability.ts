"use client";

import { useCallback, useRef, useState } from "react";
import {
  cacheTier,
  type GPUTier,
  getTierConfig,
  probeGPU,
  readCachedTier,
  type TierConfig,
  tierFromFrametime,
} from "@/lib/gpu";

type GPUCapability = {
  tier: GPUTier;
  config: TierConfig | null;
  renderer: string;
  measuring: boolean;
};

/**
 * Pick the initial capability state. Reads localStorage synchronously
 * during lazy init so subsequent visits (cache hit) start with the
 * correct tier — no mid-mount config swap, no FluidSim dispose/reinit
 * flash. Fresh visits start with the medium fallback and let the GL
 * probe correct it once the canvas mounts.
 */
function pickInitialCapability(): GPUCapability {
  if (typeof window !== "undefined") {
    const cached = readCachedTier();
    if (cached && cached !== "static") {
      return {
        tier: cached,
        config: getTierConfig(cached),
        renderer: "(cached)",
        measuring: false,
      };
    }
  }
  return {
    tier: "medium",
    config: getTierConfig("medium"),
    renderer: "",
    measuring: false,
  };
}

export function useGPUCapability() {
  const [capability, setCapability] = useState<GPUCapability>(pickInitialCapability);

  const frametimesRef = useRef<number[]>([]);
  // If we hydrated from cache, the adaptive auto-tuner has nothing to do.
  const adaptiveDoneRef = useRef(capability.renderer === "(cached)");

  const initProbe = useCallback((gl: WebGL2RenderingContext) => {
    const { tier, renderer, fromCache, matched } = probeGPU(gl);

    if (tier === "static") {
      setCapability({ tier: "static", config: null, renderer, measuring: false });
      return;
    }

    const config = getTierConfig(tier);
    // Confidence sources: localStorage cache OR a positive renderer-
    // string pattern match. Both bypass the 30-frame measurement so
    // the orchestrator doesn't dispose+reinit mid-session.
    const isConfident = fromCache || matched;

    setCapability({
      tier,
      config,
      renderer,
      measuring: !isConfident,
    });

    if (isConfident) {
      adaptiveDoneRef.current = true;
      // Persist matched-but-uncached tiers so the next visit lazy-inits
      // from cache directly (no probe, no swap, no flash).
      if (!fromCache) cacheTier(tier);
    }
  }, []);

  const recordFrametime = useCallback((ms: number) => {
    if (adaptiveDoneRef.current) return;

    frametimesRef.current.push(ms);

    if (frametimesRef.current.length >= 30) {
      adaptiveDoneRef.current = true;
      const sorted = [...frametimesRef.current].sort((a, b) => a - b);
      // biome-ignore lint/style/noNonNullAssertion: array has ≥30 elements at this point
      const median = sorted[Math.floor(sorted.length / 2)]!;
      const newTier = tierFromFrametime(median);
      const newConfig = getTierConfig(newTier);

      cacheTier(newTier);

      setCapability((prev) => ({
        ...prev,
        tier: newTier,
        config: newConfig,
        measuring: false,
      }));
    }
  }, []);

  return { capability, initProbe, recordFrametime };
}
