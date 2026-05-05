"use client";

import { useTranslations } from "next-intl";

/**
 * CaseStudy — temporary stub during diorama redesign (Task 1 of plan
 * 2026-05-05). Will be rewritten in Task 7 to compose DioramaTrack +
 * DioramaIllustration + DioramaCards + InkColumnFluidSim.
 */
export function CaseStudy() {
  const t = useTranslations("caseStudy");
  return (
    <section
      id="case-study"
      aria-labelledby="case-study-heading"
      className="container-page py-20 text-center"
    >
      <h2 id="case-study-heading" className="type-h2 text-ink-muted">
        {t("headline")} — Diorama Redesign in Progress
      </h2>
    </section>
  );
}
