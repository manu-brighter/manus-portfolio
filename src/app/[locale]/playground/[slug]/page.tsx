import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ExperimentRouter } from "@/components/playground/ExperimentRouter";
import { loadNamespaceGroup } from "@/i18n/messages";
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
 *
 * SF-5: wraps children in a nested NextIntlClientProvider with the
 * `playground` namespace group — the `home` and `legal` groups stay
 * out of this route's client payload (~25 KB saved per locale).
 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => EXPERIMENTS.map((e) => ({ locale, slug: e.slug })));
}

type PlaygroundExperimentPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function PlaygroundExperimentPage({ params }: PlaygroundExperimentPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const experiment = getExperiment(slug);
  if (!experiment) notFound();

  const playgroundMessages = await loadNamespaceGroup(locale, "playground");

  return (
    <NextIntlClientProvider messages={playgroundMessages}>
      <ExperimentRouter slug={experiment.slug} />
    </NextIntlClientProvider>
  );
}
