"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * CvInkStamp — "Tinte · Nachtdruck" chip in the CV sheet footer.
 *
 * Names the ink character the sheet is currently printed in, exactly
 * like a pressroom proof notes its ink run. The source of truth is
 * `<html data-sim-theme>` — the same attribute that flips the color
 * tokens — NOT the preset store: on reduced-motion / static tier the
 * store may hold a persisted preset while SimThemeSync never applies
 * it, and the sheet (and therefore the printed PDF) stays canonical
 * riso. Reading the attribute keeps label and actual ink in lockstep.
 *
 * A MutationObserver keeps it live while the user plays with the
 * switcher on /cv; because `window.print()` snapshots the current DOM,
 * the stamp prints the truthful ink name into the PDF.
 *
 * SSR renders the default (riso); the post-mount effect corrects it
 * before paint settles — same hydration-gating idea as useNightTheme.
 */

const THEME_TO_PRESET: Record<string, string> = {
  wave: "wave",
  warm: "turbulenz",
  wash: "aquarell",
  night: "nachtdruck",
};

export function CvInkStamp({ label }: { label: string }) {
  const t = useTranslations("simPresets");
  const [presetKey, setPresetKey] = useState("riso");

  useEffect(() => {
    const read = () => {
      const theme = document.documentElement.dataset.simTheme ?? "";
      setPresetKey(THEME_TO_PRESET[theme] ?? "riso");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-sim-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <p className="type-label-stamp rotate-[-1.5deg]">
      {label}
      <span aria-hidden="true"> · </span>
      {t(presetKey)}
    </p>
  );
}
