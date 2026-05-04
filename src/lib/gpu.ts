// src/lib/gpu.ts

export type GPUTier = "high" | "medium" | "low" | "minimal" | "static";

export type TierConfig = {
  tier: GPUTier;
  gridSize: number;
  pressureIterations: number;
  halfRate: boolean;
  velocityDissipation: number;
  dyeDissipation: number;
  splatRadius: number;
  confinement: number;
};

const TIER_CONFIGS: Record<Exclude<GPUTier, "static">, TierConfig> = {
  high: {
    tier: "high",
    gridSize: 512,
    pressureIterations: 40,
    halfRate: false,
    velocityDissipation: 0.97,
    dyeDissipation: 0.95,
    splatRadius: 0.012,
    confinement: 15.0,
  },
  medium: {
    tier: "medium",
    gridSize: 256,
    pressureIterations: 30,
    halfRate: false,
    velocityDissipation: 0.97,
    dyeDissipation: 0.95,
    splatRadius: 0.015,
    confinement: 12.0,
  },
  low: {
    tier: "low",
    gridSize: 128,
    pressureIterations: 20,
    halfRate: true,
    velocityDissipation: 0.96,
    dyeDissipation: 0.94,
    splatRadius: 0.018,
    confinement: 10.0,
  },
  minimal: {
    tier: "minimal",
    gridSize: 96,
    pressureIterations: 15,
    halfRate: true,
    velocityDissipation: 0.95,
    dyeDissipation: 0.93,
    splatRadius: 0.022,
    confinement: 8.0,
  },
};

export function getTierConfig(tier: Exclude<GPUTier, "static">): TierConfig {
  return TIER_CONFIGS[tier];
}

type RendererPattern = { pattern: string; tier: Exclude<GPUTier, "static"> };

const RENDERER_PATTERNS: RendererPattern[] = [
  { pattern: "rtx", tier: "high" },
  { pattern: "rx 7", tier: "high" },
  { pattern: "apple m2", tier: "high" },
  { pattern: "apple m3", tier: "high" },
  { pattern: "apple m4", tier: "high" },
  { pattern: "radeon pro", tier: "high" },
  { pattern: "iris xe", tier: "low" },
  { pattern: "iris plus", tier: "low" },
  { pattern: "uhd 6", tier: "low" },
  { pattern: "uhd 7", tier: "low" },
  { pattern: "mali-g", tier: "minimal" },
  { pattern: "adreno 6", tier: "minimal" },
  { pattern: "adreno 5", tier: "minimal" },
  { pattern: "powervr", tier: "minimal" },
];

function matchRenderer(renderer: string): GPUTier | null {
  const lower = renderer.toLowerCase();
  for (const { pattern, tier } of RENDERER_PATTERNS) {
    if (lower.includes(pattern)) return tier;
  }
  return null;
}

const CACHE_KEY = "manus-gpu-tier";
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getCachedTier(): GPUTier | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { tier, ts } = JSON.parse(raw) as { tier: GPUTier; ts: number };
    if (Date.now() - ts > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return tier;
  } catch {
    return null;
  }
}

/** Public synchronous read of the cached tier — used by useGPUCapability
 *  for lazy-init so the FluidSim mounts with the correct config from the
 *  first paint and never has to dispose+reinit mid-session. */
export function readCachedTier(): GPUTier | null {
  return getCachedTier();
}

export function cacheTier(tier: GPUTier): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ tier, ts: Date.now() }));
  } catch {
    // localStorage unavailable
  }
}

export function probeGPU(gl: WebGL2RenderingContext): {
  tier: GPUTier;
  renderer: string;
  fromCache: boolean;
  /** True when the tier came from a positive renderer-string pattern
   *  match (or from cache). False means we fell back to the "medium"
   *  default for an unknown renderer — those need the 30-frame
   *  measurement to pick a real tier. */
  matched: boolean;
} {
  const cached = getCachedTier();
  if (cached) {
    return { tier: cached, renderer: "(cached)", fromCache: true, matched: true };
  }

  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : "unknown";

  const matched = matchRenderer(renderer);
  if (matched) {
    return { tier: matched, renderer, fromCache: false, matched: true };
  }

  return { tier: "medium", renderer, fromCache: false, matched: false };
}

export function tierFromFrametime(medianMs: number): Exclude<GPUTier, "static"> {
  if (medianMs < 8) return "high";
  if (medianMs < 14) return "medium";
  if (medianMs < 22) return "low";
  return "minimal";
}
