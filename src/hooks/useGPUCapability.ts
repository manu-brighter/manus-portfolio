"use client";

import { useCallback, useRef, useState } from "react";
import { type GPUTier, type TierConfig, cacheTier, getTierConfig, probeGPU, tierFromFrametime } from "@/lib/gpu";

type GPUCapability = {
  tier: GPUTier;
  config: TierConfig | null;
  renderer: string;
  measuring: boolean;
};

export function useGPUCapability() {
  const [capability, setCapability] = useState<GPUCapability>({
    tier: "medium",
    config: getTierConfig("medium"),
    renderer: "",
    measuring: false,
  });

  const frametimesRef = useRef<number[]>([]);
  const adaptiveDoneRef = useRef(false);

  const initProbe = useCallback((gl: WebGL2RenderingContext) => {
    const { tier, renderer, fromCache } = probeGPU(gl);

    if (tier === "static") {
      setCapability({ tier: "static", config: null, renderer, measuring: false });
      return;
    }

    const config = getTierConfig(tier);

    setCapability({
      tier,
      config,
      renderer,
      measuring: !fromCache,
    });

    if (fromCache) {
      adaptiveDoneRef.current = true;
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
