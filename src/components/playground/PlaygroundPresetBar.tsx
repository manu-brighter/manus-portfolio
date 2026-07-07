"use client";

import { useTranslations } from "next-intl";
import { swatchGradient } from "@/components/ui/SimPresetSwitcher";
import { getSimPreset, SIM_PRESETS } from "@/lib/content/simPresets";
import { useSimPresetStore } from "@/lib/simPresetStore";

/**
 * PlaygroundPresetBar — the DOCKED sim-preset switcher for playground
 * experiment routes. Where the site-wide SimPresetSwitcher is a
 * collapsing floating pill, this is a fixed, always-expanded riso card
 * that reads as part of the experiment's control chrome (Manuel asked
 * for a fixed element, not an overlay). The floating pill stands down
 * on `/playground/*` (see SimPresetSwitcher's route gate), so there's
 * only ever one switcher on screen.
 *
 * A labeled card (matching the toolbar buttons + Tweakpane: ink
 * border, offset shadow, paper fill) holding the active preset's name
 * plus one two-tone dot per preset. Same a11y contract as the pill:
 * a native radiogroup (sr-only inputs + label-drawn dots), accessible
 * names from sr-only text, spot colors as fills only.
 *
 * Positioned top-right on desktop (stacks above InkDropStudio's
 * Tweakpane to form one control column); below the title/caption
 * block on mobile so it clears the wide serif heading.
 */
export function PlaygroundPresetBar() {
  const t = useTranslations("simPresets");
  const presetId = useSimPresetStore((s) => s.presetId);
  const setPreset = useSimPresetStore((s) => s.setPreset);
  const active = getSimPreset(presetId);

  return (
    <div
      data-no-splat
      className="pointer-events-auto flex items-center gap-3 border-[1.5px] border-ink bg-paper px-3 py-2 shadow-[3px_3px_0_var(--color-ink)]"
    >
      <span className="type-label-stamp border-none px-0 py-0 text-ink">{t(active.i18nKey)}</span>
      <div role="radiogroup" aria-label={t("label")} className="flex items-center gap-1.5">
        {SIM_PRESETS.map((preset) => {
          const isActive = preset.id === presetId;
          return (
            <label
              key={preset.id}
              className="group relative flex size-8 cursor-pointer items-center justify-center [-webkit-tap-highlight-color:transparent]"
            >
              <input
                type="radio"
                name="playground-sim-preset"
                value={preset.id}
                checked={isActive}
                onChange={() => setPreset(preset.id)}
                className="peer sr-only"
              />
              <span className="sr-only">{t(preset.i18nKey)}</span>
              {/* Ink ring on active / mint ring on keyboard focus */}
              <span
                aria-hidden="true"
                className={`absolute inset-0 rounded-full border-2 transition-[border-color,transform] duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring) ${
                  isActive
                    ? "scale-100 border-ink"
                    : "scale-75 border-transparent group-hover:border-paper-line"
                }`}
              />
              <span
                aria-hidden="true"
                className={`size-3.5 rounded-full transition-transform duration-200 ${
                  isActive ? "scale-110" : "scale-100 opacity-70 group-hover:opacity-100"
                }`}
                style={{ background: swatchGradient(preset) }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
