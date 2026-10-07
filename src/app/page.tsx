import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LOCALE_STORAGE_KEY } from "@/lib/localePreference";
import { escapeForScript } from "@/lib/seo/escapeForScript";
import { buildPageShareMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site";

/**
 * Root language-detection redirect.
 *
 * Plan §10 calls for an Accept-Language middleware redirect, but
 * `output: 'export'` disables middleware (see `.claude/CLAUDE.md`
 * deviations). The static fallback: serve a tiny HTML document at `/`
 * that picks the best supported locale and swaps location.
 * `<meta http-equiv="refresh">` covers the no-JS path; the visible
 * fallback link covers the paranoid-browser edge case where both JS
 * and meta-refresh are suppressed.
 *
 * Priority order:
 *   1. a locale the visitor explicitly switched to (`manus-locale`)
 *   2. the first supported entry in `navigator.languages`
 *   3. the default locale
 *
 * (1) beats (2) on purpose: without it a German browser that chose EN
 * is sent back to DE on every later `/` visit, which reads as the
 * switcher not working. An explicit locale URL still wins over both,
 * because this script only ever runs on the bare root.
 *
 * This page owns its own `<html>`/`<body>` because the root layout is
 * a pass-through (the locale layout in `[locale]/layout.tsx` owns the
 * shell for every routed page).
 *
 * Keep the redirect script inline and pre-hydration so the user never
 * sees a flash of English content while React boots. Two features now
 * ride on it (the sniff and the remembered switch), so the SF-1 CSP
 * rollout has to hand it a nonce or hash: without one the static
 * fallbacks take over, and those can only ever point at the default
 * locale, silently ignoring a stored choice.
 */

export async function generateMetadata(): Promise<Metadata> {
  // Default-locale home copy: `/` is what people paste into chats, so the
  // share card has to match the page it lands on (/de/ without a stored
  // choice or browser hint).
  const locale = routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${SITE.url}/${l}/`;
  languages["x-default"] = `${SITE.url}/${locale}/`;
  return {
    title,
    description,
    alternates: { languages },
    ...buildPageShareMetadata({ locale, url: `${SITE.url}/${locale}/`, title, description }),
    // A redirect stub is not a landing page, but the locale homes it links
    // to must stay discoverable, so `follow` stays on.
    robots: { index: false, follow: true },
  };
}

const REDIRECT_SCRIPT = `
(function () {
  try {
    var supported = ${escapeForScript(routing.locales)};
    var fallback = ${escapeForScript(routing.defaultLocale)};
    var picked = '';
    try {
      // Own try/catch: reading storage THROWS when site data is blocked.
      // Sharing the outer one would drop everyone onto the fallback and
      // silently kill browser-language detection in private windows.
      var key = ${escapeForScript(LOCALE_STORAGE_KEY)};
      var stored = localStorage.getItem(key);
      if (stored && supported.indexOf(stored) !== -1) picked = stored;
      // Validate-and-self-heal, same as getCachedTier() and
      // readStoredPresetId(): a value that is no longer a supported
      // locale would otherwise outlive the locale list forever.
      else if (stored) localStorage.removeItem(key);
    } catch (_storageErr) { /* no stored choice available */ }
    if (!picked) {
      var langs = (navigator.languages && navigator.languages.length)
        ? navigator.languages
        : [navigator.language || fallback];
      for (var i = 0; i < langs.length; i++) {
        // Region subtags are dropped ('de-CH' -> 'de'); the visitor's own
        // order is the priority, so the first supported match wins.
        var short = String(langs[i]).slice(0, 2).toLowerCase();
        if (supported.indexOf(short) !== -1) { picked = short; break; }
      }
    }
    location.replace('/' + (picked || fallback) + '/');
  } catch (_err) {
    location.replace('/' + ${escapeForScript(routing.defaultLocale)} + '/');
  }
})();
`.trim();

export default async function RootRedirect() {
  // Same source as <html lang>: the page is served in the default locale.
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "rootRedirect" });
  const fallbackHref = `/${routing.defaultLocale}/`;

  return (
    <html lang={routing.defaultLocale}>
      <head>
        {/* No-JS safety net only, hence inside <noscript>: with JS on, a
            refresh would race the inline script's location.replace() and
            could override the detected locale with the default one. That
            race is why it used to wait 1s; out of the scripted path it can
            fire immediately. Robots meta comes from `metadata` above. */}
        <noscript>
          <meta httpEquiv="refresh" content={`0; url=${fallbackHref}`} />
        </noscript>
      </head>
      <body>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline locale-detect runs pre-hydration; scoped to static locale list.
          dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }}
        />
        <noscript>
          <p>
            <a href={fallbackHref}>
              {t("continue")} → /{routing.defaultLocale}/
            </a>
          </p>
        </noscript>
      </body>
    </html>
  );
}
