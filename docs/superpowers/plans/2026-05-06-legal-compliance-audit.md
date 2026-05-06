# Legal Compliance Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Impressum + Datenschutz to a defensive Swiss-law-compliant state, fix the factual mismatches with deployment reality, and uplift the footer's visual presence so visitors actually find the legal links.

**Architecture:** Pure content + styling work. No new components, no new routes, no new dependencies. Footer.tsx gets a paper-shade background band + inline legal-links with full contrast; Photography.tsx renames its semantic `<footer>` CTA wrapper to `<div>` to remove the two-footers confusion; the four locale message files get content rewrites in `legal.impressum` + `legal.datenschutz` namespaces.

**Tech Stack:** React 19 / TypeScript, Tailwind v4 with custom-property design tokens, next-intl message catalogs.

**Spec:** `docs/superpowers/specs/2026-05-06-legal-compliance-audit-design.md`

**Branch:** `feat/post-launch-hardening` (continues; this is post-launch item #2 of the original list).

**Address-of-record (per user 2026-05-06):** Martisackerweg 18, 4203 Grellingen, Schweiz.

---

## File Structure

**Modified:**
- `src/components/ui/Footer.tsx` — bg-paper-shade band, py-12, inline legal-links, full-contrast underline
- `src/components/sections/Photography.tsx` — internal `<footer>` CTA wrapper renamed to `<div>` (1-character change)
- `messages/de.json` — `legal.impressum.sections` + `legal.datenschutz.sections` rewrites + `legal.common.lastUpdated` date bump
- `messages/en.json`, `messages/fr.json`, `messages/it.json` — mirror DE per project pattern

**No tests created.** This is content + visual work. Existing axe-a11y test catches contrast regressions in the Footer; existing Playwright smoke + visual baseline catch unexpected layout shifts; the legal-content changes are pure data with no testable behaviour beyond "page renders without errors".

---

### Task 1: Footer visibility uplift (PRIMARY)

**Files:**
- Modify: `src/components/ui/Footer.tsx`

**Why first:** Per Manuel's review, the actual perception bug is "no footer visible after Section 07 Contact". DOM verification shows it renders; the issue is visual subtlety (same `bg-paper`, low-contrast muted text, separated legal-links row). Without this fix the rest of the audit is academic — the legal pages won't be reached.

- [ ] **Step 1: Replace the entire Footer body**

In `src/components/ui/Footer.tsx`, replace the entire `return (...)` block.

OLD (lines 37-77):

```tsx
  return (
    <footer className="border-paper-line border-t bg-paper">
      <div className="container-page flex flex-col gap-6 py-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="type-label text-ink-muted">
            © Manuel Heller
            <span aria-hidden="true"> · </span>
            {t("location")}
            <span aria-hidden="true"> · </span>
            {t("year")}
          </p>

          <ul aria-label={t("socialAriaLabel")} className="flex items-center gap-2.5">
            {SOCIAL_STAMPS.map((stamp) => (
              <li key={stamp.key}>
                <abbr className="type-label-stamp no-underline" title={t(`social.${stamp.key}`)}>
                  {stamp.label}
                </abbr>
              </li>
            ))}
          </ul>
        </div>

        <ul
          aria-label={t("legalAriaLabel")}
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          {LEGAL_LINKS.map((link) => (
            <li key={link.key}>
              <Link
                href={link.href}
                className="type-label text-ink-muted no-underline transition-colors hover:text-ink"
              >
                {tNav(link.key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
```

NEW:

```tsx
  return (
    <footer className="border-paper-line border-t-2 bg-paper-shade">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
        <p className="type-label text-ink-muted">
          © Manuel Heller
          <span aria-hidden="true"> · </span>
          {t("location")}
          <span aria-hidden="true"> · </span>
          {t("year")}
          <span aria-hidden="true" className="mx-3">·</span>
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.key}>
              {i > 0 ? <span aria-hidden="true"> · </span> : null}
              <Link
                href={link.href}
                className="text-ink underline decoration-ink-soft underline-offset-2 transition-colors hover:decoration-ink"
                aria-label={tNav(link.key)}
              >
                {tNav(link.key)}
              </Link>
            </span>
          ))}
        </p>

        <ul aria-label={t("socialAriaLabel")} className="flex items-center gap-2.5">
          {SOCIAL_STAMPS.map((stamp) => (
            <li key={stamp.key}>
              <abbr className="type-label-stamp no-underline" title={t(`social.${stamp.key}`)}>
                {stamp.label}
              </abbr>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
```

**Changes summary:**
- `bg-paper` → `bg-paper-shade` — distinct horizontal band
- `border-t` → `border-t-2` — slightly stronger divider (2px)
- `py-8` → `py-12` — taller band (≈ 96px vs 64px)
- Outer wrapper collapsed: copyright + legal-links + social all on one row at desktop, stacked on mobile (`flex flex-col md:flex-row`)
- Legal-links INLINE with copyright, separated by ` · ` glyphs
- Legal-links: `text-ink-muted` → `text-ink` + `underline decoration-ink-soft underline-offset-2 hover:decoration-ink` (full contrast, visible link affordance)
- The `aria-label={t("legalAriaLabel")}` on the previous `<ul>` is preserved via per-link `aria-label={tNav(link.key)}` — each link still has its own accessible name. The list-level aria is not needed because two inline links don't constitute a navigation list.

- [ ] **Step 2: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/ui/Footer.tsx`

Expected: no errors.

- [ ] **Step 3: Manual visual sanity check (recommended)**

Run `pnpm dev`, navigate to `http://localhost:3000/de/`, scroll all the way down. Verify:
- Footer is visible as a distinct paper-shade band, ≈ 96px tall
- Single line at desktop containing: `© Manuel Heller · Basel-Region · MMXXVI · Impressum · Datenschutz` plus social abbrs on the right
- Impressum + Datenschutz are full-contrast underlined links
- Mobile (DevTools resize to ≤ 768px): two stacked rows (copyright+legal on top, social abbrs below), still readable

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Footer.tsx
git commit -m "$(cat <<'EOF'
fix / footer : Distinct paper-shade band + inline legal-links full-contrast

- Footer now reads as a clear end-of-page band: bg-paper-shade vs the
  page's bg-paper, border-t-2 divider, py-12 height (~96px). Previously
  the same bg-paper as the Contact section above it made it visually
  invisible despite rendering correctly in the DOM
- Legal-links (Impressum + Datenschutz) inline with the © copyright
  line instead of a separate row below the socials, which read as
  decoration most users skipped
- Legal-link styling: text-ink + underline + decoration-ink-soft so
  they're recognisable as links, not just muted small-caps text
- No nav-level legal links per Manuel: the footer is the canonical
  surface, just not invisible anymore

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Photography internal `<footer>` → `<div>` rename

**Files:**
- Modify: `src/components/sections/Photography.tsx:330` and corresponding closing tag

**Why:** A `<footer>` element inside the Photography section's CTA block is semantically valid for "section footer", but the document ends up with two `<footer>` elements (Photography internal + the layout-level one). Visitors and tooling that look for "the footer" find the internal one and assume the bottom-of-page footer doesn't exist. Plain `<div>` carries the same layout semantics with no contentinfo confusion.

- [ ] **Step 1: Apply the rename**

In `src/components/sections/Photography.tsx`, find the existing `<footer>` element at line ~330:

OLD:
```tsx
      <footer className="container-page grid-12 mt-20 gap-y-4 md:mt-28">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
          <a
            href={t("ctaHref")}
            ...
          </a>
          {t("ctaCaption") ? (
            <p className="mt-3 type-body-sm text-ink-muted">{t("ctaCaption")}</p>
          ) : null}
        </div>
      </footer>
    </section>
```

NEW:
```tsx
      <div className="container-page grid-12 mt-20 gap-y-4 md:mt-28">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
          <a
            href={t("ctaHref")}
            ...
          </a>
          {t("ctaCaption") ? (
            <p className="mt-3 type-body-sm text-ink-muted">{t("ctaCaption")}</p>
          ) : null}
        </div>
      </div>
    </section>
```

(Two characters change: opening `<footer` → `<div` and closing `</footer>` → `</div>`. The CTA `<a>` and conditional caption inside stay byte-identical.)

- [ ] **Step 2: Build typecheck + lint**

Run: `pnpm typecheck && pnpm lint src/components/sections/Photography.tsx`

Expected: no errors.

- [ ] **Step 3: Verify only one `<footer>` element on the rendered page**

If you have `pnpm dev` running, navigate to `/de/` and run in DevTools console:
```js
document.querySelectorAll("footer").length
```
Expected: `1`. (Previously: 2.)

This is optional — Task 6 covers this via the existing Playwright smoke pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Photography.tsx
git commit -m "$(cat <<'EOF'
fix / photography : Rename internal CTA footer to div

- The <footer> wrapper around the CTA block (Volles Portfolio link)
  was semantically fine but produced two <footer> elements in the
  document. Tools and visitors looking for "the footer" found the
  Photography internal one and assumed the layout-level one didn't
  exist. Plain <div> keeps layout semantics, removes the ambiguity.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Impressum content updates (DE source)

**Files:**
- Modify: `messages/de.json` — `legal.impressum.sections` array
- Modify: `messages/de.json` — `legal.common.lastUpdated`

- [ ] **Step 1: Update `legal.impressum.sections[0]` (responsible)**

Find the existing `responsible` section block in `messages/de.json`:

OLD:
```json
        {
          "id": "responsible",
          "heading": "Verantwortlich für den Inhalt",
          "body": ["Manuel Heller", "Basel-Region, Schweiz", "manuelheller@bluewin.ch"]
        },
```

NEW:
```json
        {
          "id": "responsible",
          "heading": "Verantwortlich für den Inhalt",
          "body": [
            "Manuel Heller",
            "Martisackerweg 18, 4203 Grellingen, Schweiz",
            "manuelheller@bluewin.ch"
          ]
        },
```

- [ ] **Step 2: Add a new `jurisdiction` section after `copyright`**

Find the existing `copyright` section (last in the impressum.sections array) and add a new `jurisdiction` section right after it. Make sure the comma between objects is correct.

OLD (the closing of the last object in `legal.impressum.sections`):
```json
        {
          "id": "copyright",
          "heading": "Urheberrecht",
          "body": [
            "Alle Texte, Fotos, Grafiken, Code-Beispiele und Shader-Quelltexte unterliegen dem Urheberrecht von Manuel Heller, sofern nicht anders gekennzeichnet. Eine Verwendung ausserhalb dieser Website bedarf der schriftlichen Zustimmung."
          ]
        }
      ]
    },
```

NEW:
```json
        {
          "id": "copyright",
          "heading": "Urheberrecht",
          "body": [
            "Alle Texte, Fotos, Grafiken, Code-Beispiele und Shader-Quelltexte unterliegen dem Urheberrecht von Manuel Heller, sofern nicht anders gekennzeichnet. Eine Verwendung ausserhalb dieser Website bedarf der schriftlichen Zustimmung."
          ]
        },
        {
          "id": "jurisdiction",
          "heading": "Gerichtsstand",
          "body": [
            "Schweizer Recht ist anwendbar. Erfüllungsort und Gerichtsstand ist Basel-Stadt, Schweiz."
          ]
        }
      ]
    },
```

- [ ] **Step 3: Bump `legal.common.lastUpdated`**

Find:
```json
    "common": {
      "lastUpdatedLabel": "Stand",
      "lastUpdated": "1. Mai 2026",
      "backLabel": "Zurück zur Startseite"
    },
```

Replace `"1. Mai 2026"` with `"6. Mai 2026"`.

- [ ] **Step 4: Verify JSON is valid**

Run: `pnpm typecheck`

Expected: pass. (next-intl compiles the catalog at build time and would fail loudly on broken JSON.)

- [ ] **Step 5: Commit**

```bash
git add messages/de.json
git commit -m "$(cat <<'EOF'
chore / legal : Impressum content - full address + jurisdiction + Stand bump (DE)

- responsible.body: add Martisackerweg 18, 4203 Grellingen full
  postal address (per Manuel's 2026-05-06 decision; max-defensive
  DSGVO Art. 13 controller-identity; home address publicly visible
  trade-off accepted)
- New jurisdiction section: Schweizer Recht, Gerichtsstand Basel-Stadt
- legal.common.lastUpdated: 1. Mai 2026 -> 6. Mai 2026

EN/FR/IT mirror lands in Task 5.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Datenschutz content updates (DE source)

**Files:**
- Modify: `messages/de.json` — `legal.datenschutz.sections` array

This task makes the datenschutz copy match deployment reality + lift it to defensive compliance. Six existing sections get rewritten + two new sections added (`externalLinks`, `security`).

- [ ] **Step 1: Update `responsible`**

Find:
```json
        {
          "id": "responsible",
          "heading": "Verantwortlicher",
          "body": ["Manuel Heller, Basel-Region, Schweiz · manuelheller@bluewin.ch"]
        },
```

Replace with:
```json
        {
          "id": "responsible",
          "heading": "Verantwortlicher",
          "body": ["Manuel Heller, Martisackerweg 18, 4203 Grellingen, Schweiz · manuelheller@bluewin.ch"]
        },
```

- [ ] **Step 2: Update `data` (add localStorage disclosure)**

Find:
```json
        {
          "id": "data",
          "heading": "Welche Daten erhoben werden",
          "body": [
            "Diese Website setzt keine Cookies und keinen LocalStorage. Es gibt kein Tracking, kein Analytics, keine Werbenetzwerke und keine Social-Media-Pixel. Es werden keine Daten an Dritte zu Werbezwecken weitergegeben."
          ]
        },
```

Replace with:
```json
        {
          "id": "data",
          "heading": "Welche Daten erhoben werden",
          "body": [
            "Diese Website setzt keine Cookies. Es gibt kein Tracking, kein Analytics, keine Werbenetzwerke und keine Social-Media-Pixel. Es werden keine Daten an Dritte zu Werbezwecken weitergegeben.",
            "Aus rein technischen Gründen wird der LocalStorage des Browsers genutzt: ein anonymer Eintrag merkt sich die GPU-Leistungsklasse deines Geräts (damit die WebGL-Animation beim nächsten Besuch direkt im richtigen Detail-Level startet) und ein Eintrag merkt sich, dass der Lade-Bildschirm bereits gespielt wurde (damit er bei Wechsel der Sprache nicht erneut erscheint). Diese Werte sind nicht personenbezogen, werden nicht an Dritte übermittelt und können jederzeit über die Browser-Einstellungen gelöscht werden."
          ]
        },
```

- [ ] **Step 3: Update `logs` (fix hosting country, add Cloudflare + SCC)**

Find:
```json
        {
          "id": "logs",
          "heading": "Server-Logs",
          "body": [
            "Der Hosting-Server (Linux mit nginx, eigenes Hosting in der Schweiz) protokolliert technisch notwendige Zugriffe: IP-Adresse, Zeitstempel, abgerufene URL, Referrer, User-Agent. Diese Logs werden nach 14 Tagen automatisch gelöscht und ausschliesslich zur Fehleranalyse und Sicherheitsüberwachung verwendet."
          ]
        },
```

Replace with:
```json
        {
          "id": "logs",
          "heading": "Server-Logs",
          "body": [
            "Der Hosting-Server (Linux mit nginx) wird selbst betrieben und steht beim Anbieter mc-host24.de in Deutschland. Die DNS-Auflösung läuft über Cloudflare (Cloudflare, Inc., USA), das gleichzeitig als Proxy-Schutz vor Bot-Angriffen dient — dabei werden IP-Adressen technisch verarbeitet, jedoch nicht zu Tracking-Zwecken gespeichert. Der Server protokolliert technisch notwendige Zugriffe: IP-Adresse, Zeitstempel, abgerufene URL, Referrer, User-Agent. Diese Logs werden nach 14 Tagen automatisch gelöscht und ausschliesslich zur Fehleranalyse und Sicherheitsüberwachung verwendet (Rechtsgrundlage: berechtigtes Interesse, DSGVO Art. 6 Abs. 1 lit. f, sowie Art. 31 Abs. 2 lit. b DSG).",
            "Cloudflare ist über Standard-Vertragsklauseln (Art. 46 DSGVO) für Datentransfers in die USA abgesichert."
          ]
        },
```

- [ ] **Step 4: Update `form` (option iii — forward-compatible Resend wording)**

Find:
```json
        {
          "id": "form",
          "heading": "Kontaktformular",
          "body": [
            "Wenn du das Kontaktformular nutzt, werden Name, E-Mail-Adresse und deine Nachricht via Resend (Resend.com, USA) an mich übermittelt. Resend speichert diese Daten zur technischen Übermittlung; es gelten deren Datenschutzbestimmungen.",
            "Deine Nachricht wird nach Beantwortung gelöscht, spätestens nach sechs Monaten. Du kannst jederzeit Auskunft, Berichtigung oder Löschung verlangen — schreib einfach an manuelheller@bluewin.ch."
          ]
        },
```

Replace with:
```json
        {
          "id": "form",
          "heading": "Kontaktformular",
          "body": [
            "Bei Nutzung des Kontaktformulars wird aktuell der mailto-Mechanismus deines E-Mail-Clients aktiviert — die Nachricht läuft über deinen E-Mail-Provider, nicht über einen Server unter meiner Kontrolle. Dabei werden ausschliesslich die Daten verarbeitet, die du selbst in deinem Mail-Client eingibst.",
            "Sollte zu einem späteren Zeitpunkt eine direkte Übermittlung über einen Server-Bridge (Resend.com, Resend, Inc., USA) aktiviert werden, würden Name, E-Mail-Adresse und Nachricht über diesen technischen Mittler an mich übermittelt. Resend wäre über Standard-Vertragsklauseln (Art. 46 DSGVO) abgesichert. Eine entsprechende Anpassung dieser Erklärung erfolgt mit Aktivierung.",
            "Rechtsgrundlage in beiden Fällen: deine Einwilligung durch das Absenden (Art. 6 Abs. 1 lit. a DSGVO, Art. 31 Abs. 1 DSG). Eingehende Nachrichten werden nach Beantwortung gelöscht, spätestens jedoch nach sechs Monaten. Du kannst jederzeit Auskunft, Berichtigung oder Löschung verlangen — schreib einfach an manuelheller@bluewin.ch."
          ]
        },
```

- [ ] **Step 5: Add new `externalLinks` section after `fonts`**

Find the existing `fonts` block:
```json
        {
          "id": "fonts",
          "heading": "Schriftarten",
          "body": [
            "Schriftarten (Instrument Serif, Inter, JetBrains Mono) werden lokal vom eigenen Server ausgeliefert. Es bestehen keine Verbindungen zu Google Fonts oder anderen Drittservern."
          ]
        },
```

Insert these TWO new sections immediately after it (before the existing `rights` section):

```json
        {
          "id": "externalLinks",
          "heading": "Externe Verlinkungen",
          "body": [
            "Diese Website verweist an mehreren Stellen auf externe Plattformen, deren Inhalte ich nicht beeinflussen oder kontrollieren kann. Beim Klick auf einen externen Link verlässt du diese Seite; ab dort gelten die Datenschutzbestimmungen des jeweiligen Anbieters.",
            "Aktuell verlinkte externe Dienste: GitHub (github.com), LinkedIn (linkedin.com), Instagram (instagram.com), Adobe Portfolio (manuelheller.myportfolio.com), Twitch (twitch.tv), Jogge di Balla (joggediballa.ch). Eine Liste der genauen Anbieter mit Sitzland kann jederzeit per E-Mail bei mir angefragt werden."
          ]
        },
        {
          "id": "security",
          "heading": "Datensicherheit",
          "body": [
            "Sämtliche Verbindungen zur Website werden über TLS 1.3 verschlüsselt. Der Server wird regelmässig aktualisiert und durch Cloudflare-Proxy gegen automatisierte Angriffe abgeschirmt. Diese Massnahmen entsprechen den Anforderungen aus DSGVO Art. 32 und DSG Art. 8."
          ]
        },
```

- [ ] **Step 6: Update `rights` (add Aufsichtsbehörde paragraph)**

Find:
```json
        {
          "id": "rights",
          "heading": "Deine Rechte",
          "body": [
            "Nach Schweizer Datenschutzgesetz (revDSG) und EU-DSGVO hast du das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenportabilität. Wende dich für alle Anfragen an: manuelheller@bluewin.ch."
          ]
        }
```

Replace with:
```json
        {
          "id": "rights",
          "heading": "Deine Rechte",
          "body": [
            "Nach Schweizer Datenschutzgesetz (revDSG) und EU-DSGVO hast du das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenportabilität. Wende dich für alle Anfragen an: manuelheller@bluewin.ch.",
            "Für Beschwerden über die Verarbeitung deiner Daten kannst du dich an die zuständige Aufsichtsbehörde wenden: in der Schweiz an den Eidgenössischen Datenschutzbeauftragten (EDÖB, https://www.edoeb.admin.ch); innerhalb der EU an die Datenschutzbehörde deines Wohnsitzlandes."
          ]
        }
```

- [ ] **Step 7: Verify JSON is valid**

Run: `pnpm typecheck && pnpm lint messages/de.json`

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add messages/de.json
git commit -m "$(cat <<'EOF'
chore / legal : Datenschutz content - hosting country fix + full compliance pass (DE)

- responsible.body: full Martisackerweg 18 / 4203 Grellingen address
- data: split into "no cookies" + new localStorage disclosure
  paragraph (GPU tier cache + loader cache, technically necessary,
  not personal data, deletable via browser settings)
- logs: hosting country corrected CH -> DE (mc-host24.de), new
  Cloudflare disclosure (proxy + DNS, USA, SCC-secured); legal
  basis cited (DSGVO Art. 6(1)(f) + DSG Art. 31(2)(b))
- form: option-iii forward-compat wording. Current text describes
  the actual mailto-fallback; future-tense paragraph covers Resend
  if/when the server-bridge ships. Legal basis Art. 6(1)(a) DSGVO
  + Art. 31(1) DSG explicit.
- new externalLinks section: GitHub/LinkedIn/Instagram/Adobe
  Portfolio/Twitch/joggediballa.ch listed; pointer to email for
  details
- new security section: TLS 1.3, regular updates, Cloudflare-proxy;
  DSGVO Art. 32 / DSG Art. 8 cited
- rights: Aufsichtsbehörde paragraph added (EDÖB CH + EU local DSB)

EN/FR/IT mirror lands in Task 5.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Mirror DE updates to EN/FR/IT

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/fr.json`
- Modify: `messages/it.json`

Per the Phase-6+ project pattern: DE is the source of truth for legal content; EN/FR/IT mirror the same German strings verbatim. Proper translation lands in a future i18n sprint.

The structure of the changes is identical to Tasks 3 and 4 — just applied to three more files.

- [ ] **Step 1: Apply Task 3 changes to `messages/en.json`**

Same edits as Task 3 Steps 1, 2, 3:
- `legal.impressum.sections[id=responsible].body` → 3-line array with full address
- New `legal.impressum.sections[id=jurisdiction]` appended after `copyright`
- `legal.common.lastUpdated` → `"6. Mai 2026"`

Use the EXACT same German strings (DE-mirror pattern).

- [ ] **Step 2: Apply Task 3 changes to `messages/fr.json`**

Same as Step 1. EXACT same German strings.

- [ ] **Step 3: Apply Task 3 changes to `messages/it.json`**

Same as Step 1. EXACT same German strings.

- [ ] **Step 4: Apply Task 4 changes to `messages/en.json`**

Same edits as Task 4 Steps 1-6:
- `legal.datenschutz.sections[id=responsible].body` updated
- `legal.datenschutz.sections[id=data].body` updated (2 paragraphs)
- `legal.datenschutz.sections[id=logs].body` updated (2 paragraphs)
- `legal.datenschutz.sections[id=form].body` updated (3 paragraphs)
- New `legal.datenschutz.sections[id=externalLinks]` and `[id=security]` after `fonts`
- `legal.datenschutz.sections[id=rights].body` extended (2 paragraphs)

Use EXACT same German strings.

- [ ] **Step 5: Apply Task 4 changes to `messages/fr.json`**

Same as Step 4. EXACT same German strings.

- [ ] **Step 6: Apply Task 4 changes to `messages/it.json`**

Same as Step 4. EXACT same German strings.

- [ ] **Step 7: Verify all three locales typecheck + lint**

Run: `pnpm typecheck && pnpm lint`

Expected: pass.

- [ ] **Step 8: Verify section count consistency across locales**

Run this sanity check (PowerShell-friendly via the Bash tool):

```bash
node -e "
['de','en','fr','it'].forEach(l => {
  const m = require(\`./messages/\${l}.json\`);
  console.log(l, 'impressum sections:', m.legal.impressum.sections.length, '(expect 5)');
  console.log(l, 'datenschutz sections:', m.legal.datenschutz.sections.length, '(expect 8)');
  console.log(l, 'lastUpdated:', m.legal.common.lastUpdated);
});
"
```

Expected: each locale shows `impressum sections: 5` (responsible, character, liability, copyright, jurisdiction) and `datenschutz sections: 8` (responsible, data, logs, form, fonts, externalLinks, security, rights). lastUpdated `"6. Mai 2026"` everywhere.

If any locale shows a different count, you missed an edit — check the diff against DE.

- [ ] **Step 9: Commit**

```bash
git add messages/en.json messages/fr.json messages/it.json
git commit -m "$(cat <<'EOF'
chore / legal : Mirror DE legal content updates to EN/FR/IT

Per project pattern (Phase 6+): DE source of truth, others mirrored
verbatim until a proper translation pass. Touched the same keys as
the previous two commits across all three locale files.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: CI gate + manual smoke handoff

**Files:** none (verification only)

- [ ] **Step 1: Run full local CI**

Run: `pnpm ci:local`

Expected: lint + typecheck + build + Playwright + axe all green.

If `tests/visual/baseline.spec.ts` flags pixel-diff in the Footer area, that's expected — the footer band is now visually distinct. Inspect the diff visually to confirm it's the intended change (paper-shade band, taller, inline links). If correct:

```bash
pnpm test:visual --update-snapshots
git add tests/visual/
git commit -m "$(cat <<'EOF'
test / legal : Update visual baseline after footer band uplift

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

If no visual diff fires, skip this step.

- [ ] **Step 2: Manual smoke (Manuel)**

Run `pnpm dev` and verify across viewports:
1. Scroll to bottom of `/de/`. Footer band is clearly visible (paper-shade darker than page bg). Impressum + Datenschutz inline with copyright, full-contrast underlined.
2. Click Impressum → `/de/impressum` opens. Check:
   - Section 1 ("Verantwortlich für den Inhalt") shows 3 lines: Manuel Heller, Martisackerweg 18, 4203 Grellingen, Schweiz, manuelheller@bluewin.ch
   - 5 sections total ending with new "Gerichtsstand"
   - Stand-Datum at the bottom: "Stand · 6. Mai 2026"
3. Back, click Datenschutz → `/de/datenschutz` opens. Check:
   - 8 sections total
   - data: 2 paragraphs (cookies-no + localStorage-yes-but-technical)
   - logs: 2 paragraphs (mc-host24.de + Cloudflare; SCC paragraph)
   - form: 3 paragraphs (mailto + future-Resend + legal-basis)
   - new externalLinks + security sections present
   - rights: 2 paragraphs (existing rights list + Aufsichtsbehörde EDÖB)
4. Confirm `/en/datenschutz` etc. show the German content (mirror pattern intentional).
5. Mobile viewport (≤ 768px): footer stacks correctly (copyright+legal on top, social abbrs below).

If any visual issue or content mismatch, report back to fix.

---

## Self-review checklist

- [x] **Spec coverage:**
  - §3.1 (modified files) → Tasks 1-5 hit exactly those files.
  - §4.1 responsible address → Task 3 Step 1.
  - §4.5 jurisdiction section → Task 3 Step 2.
  - §4.6 lastUpdated → Task 3 Step 3.
  - §5.1 responsible → Task 4 Step 1.
  - §5.2 data + localStorage → Task 4 Step 2.
  - §5.3 logs (hosting + Cloudflare + SCC) → Task 4 Step 3.
  - §5.4 form (option iii) → Task 4 Step 4.
  - §5.6 externalLinks → Task 4 Step 5.
  - §5.7 security → Task 4 Step 5.
  - §5.8 rights extension → Task 4 Step 6.
  - §6.1 footer paper-shade band → Task 1.
  - §6.2 footer inline legal-links → Task 1.
  - §6.3 Photography <footer> → <div> rename → Task 2.
  - §8 translation pattern → Task 5 (DE-mirror).
  - §10 done definition → Task 6.
- [x] **Placeholder scan:** no TBD/TODO/"implement later". Code blocks contain full edits with German content.
- [x] **Type consistency:** new section IDs (`jurisdiction`, `externalLinks`, `security`) match across the de.json edits and the EN/FR/IT mirror tasks. The `LegalDocument` component renders by iterating `sections.map((section) => ...)` — no per-ID code coupling, so adding sections is purely a data change. The `lastUpdated` key path `legal.common.lastUpdated` is consumed by `LegalDocument.tsx:71` (`tCommon("lastUpdated")`) — Task 3 Step 3 updates the same key.
