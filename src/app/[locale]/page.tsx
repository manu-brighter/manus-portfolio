import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { About } from "@/components/sections/About";
import { CaseStudy } from "@/components/sections/CaseStudy";
import { Contact } from "@/components/sections/Contact";
import { Hero } from "@/components/sections/Hero";
import { Photography } from "@/components/sections/Photography";
import { Playground } from "@/components/sections/Playground";
import { Skills } from "@/components/sections/Skills";
import { Work } from "@/components/sections/Work";
import { ScrollToOnLoad } from "@/components/ui/ScrollToOnLoad";
import { loadNamespaceGroup } from "@/i18n/messages";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * SF-5: home page adds `home` + `playground` namespace groups on top of
 * the layout's `common`. Excludes `legal` and `notFound` from the client
 * payload (those load only on /impressum, /datenschutz, and the 404).
 *
 * Note on the nested `<NextIntlClientProvider>` — next-intl v4 inner
 * providers REPLACE the outer `messages` rather than merging them. We
 * therefore re-include `common` in the merged tree so that any client
 * component inside `{children}` (e.g. a future widget that reads
 * `nav.items` or `footer.*`) can still resolve common keys. The outer
 * layout provider still carries `common` alone for the chrome that
 * lives OUTSIDE `{children}` (Nav, Footer, Loader, ScrollProgress).
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  // Guard before loadNamespaceGroup: the [locale] dynamic route also catches
  // non-locale root requests (iOS probes /apple-touch-icon-precomposed.png and
  // /apple-touch-icon.png), and without this the page calls
  // loadNamespaceGroup("apple-touch-icon.png", ...) -> MODULE_NOT_FOUND crash
  // before the layout's own notFound() guard can take effect. Mirrors the
  // guard in [locale]/layout.tsx.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [commonMessages, homeMessages, playgroundMessages] = await Promise.all([
    loadNamespaceGroup(locale, "common"),
    loadNamespaceGroup(locale, "home"),
    loadNamespaceGroup(locale, "playground"),
  ]);
  const pageMessages = { ...commonMessages, ...homeMessages, ...playgroundMessages };

  return (
    <NextIntlClientProvider messages={pageMessages}>
      <ScrollToOnLoad />
      <Hero />
      <About />
      <Skills />
      <Work />
      <CaseStudy />
      <Photography />
      <Playground />
      <Contact />
    </NextIntlClientProvider>
  );
}
