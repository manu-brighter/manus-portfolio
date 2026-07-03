import { create } from "zustand";
import {
  DEFAULT_PRESET_ID,
  getSimPreset,
  isSimPresetId,
  type SimPresetId,
} from "@/lib/content/simPresets";
import { DEFAULT_FLUID_VISUALS, type FluidOrchestrator } from "@/lib/gl/fluidOrchestrator";

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

/**
 * Give a secondary orchestrator (playground experiments, card
 * mini-sims) the active preset's LOOK and keep it in sync with store
 * changes. Visuals only — physics stays owned by the caller (the
 * studio's Tweakpane sliders and the mini-sims' tier configs must not
 * be clobbered by preset physics). Call after `init()`; returns the
 * unsubscribe for effect cleanup.
 */
export function syncPresetVisuals(orchestrator: FluidOrchestrator): () => void {
  const apply = (id: SimPresetId) => {
    orchestrator.setVisuals({ ...DEFAULT_FLUID_VISUALS, ...getSimPreset(id).visuals });
  };
  apply(useSimPresetStore.getState().presetId);
  return useSimPresetStore.subscribe((current, previous) => {
    if (current.presetId !== previous.presetId) apply(current.presetId);
  });
}
