import { defineRouting } from "next-intl/routing";

/**
 * Locales follow plan §10. Order = priority for fallbacks. DE is default.
 *
 * `localePrefix: 'always'` is non-negotiable for static export: without
 * middleware (plan deviation — `output: 'export'` disables it), Next has
 * no server-side chance to redirect bare `/` to the user's locale. Every
 * locale therefore lives at `/<locale>/…` and the bare root is handled
 * by `src/app/page.tsx`, which runs a client-side Accept-Language sniff
 * with a `<meta http-equiv="refresh">` fallback.
 */
export const routing = defineRouting({
  locales: ["de", "en", "fr", "it"],
  defaultLocale: "de",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
