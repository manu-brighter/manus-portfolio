import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Root language-detection redirect.
 *
 * Plan §10 calls for an Accept-Language middleware redirect, but
 * `output: 'export'` disables middleware (see `.claude/CLAUDE.md`
 * deviations). The static fallback: serve a tiny HTML document at `/`
 * that reads `navigator.languages`, picks the first supported locale,
 * and swaps location. `<meta http-equiv="refresh">` covers the no-JS
 * path; the visible fallback link covers the paranoid-browser edge
 * case where both JS and meta-refresh are suppressed.
 *
 * This page owns its own `<html>`/`<body>` because the root layout is
 * a pass-through (the locale layout in `[locale]/layout.tsx` owns the
 * shell for every routed page).
 *
 * Keep the redirect script inline and pre-hydration so the user never
 * sees a flash of English content while React boots.
 */

export const metadata: Metadata = {
  title: "Manuel Heller — Craft Portfolio",
  robots: { index: false, follow: false },
};

/**
 * `JSON.stringify` does not escape `</script>` or `<!--`. Even though our
 * inputs are a static compile-time array of 2-letter strings, we harden
 * the serialisation in case a future locale value ever sneaks through
 * (defence-in-depth, Phase 11 CSP will also gate this script).
 */
const escapeForScript = (value: unknown): string => JSON.stringify(value).replace(/</g, "\\u003c");

const REDIRECT_SCRIPT = `
(function () {
  try {
    var supported = ${escapeForScript(routing.locales)};
    var fallback = ${escapeForScript(routing.defaultLocale)};
    var langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || fallback];
    var picked = fallback;
    for (var i = 0; i < langs.length; i++) {
      var short = String(langs[i]).slice(0, 2).toLowerCase();
      if (supported.indexOf(short) !== -1) { picked = short; break; }
    }
    location.replace('/' + picked + '/');
  } catch (_err) {
    location.replace('/' + ${escapeForScript(routing.defaultLocale)} + '/');
  }
})();
`.trim();

export default function RootRedirect() {
  const fallbackHref = `/${routing.defaultLocale}/`;

  return (
    <html lang={routing.defaultLocale}>
      <head>
        {/* 1s delay (not 0) so the inline script — which does proper
            Accept-Language detection — almost always beats the refresh
            on slow devices (plan supported-target: Iris Xe). The refresh
            is strictly a no-JS safety net. */}
        <meta httpEquiv="refresh" content={`1; url=${fallbackHref}`} />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline locale-detect runs pre-hydration; scoped to static locale list.
          dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }}
        />
        <noscript>
          <p>
            <a href={fallbackHref}>Continue to portfolio → /{routing.defaultLocale}/</a>
          </p>
        </noscript>
      </body>
    </html>
  );
}
