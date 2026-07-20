import type { AbstractIntlMessages } from "next-intl";

import deCommon from "../../messages/de/common.json";
import deCv from "../../messages/de/cv.json";
import deHome from "../../messages/de/home.json";
import deLegal from "../../messages/de/legal.json";
import deNotFound from "../../messages/de/notFound.json";
import dePlayground from "../../messages/de/playground.json";

/**
 * Per-route-segment i18n catalogs (SF-5).
 *
 * Each locale's messages live in `messages/{locale}/<group>.json`,
 * grouped so each client-side <NextIntlClientProvider> only pays for
 * the namespaces a route actually consumes:
 *
 *   - `common`    — layout chrome (nav/footer/loader/scrollProgress
 *                    /skipLink/brand/localeSwitcher/meta). Always shipped.
 *   - `home`      — sections on the home page (hero / about / currently
 *                    / skills / work / caseStudy / photography / contact).
 *   - `playground` — playground listing + experiment chrome + per-
 *                    experiment copy. Loaded by both `/` and
 *                    `/playground/[slug]`.
 *   - `legal`     — Impressum + Datenschutz. Loaded only by /impressum
 *                    and /datenschutz.
 *   - `cv`        — Curriculum Vitae. Loaded only by /cv (server-only:
 *                    CvDocument renders server-side, the print button
 *                    gets its strings as props).
 *   - `notFound`  — 404 page. Loaded only by the root `not-found.tsx`.
 *
 * Server-side `getTranslations()` reads from the merged tree
 * assembled by `i18n/request.ts`, so every namespace is always
 * server-accessible regardless of route.
 */
export const NAMESPACE_GROUPS = [
  "common",
  "home",
  "playground",
  "legal",
  "cv",
  "notFound",
] as const;

export type NamespaceGroup = (typeof NAMESPACE_GROUPS)[number];

// Type-only inference root. DE is the source-of-truth locale (matches
// the pre-SF-5 i18n.d.ts pattern). Constructing a fake merged object
// at the type level lets `IntlMessages` and i18n-shapes.ts read the
// full message tree shape without doing the runtime merge.
const TYPE_INFERENCE_ROOT = {
  ...deCommon,
  ...deHome,
  ...dePlayground,
  ...deLegal,
  ...deCv,
  ...deNotFound,
};

export type AllMessages = typeof TYPE_INFERENCE_ROOT;

export type HomeMessages = typeof deHome;
export type LegalMessages = typeof deLegal;
export type PlaygroundMessages = typeof dePlayground;
export type CommonMessages = typeof deCommon;
export type CvMessages = typeof deCv;
export type NotFoundMessages = typeof deNotFound;

/**
 * Dynamic, locale-scoped namespace loader. Returns the JSON contents
 * of `messages/{locale}/{group}.json` so callers can build the exact
 * client-side messages bundle they need (one group per route, plus
 * `common` for everyone).
 */
export async function loadNamespaceGroup(
  locale: string,
  group: NamespaceGroup,
): Promise<AbstractIntlMessages> {
  const mod = (await import(`../../messages/${locale}/${group}.json`)) as {
    default: AbstractIntlMessages;
  };
  return mod.default;
}

/**
 * Load every namespace group for the locale, merging them into one
 * tree. Used by `i18n/request.ts` so server-side `getTranslations()`
 * has the full message catalog.
 */
export async function loadAllNamespaces(locale: string): Promise<AbstractIntlMessages> {
  const groups = await Promise.all(NAMESPACE_GROUPS.map((g) => loadNamespaceGroup(locale, g)));
  return Object.assign({}, ...groups);
}
