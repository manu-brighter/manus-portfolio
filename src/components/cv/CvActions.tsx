"use client";

import { useCallback } from "react";
import { THEME_TO_PRESET } from "@/components/cv/cvTheme";

/**
 * CvActions — the "Als PDF speichern" stamp button.
 *
 * `window.print()` IS the PDF export: the print stylesheet strips the
 * site chrome and `print-color-adjust: exact` keeps the paper/ink/spot
 * tokens, so the saved PDF comes out in whatever ink character
 * (theme) is active — switching presets literally re-inks the sheet.
 * No build-time PDF generation, no server: the browser's print-to-PDF
 * does the work and always matches what's on screen.
 *
 * Chrome derives the saved filename from `document.title`, so the
 * button swaps in a title carrying the ACTIVE theme name for the
 * duration of the print and restores it afterwards — five differently
 * inked exports otherwise all land in Downloads under one name. The
 * theme is read off `<html data-sim-theme>` rather than the preset
 * store, for the same reason CvInkStamp does: on reduced-motion or the
 * static tier the store can hold a preset the sheet never applies.
 *
 * Strings arrive as props from the server-rendered CvDocument, so the
 * `cv` namespace never has to ship to the client.
 */

type CvActionsProps = {
  label: string;
  hint: string;
  /** Base document title, e.g. "CV · Manuel Heller". */
  docTitle: string;
  /** Preset id -> localised preset name, for the filename suffix. */
  presetNames: Record<string, string>;
};

export function CvActions({ label, hint, docTitle, presetNames }: CvActionsProps) {
  const handlePrint = useCallback(() => {
    const theme = document.documentElement.dataset.simTheme ?? "";
    const presetId = THEME_TO_PRESET[theme] ?? "riso";
    const presetName = presetNames[presetId];
    const previous = document.title;
    if (presetName) document.title = `${docTitle} · ${presetName}`;

    // Restore on the next tick as well as on afterprint: Chrome fires
    // afterprint reliably, but a cancelled dialog in other engines may
    // not, and a permanently renamed tab would be a visible bug.
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);

    window.print();
  }, [docTitle, presetNames]);

  return (
    <div className="flex flex-col items-start gap-2 print:hidden md:items-end">
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border-[1.5px] border-ink bg-paper px-4 py-2 font-mono text-ink text-xs uppercase tracking-[0.18em] shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none"
      >
        {label}
        <span aria-hidden="true">↓</span>
      </button>
      <p className="max-w-56 text-left type-body-sm text-ink-muted md:text-right">{hint}</p>
    </div>
  );
}
