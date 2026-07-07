import { create } from "zustand";
import {
  DEFAULT_PRESET_ID,
  getSimPreset,
  isSimPresetId,
  type SimPresetId,
} from "@/lib/content/simPresets";
import {
  DEFAULT_FLUID_VISUALS,
  type FluidOrchestrator,
  type FluidVisuals,
} from "@/lib/gl/fluidOrchestrator";

/**
 * Active sim-preset selection, persisted across sessions.
 *
 * Lives outside the scene layer because FluidSim disposes + recreates
 * its orchestrator whenever the GPU auto-tuner swaps tiers — preset
 * state must survive that re-init (FluidSim re-applies it after every
 * `init()`). The switcher UI only ever touches this store; no
 * orchestrator refs leak out of the scene components.
 *
 * localStorage lazy-init mirrors `getCachedTier()` in `@/lib/gpu.ts`:
 * validate on read, silently fall back to the default on anything
 * unexpected (SSR, storage disabled, stale/foreign values).
 */

const STORAGE_KEY = "manus-sim-preset";

function readStoredPresetId(): SimPresetId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isSimPresetId(raw)) return raw;
    if (raw !== null) localStorage.removeItem(STORAGE_KEY);
  } catch {
    // SSR or storage unavailable — fall through to default
  }
  return DEFAULT_PRESET_ID;
}

type SimPresetStore = {
  presetId: SimPresetId;
  setPreset: (id: SimPresetId) => void;
};

export const useSimPresetStore = create<SimPresetStore>((set) => ({
  presetId: readStoredPresetId(),
  setPreset: (id) => {
    set({ presetId: id });
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable — selection still applies for the session
    }
  },
}));

/** Render-look subset of FluidVisuals — the "what it looks like" keys
 *  (shader, paper, ink, ladder, grain, edges), as opposed to the
 *  splat-feel keys (count/scatter/velocity/dye scale) and the ambient
 *  rig. `lookOnly` sync applies only these. */
const LOOK_KEYS = [
  "style",
  "paper",
  "ink",
  "ladder",
  "grainStrength",
  "outlineThreshold",
  "edgeStrength",
] as const satisfies readonly (keyof FluidVisuals)[];

export type SyncPresetOptions = {
  /**
   * Apply ONLY the render-look subset (LOOK_KEYS) and leave the
   * caller's splat-feel (splatCount/scatter/velocityScale/dyeScale)
   * and ambient rig untouched. Type-as-Fluid uses this: the preset's
   * swarm feel (turbulenz's 7 droplets, high dyeScale) is tuned for
   * the hero's FAST dye dissipation and over-accumulates into a solid
   * blob under the experiment's calm-paper physics (slow fade). Look-
   * only recolors the sim without importing that mismatch.
   */
  lookOnly?: boolean;
  /**
   * When set, re-scale the cursor splat radius by the incoming
   * preset's `splatRadiusScale` on every switch (base × scale, via
   * setParams — caller's other physics stays authoritative). Makes
   * the hover cursor follow the theme: tiny for turbulenz, a big
   * bloom for aquarell. Requires an initialised orchestrator.
   */
  cursorSplatRadiusBase?: number;
};

/**
 * Give a secondary orchestrator (playground experiments, card
 * mini-sims) the active preset's LOOK and keep it in sync with store
 * changes. Physics stays owned by the caller (the studio's Tweakpane
 * sliders and the mini-sims' tier configs must not be clobbered by
 * preset physics). Call after `init()`; returns the unsubscribe for
 * effect cleanup. See SyncPresetOptions for the look-only / cursor-
 * radius variants.
 */
export function syncPresetVisuals(
  orchestrator: FluidOrchestrator,
  options: SyncPresetOptions = {},
): () => void {
  const { lookOnly = false, cursorSplatRadiusBase } = options;
  const apply = (id: SimPresetId) => {
    const preset = getSimPreset(id);
    const merged = { ...DEFAULT_FLUID_VISUALS, ...preset.visuals };
    if (lookOnly) {
      const look: Partial<FluidVisuals> = {};
      for (const k of LOOK_KEYS) {
        // Each key maps to its own value type; a per-key assign keeps
        // it type-safe without widening the whole object.
        Object.assign(look, { [k]: merged[k] });
      }
      orchestrator.setVisuals(look);
    } else {
      orchestrator.setVisuals(merged);
    }
    if (cursorSplatRadiusBase !== undefined) {
      const scale = preset.physics.splatRadiusScale ?? 1;
      orchestrator.setParams({ splatRadius: cursorSplatRadiusBase * scale });
    }
  };
  apply(useSimPresetStore.getState().presetId);
  return useSimPresetStore.subscribe((current, previous) => {
    if (current.presetId !== previous.presetId) apply(current.presetId);
  });
}
