"use client";

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
 * Strings arrive as props from the server-rendered CvDocument, so the
 * `cv` namespace never has to ship to the client.
 */

type CvActionsProps = {
  label: string;
  hint: string;
};

export function CvActions({ label, hint }: CvActionsProps) {
  return (
    <div className="flex flex-col items-start gap-2 print:hidden md:items-end">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border-[1.5px] border-ink bg-paper px-4 py-2 font-mono text-ink text-xs uppercase tracking-[0.18em] shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spot-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none"
      >
        {label}
        <span aria-hidden="true">↓</span>
      </button>
      <p className="max-w-56 text-left type-body-sm text-ink-muted md:text-right">{hint}</p>
    </div>
  );
}
