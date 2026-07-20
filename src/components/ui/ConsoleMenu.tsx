// biome-ignore-all lint/suspicious/noConsole: the console IS the UI here
"use client";

import { useEffect } from "react";
import { isSimPresetId, SIM_PRESETS } from "@/lib/content/simPresets";
import { dispatchSplat } from "@/lib/fluidBus";
import { SPOT_HEX, type SpotColor } from "@/lib/palette";
import { triggerPrintJam } from "@/lib/printJamBus";
import { useSimPresetStore } from "@/lib/simPresetStore";
import { SITE } from "@/lib/site";

/**
 * ConsoleMenu — the devtools greeting + `window.manu` command surface.
 *
 * Prints a styled ASCII banner once per page load and exposes a small
 * command object for the technical audience: preset switching, splat
 * storms, and the Fehldruck easter-egg trigger. English on purpose —
 * the console reaches developers, not the four site locales.
 * Named `manu` after Manuel directly. (The project is "manus portfolio"
 * — the German genitive, "Manu's portfolio" — but the command surface
 * addresses him by name, not the possessive.)
 *
 * Module-level `installed` flag keeps StrictMode's double-effect (and
 * client-side route changes under the persistent layout) from
 * printing the banner twice. `window.manu` deliberately survives
 * unmount — a torn-down console API mid-session is more confusing
 * than a stale one on a dead page.
 */

const SPOTS: readonly SpotColor[] = ["rose", "amber", "mint", "violet"];

const BANNER = String.raw`
 __  __    _    _   _  _   _
|  \/  |  / \  | \ | || | | |
| |\/| | / _ \ |  \| || | | |
| |  | |/ ___ \| |\  || |_| |
|_|  |_/_/   \_\_| \_| \___/
`;

const PRESET_IDS = SIM_PRESETS.map((p) => p.id).join(" | ");

declare global {
  interface Window {
    manu?: {
      help: () => void;
      preset: (id?: string) => void;
      burst: (count?: number) => void;
      fehldruck: () => void;
    };
  }
}

let installed = false;

function install(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  console.log(
    `%c${BANNER}%c\n  ${SITE.shortName} · ${SITE.tagline}\n  ${SITE.url}\n\n%c  The ink under your cursor is a real-time GPU Navier-Stokes sim,\n  cel-shaded into a Risograph print. Five inkings, one paper.\n\n%c  > manu.help()  · take the print controls\n`,
    `color: ${SPOT_HEX.rose}; font-family: monospace;`,
    "color: inherit; font-weight: bold;",
    "color: inherit; font-weight: normal;",
    `color: ${SPOT_HEX.violet}; font-weight: bold;`,
  );

  window.manu = {
    help: () => {
      console.log(
        [
          "manu · print controls",
          "",
          `  manu.preset(id)   switch the ink character (${PRESET_IDS})`,
          "  manu.preset()     show the active preset",
          "  manu.burst(n)     throw n ink splats at the page (default 14)",
          "  manu.fehldruck()  ...slip the registration. Briefly.",
          "",
          "  (there may be an older way in, if you know the code)",
        ].join("\n"),
      );
    },
    preset: (id?: string) => {
      const store = useSimPresetStore.getState();
      if (id === undefined) {
        console.log(`Active preset: "${store.presetId}". Options: ${PRESET_IDS}`);
        return;
      }
      if (!isSimPresetId(id)) {
        console.warn(`Unknown preset "${id}". Options: ${PRESET_IDS}`);
        return;
      }
      store.setPreset(id);
      console.log(`Preset -> "${id}". Fresh ink.`);
    },
    burst: (count = 14) => {
      const n = Math.min(Math.max(Math.floor(count), 1), 60);
      for (let i = 0; i < n; i++) {
        dispatchSplat({
          x: 0.08 + Math.random() * 0.84,
          y: 0.08 + Math.random() * 0.84,
          color: SPOTS[Math.floor(Math.random() * SPOTS.length)] as SpotColor,
          dx: (Math.random() - 0.5) * 1.8,
          dy: (Math.random() - 0.5) * 1.8,
        });
      }
      console.log(`${n} splats on paper.`);
    },
    fehldruck: () => {
      console.log("Registration slipping...");
      triggerPrintJam();
    },
  };
}

export function ConsoleMenu() {
  useEffect(() => {
    install();
  }, []);
  return null;
}
