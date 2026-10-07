"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { useScene } from "@/components/scene/SceneProvider";

/** Motion settings inside the compact studio disclosure. */
export function InkPreviewPanel() {
  const t = useTranslations("inkStudio");
  const {
    inkPreference,
    selectInk,
    automaticallyReduced,
    inkUnavailable,
    fullUnavailable,
    reducedMotion,
  } = useScene();
  const descriptionId = useId();
  return (
    <fieldset className="border-t border-ink/20 pt-3" aria-describedby={descriptionId}>
      <legend className="pr-2 font-mono text-[0.65rem] uppercase tracking-widest">
        {t("motion")}
      </legend>
      <div className="flex flex-col gap-1">
        {(["light", "full"] as const).map((mode) => (
          <label
            key={mode}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 has-checked:bg-paper-shade has-disabled:cursor-default has-disabled:opacity-60"
          >
            <input
              type="radio"
              name="ink-mode"
              value={mode}
              aria-labelledby={`${descriptionId}-${mode}`}
              checked={inkPreference === mode}
              disabled={reducedMotion || (mode === "full" && fullUnavailable)}
              onChange={() => selectInk(mode)}
              className="size-4 accent-[var(--color-ink)]"
            />
            <span className="py-1.5">
              <span id={`${descriptionId}-${mode}`} className="block text-sm">
                {t(mode)}
              </span>
              <span className="block text-[0.65rem] leading-relaxed text-ink-muted">
                {t(`${mode}Short`)}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p id={descriptionId} className="mt-3 text-xs leading-relaxed text-ink-muted">
        {reducedMotion
          ? t("reducedMotion")
          : inkUnavailable
            ? t("unavailable")
            : automaticallyReduced
              ? t("reducedNotice")
              : t(`${inkPreference}Body`)}
      </p>
    </fieldset>
  );
}
