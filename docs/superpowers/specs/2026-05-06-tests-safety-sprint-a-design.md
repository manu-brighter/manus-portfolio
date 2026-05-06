# Tests & Safety — Sprint A Design Spec

**Status:** Brainstormed and approved 2026-05-06. Ready for implementation plan.

**Goal:** Add 6 defensive tests + config items that close concrete coverage gaps surfaced during the post-launch hardening sprint and the recently-merged PR #11. Sprint A focuses on high-ROI / low-effort items; Sprint B (multi-viewport visual regression, mobile-touch, comprehensive keyboard-nav) and Sprint C (perf budget enforcement, lazy hero, dynamic imports) are out of scope and deferred to dedicated branches.

**Branch:** `feat/tests-safety-audit` (already created off `main`).

**Spec date:** 2026-05-06

---

## 1. Why this sprint

The post-launch sprint surfaced multiple bug-classes that existing CI didn't catch:
- ScrollTrigger pin-spacer race on legal-page nav (only caught when Manuel manually clicked)
- Translation key drift between locales (caught only by visual review)
- Footer obscured by canvas (caught visually after deploy-readiness call)
- DPI-scaled-monitor fallback miscalibration (caught by Manuel's home-vs-work hardware)

Common pattern: visual or runtime failure modes that need explicit assertions at CI time. This sprint adds 6 such assertions + one dependency-management config to reduce the rate at which these classes of bugs reach `main`.

## 2. Scope (in)

| # | Item | Files |
|---|---|---|
| 1 | Dependabot config — weekly npm + github-actions update PRs | `.github/dependabot.yml` (new) |
| 2 | JSON-LD schema validation test | `tests/e2e/json-ld.spec.ts` (new) |
| 3 | Sitemap + robots.txt validity tests | `tests/e2e/seo-files.spec.ts` (new) |
| 4 | i18n key parity test | `tests/i18n/key-parity.spec.ts` (new) |
| 5 | WebKit cross-browser project in Playwright config | `playwright.config.ts` (modified) |
| 6 | Bundle-size-guard — tighten lhci script-size from warn → error | `.lighthouserc.json` (modified) |

## 3. Scope (out)

Explicit non-goals:
- Multi-viewport visual regression (1920×1080, 2560×1440, mobile) — Sprint B
- Mobile/touch device emulation — Sprint B
- Comprehensive keyboard-navigation paths — Sprint B (axe already catches structural issues)
- Performance budget tightening (perf 0.55 → 0.85) — Sprint C, requires actual perf optimization first
- Lighthouse Performance optimization (lazy hero, dynamic imports, RAF coalescing) — Sprint C
- Memory-leak detection on long-running tabs — Sprint B/C overlap, complex
- Pre-commit hook extension (lint, typecheck on commit) — would slow commits >3s, nerves
- Type-coverage tracking — low ROI
- Tests for `scripts/optimize-assets.mjs` — internal build tool, low ROI
- Firefox cross-browser — engine-similar to Chromium for our use cases; WebKit is the meaningful coverage gain

## 4. Detailed design per item

### 4.1 Dependabot config

Create `.github/dependabot.yml` with:
- `package-ecosystem: npm` weekly schedule, grouped minor/patch updates
- `package-ecosystem: github-actions` weekly schedule
- Open PR limit: 5 per ecosystem
- Target branch: `main`
- Reviewers: not set (Manuel reviews manually)

Why grouped: prevents 30+ PRs/week noise; one PR per ecosystem with all minor/patch updates batched.

Why no major-update grouping: majors should be reviewed individually for breaking changes.

### 4.2 JSON-LD schema validation test

New `tests/e2e/json-ld.spec.ts` with 3 cases:

1. `/de/` page contains exactly one `<script type="application/ld+json">` with valid JSON. Parse it. Assert top-level is an array of two objects (Person + WebSite per `src/lib/seo/jsonLd.ts`).

2. The Person object has `@type: "Person"`, non-empty `name`, `url`, `image` object with `contentUrl`. Assert `image["@type"] === "ImageObject"` (added in commit `f15ec0b`). Assert `creator` and `copyrightHolder` are present. Assert `sameAs` is a non-empty array of valid URLs.

3. The WebSite object has `@type: "WebSite"`, `name`, `url`, `inLanguage: "de"`, `author` with `@type: "Person"` and matching `name`.

Repeat the basic shape check for `/en/`, `/fr/`, `/it/` (just `inLanguage` differs — quick smoke).

This catches: a careless edit to `jsonLd.ts` that drops a required field, or that flips Person.image back from ImageObject to a string URL (regressing the image-search work).

### 4.3 Sitemap + robots.txt validity tests

New `tests/e2e/seo-files.spec.ts`:

1. `GET /sitemap.xml` returns 200, `Content-Type` includes `xml`, body parses as valid XML, root element is `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`. Assert at least one `<url><loc>` entry.

2. `GET /robots.txt` returns 200, body contains a `User-agent: *` directive, a `Sitemap:` line pointing at the canonical sitemap.xml URL on `manuelheller.dev`. Assert no `Disallow: /` (which would deindex the whole site).

This catches: a future Next.js metadata API change that drops sitemap output, or someone setting `robots: { index: false }` on the locale layout (which would silently deindex).

### 4.4 i18n key parity test

New `tests/i18n/key-parity.spec.ts` (Playwright is fine for this — it's a node-runtime assertion that just imports the JSON files and walks them; no browser needed but Playwright is what we have).

Or: put it in `tests/unit/` if we add a new `tests/unit/` folder. Since the project has zero non-Playwright tests today, simpler to keep in Playwright and just not visit a page — Playwright tests can be node-only.

The test:
1. Read `messages/de.json`, `messages/en.json`, `messages/fr.json`, `messages/it.json` via `fs.readFileSync` + `JSON.parse`.
2. Recursively flatten each into `key.path.dot.notation` strings.
3. Assert all 4 sets are equal — same key paths, no extras, no missing.

Catches: a new key added to `de.json` but forgotten in another locale (next-intl will throw at runtime when that locale tries to access the key). Critical for the upcoming translation sprint.

The test does NOT compare values (DE-mirrored content patterns are intentional). Only key paths.

### 4.5 WebKit cross-browser project

Modify `playwright.config.ts` to add a `webkit` project (in addition to the existing `chromium`). Use `devices['Desktop Safari']`.

Costs:
- CI time: ~3-4 min added (full suite × 1 more browser, sequential by default in lhci).
- WebKit binary: Playwright installs it via `pnpm exec playwright install webkit`.

Benefits:
- Catches Safari-specific issues with `<dialog>`, `backdrop-filter`, `aspect-ratio`, GSAP timer drift on macOS.
- Validates the lightbox dialog backdrop behavior on Safari (where some browsers handle backdrop click differently).

### 4.6 Bundle-size-guard tighten

Modify `.lighthouserc.json` line 23:

OLD: `"resource-summary:script:size": ["warn", { "maxNumericValue": 500000 }]`

NEW: `"resource-summary:script:size": ["error", { "maxNumericValue": 500000 }]`

Rationale: 500KB total script size is a soft cap that has held; promoting to error gates regressions. If we hit it legitimately (e.g., adding a new feature), we tune the cap upward consciously.

Also tighten `total-blocking-time` from `warn 30000` to `warn 15000` (the current 30s limit was a placeholder; real thresholds for desktop are ~300ms-3s, 30s makes the warning useless).

## 5. CI integration

All Playwright tests already run via `pnpm test` (= `playwright test --grep-invert @visual`). New tests in `tests/e2e/json-ld.spec.ts`, `tests/e2e/seo-files.spec.ts`, `tests/i18n/key-parity.spec.ts` will be auto-discovered.

WebKit project change in `playwright.config.ts` automatically applies to all Playwright runs unless filtered.

Lhci tightened threshold automatically gates on every CI run.

Dependabot fires weekly via GitHub Actions, surfaces as PRs on the repo.

No new CI workflow files needed.

## 6. Risks & mitigations

- **WebKit-specific test failures.** Likely there are 1-2 Safari quirks we'll need to either fix or `test.skip(browserName === 'webkit', ...)`. Acceptable: the FIRST run will reveal them and we triage. If a flake is too gnarly, we can skip-with-comment and address in a follow-up.
- **i18n parity test catches existing inconsistencies.** Plausible: the Phase 6/7/8/9/11/12 mirroring may have drifted. If this test fails on first run, the fix is a prerequisite of this sprint — we'll catch + fix in the implementation. Treat as a feature not a bug.
- **JSON-LD test brittle to schema evolution.** Mitigation: assert STRUCTURE (presence of keys + types), not exact values. Future schema changes that ADD fields don't break the test; only REMOVALS do, which is the failure mode we want to catch.
- **Dependabot PR noise.** Limit to 5 open PRs per ecosystem (configurable). Manuel can dismiss / postpone individually.
- **CI time growth.** WebKit adds ~3-4 min. If total CI exceeds 30 min job timeout (already bumped in last PR), we'll need to either parallelize or drop a project. Current estimate: ~6 min Chromium + ~6 min WebKit + 5 min Lighthouse = ~17 min, within budget.

## 7. Sequencing & commit shape

6 commits in sequence — each small enough to review independently:
1. Dependabot config
2. JSON-LD test
3. Sitemap + robots tests
4. i18n key parity test (+ fix any drift it surfaces)
5. WebKit project + handle any Safari-specific failures
6. Lhci threshold tighten

Each commit builds on a green CI from the previous. Single PR at the end.

## 8. Done definition

- All 6 items committed per §7.
- `pnpm ci:local` passes (Chromium + WebKit, all new tests green, lhci asserts under tightened cap).
- New i18n parity test confirms 4 locales have identical key sets.
- Dependabot config validated (GitHub renders it without errors on push).
- Branch pushed, PR opened.
