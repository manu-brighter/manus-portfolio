import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExperimentRouter } from "@/components/playground/ExperimentRouter";
import { loadNamespaceGroup } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { EXPERIMENTS, getExperiment } from "@/lib/content/playground";
import { buildPageShareMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site";

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
 *
 * Note on the nested provider — next-intl v4 inner providers REPLACE
 * the outer `messages` rather than merging them. We re-include
 * `common` in the merged tree so any client component inside
 * `<ExperimentRouter>` can still resolve common keys (nav.items,
 * footer.*, scrollProgress.*) — the experiments don't read those
 * today, but the invariant should hold by construction.
 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => EXPERIMENTS.map((e) => ({ locale, slug: e.slug })));
}

type PlaygroundExperimentPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

// Playground experiments are decorative, not portfolio content. noindex stops
// them from cluttering brand SERPs. We allow crawling (no robots.txt disallow)
// so Google reliably sees this tag — relying solely on robots.txt risks
// snippet-less URL listings when third parties link to an experiment.
//
// Title + caption reuse the experiment's own catalog strings; canonical and
// og:url point at the experiment itself, not at the locale home the layout
// would otherwise inherit.
export async function generateMetadata({
  params,
}: PlaygroundExperimentPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const experiment = getExperiment(slug);
  if (!hasLocale(routing.locales, locale) || !experiment) notFound();
  const t = await getTranslations({
    locale,
    namespace: `playground.experiments.${experiment.i18nKey}`,
  });
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  // Share title runs through the same template as <title>, so og:title
  // and twitter:title read "Ink Drop Studio · Manuel Heller" too.
  const title = tMeta("titleTemplate").replace("%s", t("cardTitle"));
  const description = t("caption");
  const url = `${SITE.url}/${locale}/playground/${experiment.slug}/`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...buildPageShareMetadata({ locale, url, title, description }),
    robots: { index: false, follow: false },
  };
}

export default async function PlaygroundExperimentPage({ params }: PlaygroundExperimentPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const experiment = getExperiment(slug);
  if (!experiment) notFound();

  const [commonMessages, playgroundMessages] = await Promise.all([
    loadNamespaceGroup(locale, "common"),
    loadNamespaceGroup(locale, "playground"),
  ]);
  const pageMessages = { ...commonMessages, ...playgroundMessages };

  return (
    <NextIntlClientProvider messages={pageMessages}>
      <ExperimentRouter slug={experiment.slug} />
    </NextIntlClientProvider>
  );
}
