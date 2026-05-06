# Tests & Safety Sprint A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 6 defensive coverage items — Dependabot, JSON-LD validation, Sitemap+robots tests, i18n key-parity, WebKit cross-browser project, Lhci size guard tightening — that close the bug-classes the post-launch sprint surfaced via manual review.

**Architecture:** Six discrete commits, each independently reviewable. New Playwright test files live next to existing ones (`tests/e2e/*` + a new `tests/i18n/` folder). One CI workflow file change adds the WebKit browser install.

**Tech Stack:** Playwright (existing), GitHub Dependabot, Lighthouse CI, Node `fs`/`JSON.parse`, `xmldom` parsing via Playwright's `request` API.

**Spec:** `docs/superpowers/specs/2026-05-06-tests-safety-sprint-a-design.md`

**Branch:** `feat/tests-safety-audit` (already created off `main`, spec committed at `f78e7c8`).

---

## Pre-flight notes (verified during planning)

- `playwright.config.ts` currently has only `chromium`. Adding `webkit` is a 4-line additions to the `projects` array.
- `pnpm test` script is `playwright test --grep-invert @visual` — all projects run by default. No filter needed.
- CI workflow `.github/workflows/ci.yml:51` runs `pnpm exec playwright install --with-deps chromium`. Must be extended to install WebKit too: `chromium webkit`.
- `src/app/robots.ts` emits `disallow: ["/playground/*", "/_next/", "/api/"]` for production. The test asserts NO `Disallow: /` (root) — playground/etc disallows are fine and intentional.
- `src/app/sitemap.ts` emits 4 locales × 3 static paths + 4 × 2 playground slugs = 20 url entries.
- `src/lib/seo/jsonLd.ts` exports `buildJsonLd(locale, description)` returning `[person, webSite]`. Person.image is an ImageObject (verified post-#11).
- `messages/{de,en,fr,it}.json` are confirmed structurally identical after the legal-audit + post-launch sprints — i18n key-parity test should pass on first run, but ANY drift will catch in this commit.

## File Structure

**Created:**
- `.github/dependabot.yml`
- `tests/e2e/json-ld.spec.ts`
- `tests/e2e/seo-files.spec.ts`
- `tests/i18n/key-parity.spec.ts`

**Modified:**
- `playwright.config.ts` (add WebKit project)
- `.github/workflows/ci.yml` (extend Playwright install command)
- `.lighthouserc.json` (tighten thresholds)

---

### Task 1: Dependabot config

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Write the config**

Content of `.github/dependabot.yml`:

```yaml
# https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file

version: 2
updates:
  # npm dependencies — weekly grouped minor/patch updates, manual review on majors.
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "Europe/Zurich"
    open-pull-requests-limit: 5
    groups:
      npm-minor-patch:
        update-types:
          - "minor"
          - "patch"
    labels:
      - "deps"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"

  # GitHub Actions versions — weekly, all updates grouped (low frequency anyway).
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "Europe/Zurich"
    open-pull-requests-limit: 3
    labels:
      - "deps"
      - "ci"
    commit-message:
      prefix: "chore(ci)"
```

- [ ] **Step 2: Validate config syntax**

GitHub validates the config on push (renders an error in the repo's "Insights → Dependency graph → Dependabot" tab if invalid). To pre-validate locally, run a quick YAML parse:

```bash
node -e "const yaml = require('js-yaml'); const fs = require('fs'); console.log('OK', Object.keys(yaml.load(fs.readFileSync('.github/dependabot.yml', 'utf8'))));"
```

Expected: `OK [ 'version', 'updates' ]`. If `js-yaml` isn't installed (it might be a transitive dep), skip and rely on GitHub-side validation.

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "$(cat <<'EOF'
chore / ci : Add Dependabot config — weekly grouped npm + actions PRs

- npm: weekly Monday 06:00 Europe/Zurich, minor + patch grouped
  into one PR; majors stay individual for manual breaking-change
  review. Cap 5 open PRs.
- github-actions: weekly, all updates grouped, cap 3 open PRs.
- commit-message prefix chore(deps) / chore(ci) so they sort
  cleanly in the log.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: JSON-LD schema validation test

**Files:**
- Create: `tests/e2e/json-ld.spec.ts`

- [ ] **Step 1: Write the test**

Content of `tests/e2e/json-ld.spec.ts`:

```ts
// tests/e2e/json-ld.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Schema-validation guard for the JSON-LD output of `src/lib/seo/jsonLd.ts`.
 * Catches accidental regression of the Person.image upgrade (back to
 * a plain icon-512.png URL string) and missing required fields. Only
 * asserts STRUCTURE — additions to the schema don't break the test.
 */

const LOCALES = ["de", "en", "fr", "it"] as const;

test.describe("@seo JSON-LD schema validation", () => {
  for (const locale of LOCALES) {
    test(`/${locale}/ emits a valid Person + WebSite array`, async ({ page }) => {
      await page.goto(`/${locale}/`);
      const scripts = page.locator('script[type="application/ld+json"]');
      await expect(scripts).toHaveCount(1);
      const raw = await scripts.first().textContent();
      expect(raw, "JSON-LD script tag must have content").toBeTruthy();
      const parsed = JSON.parse(raw ?? "[]") as unknown;
      expect(Array.isArray(parsed), "JSON-LD must be an array").toBe(true);
      const arr = parsed as Array<Record<string, unknown>>;
      expect(arr.length, "expected exactly 2 entries (Person + WebSite)").toBe(2);

      const person = arr.find((o) => o["@type"] === "Person");
      const webSite = arr.find((o) => o["@type"] === "WebSite");
      expect(person, "Person entry must exist").toBeDefined();
      expect(webSite, "WebSite entry must exist").toBeDefined();

      // Person shape
      expect(person?.name, "Person.name").toBeTruthy();
      expect(person?.url, "Person.url").toBeTruthy();
      const image = person?.image as Record<string, unknown> | undefined;
      expect(image, "Person.image must be present").toBeDefined();
      expect(image?.["@type"], "Person.image must be an ImageObject").toBe("ImageObject");
      expect(image?.contentUrl, "ImageObject.contentUrl").toBeTruthy();
      expect(image?.creator, "ImageObject.creator").toBeDefined();
      expect(image?.copyrightHolder, "ImageObject.copyrightHolder").toBeDefined();
      expect(Array.isArray(person?.sameAs), "Person.sameAs must be an array").toBe(true);
      expect((person?.sameAs as unknown[]).length, "Person.sameAs non-empty").toBeGreaterThan(0);

      // WebSite shape
      expect(webSite?.name, "WebSite.name").toBeTruthy();
      expect(webSite?.url, "WebSite.url").toBeTruthy();
      expect(webSite?.inLanguage, `WebSite.inLanguage === ${locale}`).toBe(locale);
      const author = webSite?.author as Record<string, unknown> | undefined;
      expect(author?.["@type"], "WebSite.author is a Person").toBe("Person");
      expect(author?.name, "WebSite.author.name").toBeTruthy();
    });
  }
});
```

- [ ] **Step 2: Run the test, verify all 4 pass**

```
pnpm exec playwright test tests/e2e/json-ld.spec.ts --reporter=list
```

Expected: `4 passed`. If a locale fails, inspect the JSON-LD output via `view-source:http://localhost:3000/<locale>/` and diagnose; do not regress the test.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/json-ld.spec.ts
git commit -m "$(cat <<'EOF'
test / seo : Add JSON-LD schema validation across 4 locales

- Asserts STRUCTURE not values: Person + WebSite array, Person.image
  is an ImageObject (catches regression of the f15ec0b upgrade),
  ImageObject has contentUrl + creator + copyrightHolder, sameAs is
  non-empty, WebSite.inLanguage matches locale, WebSite.author is a
  nested Person.
- Future field additions to jsonLd.ts won't break the test; only
  REMOVALS will, which is the failure mode we want to catch.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Sitemap + robots.txt validity tests

**Files:**
- Create: `tests/e2e/seo-files.spec.ts`

- [ ] **Step 1: Write the tests**

Content of `tests/e2e/seo-files.spec.ts`:

```ts
// tests/e2e/seo-files.spec.ts
import { expect, test } from "@playwright/test";

/**
 * Validity + canonical-URL guards for the static SEO files emitted
 * by Next.js metadata API at build time.
 */

test.describe("@seo sitemap.xml", () => {
  test("returns 200, parses as valid XML, has urlset + entries", async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/sitemap.xml`);
    expect(response.status(), "HTTP status").toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType.toLowerCase()).toContain("xml");
    const body = await response.text();
    // Root element + sitemap-protocol namespace
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    // At least one <url><loc> entry — sitemap.ts emits 20 entries
    // (4 locales × 3 static paths + 4 × 2 playground slugs).
    const locMatches = body.match(/<loc>/g) ?? [];
    expect(locMatches.length, "<loc> count").toBeGreaterThanOrEqual(20);
    // hreflang alternates emitted via xhtml:link rel="alternate"
    expect(body).toContain("xhtml:link");
    expect(body).toContain('rel="alternate"');
  });
});

