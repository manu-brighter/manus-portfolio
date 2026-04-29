import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ExperimentRouter } from "@/components/playground/ExperimentRouter";
import { routing } from "@/i18n/routing";
import { EXPERIMENTS, getExperiment } from "@/lib/content/playground";

/**
 * Per-experiment route. Static-export-friendly: every (locale × slug)
 * pair is materialized at build time via `generateStaticParams`.
 *
 * Each slug renders through `<ExperimentRouter>`, which is a thin
 * client component that branches to the right experiment view. Page
 * stays a server component so we can validate the slug + setRequestLocale
 * before any client JS loads.
 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => EXPERIMENTS.map((e) => ({ locale, slug: e.slug })));
}

type PlaygroundExperimentPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default function PlaygroundExperimentPage({ params }: PlaygroundExperimentPageProps) {
  const { locale, slug } = use(params);
  setRequestLocale(locale);

  const experiment = getExperiment(slug);
  if (!experiment) notFound();

  return <ExperimentRouter slug={experiment.slug} />;
}
