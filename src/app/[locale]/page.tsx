import { NextIntlClientProvider } from "next-intl";
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

// SF-5: home page adds `home` + `playground` namespace groups on top of
// the layout's `common`. Excludes `legal` and `notFound` from the client
// payload (those load only on /impressum, /datenschutz, and the 404).
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [homeMessages, playgroundMessages] = await Promise.all([
    loadNamespaceGroup(locale, "home"),
    loadNamespaceGroup(locale, "playground"),
  ]);
  const pageMessages = { ...homeMessages, ...playgroundMessages };

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
