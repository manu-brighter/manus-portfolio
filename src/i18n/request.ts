import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { loadAllNamespaces } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Server-side getTranslations() needs every namespace; the per-route
  // client-side payload picking happens at the NextIntlClientProvider
  // call sites in layout/pages (see SF-5).
  return {
    locale,
    messages: await loadAllNamespaces(locale),
  };
});