test.describe("@seo robots.txt", () => {
  test("returns 200, has User-agent + Sitemap, no full-site Disallow", async ({
    request,
    baseURL,
  }) => {
    const response = await request.get(`${baseURL}/robots.txt`);
    expect(response.status(), "HTTP status").toBe(200);
    const body = await response.text();
    expect(body, "must contain User-agent: *").toMatch(/User-agent:\s*\*/);
    expect(body, "must point at sitemap.xml").toMatch(/Sitemap:\s*\S*sitemap\.xml/);
    // Allow line-wrapped Disallow paths but reject "Disallow: /"
    // alone (would deindex everything). robots.ts emits
    // disallow: ["/playground/*", "/_next/", "/api/"] which is fine.
    const disallowAll = /^Disallow:\s*\/\s*$/m.test(body);
    expect(disallowAll, "must NOT have Disallow: / (full-site deindex)").toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests**

```
pnpm exec playwright test tests/e2e/seo-files.spec.ts --reporter=list
```

Expected: `2 passed`.

If the sitemap test fails because of the URL count assertion: count `<loc>` matches in the actual response and adjust the threshold downward, but only if the failure makes sense (e.g., a route was intentionally removed). Don't relax the threshold to mask a regression.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/seo-files.spec.ts
git commit -m "$(cat <<'EOF'
test / seo : Add sitemap.xml + robots.txt validity guards

- sitemap.xml: 200, xml content-type, urlset namespace, >=20 <loc>
  entries, hreflang alternates emitted via xhtml:link
- robots.txt: 200, User-agent: *, Sitemap pointer present, no
  full-site Disallow (the playground/_next/api disallows are
  intentional and pass)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: i18n key-parity test

**Files:**
- Create: `tests/i18n/key-parity.spec.ts`

- [ ] **Step 1: Write the test**

Content of `tests/i18n/key-parity.spec.ts`:

```ts
// tests/i18n/key-parity.spec.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Asserts all 4 locale message catalogs share the EXACT same key
 * structure. Catches missed/typo'd keys before next-intl throws at
 * runtime ("MISSING_TRANSLATION: …"). Only compares paths, never
 * values — the project intentionally mirrors DE content across
 * locales until the proper translation pass.
 *
 * Runs as a node-only Playwright test (no browser; testInfo + page
 * fixtures unused). Playwright can run pure-node assertions just
 * fine via `test.describe` + `expect`.
 */

const LOCALES = ["de", "en", "fr", "it"] as const;
const ROOT = resolve(__dirname, "..", "..");

function flatten(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  if (Array.isArray(obj)) {
    // For arrays, the relevant "key shape" is the array's element
    // structure. Take the FIRST element as canonical and walk it.
    // Mirrored arrays may have different lengths in legitimate cases
    // (e.g. an array of strings of different counts), but the
    // structural shape per element should match. Simplification: only
    // walk the first element; if it's primitive, the array is leaf.
    if (obj.length === 0) return [prefix];
    return flatten(obj[0], `${prefix}[]`);
  }
  return Object.keys(obj as Record<string, unknown>)
    .flatMap((k) => flatten((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k))
    .sort();
}

function loadFlatKeys(locale: string): Set<string> {
  const path = resolve(ROOT, "messages", `${locale}.json`);
  const json = JSON.parse(readFileSync(path, "utf-8"));
  return new Set(flatten(json));
}

test.describe("@i18n key parity across locales", () => {
  test("DE / EN / FR / IT have identical key sets", () => {
    const sets = LOCALES.map((l) => ({ locale: l, keys: loadFlatKeys(l) }));
    const reference = sets[0];
    if (!reference) throw new Error("no locales loaded");
    for (const { locale, keys } of sets.slice(1)) {
      const missingInTarget = [...reference.keys].filter((k) => !keys.has(k));
      const extraInTarget = [...keys].filter((k) => !reference.keys.has(k));
      expect(
        { locale, missingInTarget, extraInTarget },
        `${locale} key drift vs ${reference.locale}`,
      ).toEqual({ locale, missingInTarget: [], extraInTarget: [] });
    }
  });
});
```

- [ ] **Step 2: Run the test, expect green**

```
pnpm exec playwright test tests/i18n/key-parity.spec.ts --reporter=list
```

Expected: `1 passed`. If it FAILS:
- The error output will show exactly which keys are missing or extra in which locale.
- DO NOT relax the test. Instead, sync the missing/extra keys across all 4 locales (mirror DE, per the project translation pattern). Re-run until green, then proceed.

- [ ] **Step 3: Commit**

```bash
git add tests/i18n/key-parity.spec.ts
git commit -m "$(cat <<'EOF'
test / i18n : Add locale key-parity assertion (DE/EN/FR/IT)

- Reads messages/{de,en,fr,it}.json, flattens each into a set of
  dotted key paths, asserts all 4 sets are identical.
- Catches missed/typo'd keys before next-intl throws at runtime.
- Compares STRUCTURE only, never values — the DE-mirrored content
  pattern is intentional and not a violation.
- Critical defensive net for the upcoming translation sprint.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: WebKit cross-browser project + CI install

**Files:**
- Modify: `playwright.config.ts`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add WebKit project to playwright.config.ts**

Find the existing `projects` array (~line 35-40):

OLD:
```ts
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
```

NEW:
```ts
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
```

- [ ] **Step 2: Extend the CI Playwright install command**

In `.github/workflows/ci.yml`, find:

```yaml
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
```

Replace with:

```yaml
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium webkit
```

- [ ] **Step 3: Install WebKit locally + run the suite**

```
pnpm exec playwright install --with-deps webkit
pnpm test
```

Expected: all existing tests pass on chromium AND webkit. Total CI time roughly doubles for the test step (was ~3 min, now ~6 min).

If a test fails ONLY on webkit, that's a real Safari issue. Two paths:
1. **Fix the underlying issue** (preferred — Safari quirks usually have CSS / JS workarounds).
2. **Skip the test on webkit explicitly** as a last resort:
   ```ts
   test("...", async ({ page, browserName }) => {
     test.skip(browserName === "webkit", "Safari-specific quirk: <reason>");
     // ...
   });
   ```
   Document the skip with a clear reason in the comment so future readers know it's intentional.

Do NOT silently skip or weaken assertions. Either fix or document.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
test / cross-browser : Add WebKit (Safari) project to Playwright

- playwright.config.ts: add second project using Desktop Safari
  device. All existing tests now run on both chromium and webkit.
- ci.yml: extend Playwright install to include WebKit binary
  (--with-deps chromium webkit).

WebKit catches macOS/iOS Safari-specific issues with <dialog>,
backdrop-filter, aspect-ratio, and GSAP timer drift that Chromium
masks. Firefox skipped as engine-similar to Chromium for our
use cases.

If a test fails only on webkit, fix the underlying issue rather
than test.skip()-ing without rationale.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Lhci threshold tightening

**Files:**
- Modify: `.lighthouserc.json`

- [ ] **Step 1: Tighten the size + TBT thresholds**

In `.lighthouserc.json`, find the `assert.assertions` block:

OLD:
```json
        "total-blocking-time": ["warn", { "maxNumericValue": 30000 }],
        "resource-summary:script:size": ["warn", { "maxNumericValue": 500000 }]
```

NEW:
```json
        "total-blocking-time": ["warn", { "maxNumericValue": 15000 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 500000 }]
```

Two changes:
- `resource-summary:script:size` severity `warn` → `error`. Hard-gates against bundle bloat. Cap stays at 500KB; if a feature legitimately exceeds, we tune the cap upward consciously.
- `total-blocking-time` cap `30000` → `15000` (keeps `warn` severity). 30s was a placeholder; 15s is still loose enough for the always-on-FluidSim hero (which legitimately produces 5-10s of TBT) but tight enough to flag if it doubles.

- [ ] **Step 2: Run pnpm lighthouse locally to verify the assertions pass**

The lighthouse step needs the prod build. Two options:
1. Skip local verification, rely on CI to gate.
2. Run `pnpm build && pnpm lighthouse` locally (slower, takes ~5 min on Windows).

Pick (1) unless you're worried about an assertion blowing up CI; in that case (2) gives you a chance to tune.

- [ ] **Step 3: Commit**

```bash
git add .lighthouserc.json
git commit -m "$(cat <<'EOF'
ci / lighthouse : Tighten script-size guard + TBT threshold

- resource-summary:script:size: warn -> error at 500KB. Hard-gates
  bundle bloat. If a feature legitimately exceeds the cap, raise
  it consciously rather than ignoring a soft warning.
- total-blocking-time: warn cap 30000 -> 15000. The 30s value was
  a placeholder; 15s is still loose enough for the always-on
  hero FluidSim's legitimate TBT but flags 2x regressions.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Final CI gate + push

**Files:** none

- [ ] **Step 1: Run pnpm ci:local end-to-end**

```
pnpm ci:local
```

Expected: lint + typecheck + build + Playwright (chromium + webkit, including 3 new test files) all pass. Lhci doesn't run in `ci:local`; the WebKit + new-test additions are what we're verifying here.

If anything fails: triage. Most likely a WebKit-specific failure in an existing test — fix or skip-with-reason per Task 5 Step 3.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/tests-safety-audit
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat(tests): tests-safety sprint A — 6 defensive coverage items" --body "$(cat <<'EOF'
## Summary

Sprint A from the tests/safety audit — 6 discrete defensive items, each on its own commit.

- ✅ Dependabot config (weekly grouped npm + actions PRs)
- ✅ JSON-LD schema validation test (Person + WebSite + ImageObject across 4 locales)
- ✅ Sitemap.xml + robots.txt validity tests
- ✅ i18n key-parity test (DE/EN/FR/IT key sets must match exactly)
- ✅ WebKit (Safari) cross-browser project + CI install
- ✅ Lhci script-size guard \`warn 500KB\` -> \`error 500KB\`; TBT cap 30s -> 15s

Spec: \`docs/superpowers/specs/2026-05-06-tests-safety-sprint-a-design.md\`
Plan: \`docs/superpowers/plans/2026-05-06-tests-safety-sprint-a.md\`

Sprint B (multi-viewport visual regression, mobile-touch, comprehensive keyboard nav) and Sprint C (perf optimization + lhci perf-floor tightening) explicitly deferred.

## Test plan

- [x] \`pnpm ci:local\` green (chromium + webkit + new tests)
- [x] WebKit binary installs via updated CI workflow
- [x] Dependabot config validates as YAML
- [x] All 4 locales pass JSON-LD shape check + i18n key-parity assertion

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review checklist

- [x] **Spec coverage:** All 6 in-scope items map 1:1 to Tasks 1-6. Task 7 is the CI/PR-shipping wrap.
- [x] **Placeholder scan:** No "TBD"/"TODO"/"implement later". Code blocks complete.
- [x] **Type consistency:** No types defined inline. The flatten() helper in Task 4 is fully self-contained.
- [x] **No-placeholder Scope-creep guard:** Spec §3 (out-of-scope) is honored; no Sprint B/C work leaks into the plan.
