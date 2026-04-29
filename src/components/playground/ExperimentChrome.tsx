"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type ExperimentChromeProps = {
  i18nKey: "inkDropStudio" | "typeAsFluid";
  children: React.ReactNode;
  /** Optional slot rendered top-right next to the back link.
   *  Used for in-experiment controls that must live in chrome rather
   *  than overlay the canvas (e.g. Type-as-Fluid's input field). */
  toolbar?: React.ReactNode;
};

/**
 * Shared chrome for every playground experiment route.
 *
 * Fixed-position frame on top of the experiment's full-screen canvas:
 *   - top-left: back link + experiment title (Riso stamp style)
 *   - top-right: optional toolbar slot
 *   - bottom-left: 1-line caption
 *
 * The chrome itself is `pointer-events: none` outside its actual
 * controls, so the experiment canvas stays interactive everywhere
 * except the small badges.
 */
export function ExperimentChrome({ i18nKey, children, toolbar }: ExperimentChromeProps) {
  const t = useTranslations(`playground.experiments.${i18nKey}`);
  const tCommon = useTranslations("playground.shell");

  return (
    <div className="fixed inset-0 bg-paper">
      {/* Experiment canvas occupies the full frame. */}
      <div className="absolute inset-0">{children}</div>

      {/* Chrome layer */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top-left: back + title */}
        <div className="container-page absolute top-6 left-0 right-0 flex items-start justify-between gap-6">
          <div className="pointer-events-auto flex flex-col gap-1">
            <Link
              href="/#playground"
              className="type-label-stamp inline-flex items-baseline gap-2 text-ink hover:translate-x-[-2px] transition-transform"
            >
              <span aria-hidden="true">←</span>
              <span>{tCommon("back")}</span>
            </Link>
            <h1 className="type-h2 mt-3 text-ink" style={{ fontStyle: "italic" }}>
              {t("title")}
            </h1>
          </div>
          {toolbar ? <div className="pointer-events-auto">{toolbar}</div> : null}
        </div>

        {/* Bottom-left: caption */}
        <div className="container-page absolute bottom-6 left-0 right-0">
          <p className="type-body-sm max-w-[60ch] text-ink-soft">{t("caption")}</p>
        </div>
      </div>
    </div>
  );
}
