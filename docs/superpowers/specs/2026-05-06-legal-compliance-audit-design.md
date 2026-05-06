# Legal Compliance Audit — Design Spec (CH revDSG + EU DSGVO informational)

**Status:** Brainstormed and approved 2026-05-06. Ready for implementation plan.

**Goal:** Bring the site's Impressum + Datenschutzerklärung up to a defensive "lieber zu viel als zu wenig" Swiss-law-compliant state, fix factual mismatches with deployment reality, and improve visibility of the legal-links footer entry.

**Branch:** `feat/post-launch-hardening` (continues; this is post-launch item #2 of the original list).

**Spec date:** 2026-05-06

**Source-of-decisions:** the brainstorm-conversation in 2026-05-06 surfaced 14 audit items; user dropped points 11/12/13 (under-16 child-warning, honeypot disclosure, AGB) as overkill for a non-commercial portfolio. User accepted points 1-10 + 14, plus an emergent point 15 (footer link prominence) flagged during the discussion. User chose option (iii) on the Resend mismatch: write the privacy text as a fallback that covers the current mailto-only state AND the future Resend integration, so no copy change is needed when the server bridge ships.

---

## 1. Why

The current legal pages (`/[locale]/impressum`, `/[locale]/datenschutz`) were drafted in Phase 11. Two hard mismatches need fixing immediately (hosting country, contact-form behavior), one technical disclosure is missing (localStorage), and several "good practice" gaps lean toward best-defensive coverage. Plus the legal-links entry in the footer is buried below ~20,000px of scrolling and styled as muted decoration — which means visitors and (more importantly) regulators have a hard time finding it.

## 2. Scope (final after brainstorm)

| # | Item | Severity |
|---|---|---|
| 1 | Hosting country: CH → DE (`mc-host24.de`) | 🔴 critical (factually wrong) |
| 2 | Contact-form copy reflects mailto-fallback + future Resend | 🔴 critical (mismatch) |
| 3 | Disclose localStorage usage (GPU tier, loader cache) | 🔴 critical (EU ePrivacy compliance) |
| 4 | Beschwerderecht bei Aufsichtsbehörde (EDÖB / EU local DSB) | 🟡 important |
| 5 | Rechtsgrundlage explizit nennen (DSGVO Art. 6(1)(a)/(f)) | 🟡 important |
| 6 | Externe Verlinkungen (myportfolio, Twitch, IG, GitHub, LinkedIn, joggediballa.ch) | 🟡 important |
| 7 | DNS-Provider Cloudflare disclose | 🟡 important |
| 8 | Standard-Vertragsklauseln (SCC) für USA-Transfer | 🟡 important |
| 9 | Stand-Datum der Erklärung | 🟡 important |
| 10 | Datensicherheit / TMOM-Statement (DSGVO Art. 32) | 🟡 important |
| 14 | Gerichtsstand: Basel-Stadt | 🟢 optional |
| 15 | Footer legal-links visibility uplift | 🟢 emergent |

**Out of scope (rejected):**
- 11. Under-16 child-warning (overkill, no minor-targeted services)
- 12. Honeypot-Hinweis (technical anti-spam, not user-facing)
- 13. AGB / formal Vertragsbestimmungen (no commercial services)

## 3. Architecture

This is a content-and-styling work item — no new components, no new routes, no new dependencies.

### 3.1 Files to modify

- `messages/de.json`, `messages/en.json`, `messages/fr.json`, `messages/it.json` — Impressum + Datenschutz section content (per project pattern: DE source, others mirrored verbatim — proper localization deferred).
- `src/components/ui/Footer.tsx` — visibility uplift for the legal-links row.

### 3.2 No code-bridge needed

The Resend integration is not yet wired (Phase 11 deviation). Per user direction (option iii), the privacy text is written as a forward-compatible description: "Bei Nutzung des Kontaktformulars wird der `mailto:` aus deinem E-Mail-Client geöffnet — die Übermittlung läuft über deinen Provider, nicht über meinen Server. (Sollte ich künftig eine direkte Server-Übermittlung via Resend (Resend.com, USA) aktivieren, wird dies hier ergänzt.)" — passive future-tense lets the same string survive when Resend goes live.

## 4. Content rewrites — Impressum

### 4.1 `responsible` section

**Current:** `["Manuel Heller", "Basel-Region, Schweiz", "manuelheller@bluewin.ch"]`

**New:** `["Manuel Heller", "Martisackerweg 18, 4203 Grellingen, Schweiz", "manuelheller@bluewin.ch"]`

Full postal address per Manuel's confirmation 2026-05-06. Maximum-defensive (DSGVO Art. 13 controller-identity, German TMG-equivalent for EU users). Privacy trade-off accepted: home address is publicly visible at /[locale]/impressum.

### 4.2 `character` section — unchanged

Existing copy correctly states private, non-commercial purpose.

### 4.3 `liability` section — unchanged

Existing Haftungsausschluss covers external-link non-responsibility.

### 4.4 `copyright` section — unchanged

Existing copyright notice covers texts/photos/graphics/code.

### 4.5 NEW `jurisdiction` section (point #14)

```
Heading: "Gerichtsstand"
Body: ["Schweizer Recht ist anwendbar. Erfüllungsort und Gerichtsstand ist Basel-Stadt, Schweiz."]
```

### 4.6 NEW `lastUpdated` line at end of page

Plain `<p>` below the section list: "Stand: 6. Mai 2026"

## 5. Content rewrites — Datenschutz

### 5.1 `responsible` — minor update

**Current:** `["Manuel Heller, Basel-Region, Schweiz · manuelheller@bluewin.ch"]`

**New:** `["Manuel Heller, Martisackerweg 18, 4203 Grellingen, Schweiz · manuelheller@bluewin.ch"]`

### 5.2 `data` section — extend with localStorage (point #3)

**Current:** "Diese Website setzt keine Cookies und keinen LocalStorage. ..."

**New:** Replace with:

```
"Diese Website setzt keine Cookies. Es gibt kein Tracking, kein Analytics, keine Werbenetzwerke und keine Social-Media-Pixel. Es werden keine Daten an Dritte zu Werbezwecken weitergegeben.",
"Aus rein technischen Gründen wird der LocalStorage des Browsers genutzt: ein anonymer Eintrag merkt sich die GPU-Leistungsklasse deines Geräts (damit die WebGL-Animation beim nächsten Besuch direkt im richtigen Detail-Level startet) und ein Eintrag merkt sich, dass der Lade-Bildschirm bereits gespielt wurde (damit er bei Wechsel der Sprache nicht erneut erscheint). Diese Werte sind nicht personenbezogen, werden nicht an Dritte übermittelt und können jederzeit über die Browser-Einstellungen gelöscht werden."
```

### 5.3 `logs` section — fix hosting country (point #1) + add SCC (point #8 partial) + add Cloudflare (point #7)

**Current:** Says "eigenes Hosting in der Schweiz" (FALSE).

**New:**

```
"Der Hosting-Server (Linux mit nginx) wird selbst betrieben und steht beim Anbieter mc-host24.de in Deutschland. Die DNS-Auflösung läuft über Cloudflare (Cloudflare, Inc., USA), das gleichzeitig als Proxy-Schutz vor Bot-Angriffen dient — dabei werden IP-Adressen technisch verarbeitet, jedoch nicht zu Tracking-Zwecken gespeichert. Der Server protokolliert technisch notwendige Zugriffe: IP-Adresse, Zeitstempel, abgerufene URL, Referrer, User-Agent. Diese Logs werden nach 14 Tagen automatisch gelöscht und ausschliesslich zur Fehleranalyse und Sicherheitsüberwachung verwendet (Rechtsgrundlage: berechtigtes Interesse, DSGVO Art. 6 Abs. 1 lit. f, sowie Art. 31 Abs. 2 lit. b DSG).",
"Cloudflare ist über Standard-Vertragsklauseln (Art. 46 DSGVO) für Datentransfers in die USA abgesichert."
```

### 5.4 `form` section — option iii rewrite (points #2 + #5 + #8)

**New:**

```
"Bei Nutzung des Kontaktformulars wird aktuell der mailto-Mechanismus deines E-Mail-Clients aktiviert — die Nachricht läuft über deinen E-Mail-Provider, nicht über einen Server unter meiner Kontrolle. Dabei werden ausschliesslich die Daten verarbeitet, die du selbst in deinem Mail-Client eingibst.",
"Sollte zu einem späteren Zeitpunkt eine direkte Übermittlung über einen Server-Bridge (Resend.com, Resend, Inc., USA) aktiviert werden, würden Name, E-Mail-Adresse und Nachricht über diesen technischen Mittler an mich übermittelt. Resend ist über Standard-Vertragsklauseln (Art. 46 DSGVO) abgesichert. Eine entsprechende Anpassung dieser Erklärung erfolgt mit Aktivierung.",
"Rechtsgrundlage in beiden Fällen: deine Einwilligung durch das Absenden (Art. 6 Abs. 1 lit. a DSGVO, Art. 31 Abs. 1 DSG). Eingehende Nachrichten werden nach Beantwortung gelöscht, spätestens jedoch nach sechs Monaten."
```

### 5.5 `fonts` section — unchanged

Already states local self-hosting. Good.

### 5.6 NEW `externalLinks` section (point #6)

```
Heading: "Externe Verlinkungen"
Body: [
  "Diese Website verweist an mehreren Stellen auf externe Plattformen, deren Inhalte ich nicht beeinflussen oder kontrollieren kann. Beim Klick auf einen externen Link verlässt du diese Seite; ab dort gelten die Datenschutzbestimmungen des jeweiligen Anbieters.",
  "Aktuell verlinkte externe Dienste: GitHub (github.com), LinkedIn (linkedin.com), Instagram (instagram.com), Adobe Portfolio (manuelheller.myportfolio.com), Twitch (twitch.tv), Jogge di Balla (joggediballa.ch). Eine Liste der genauen Anbieter mit Sitzland kann jederzeit per E-Mail bei mir angefragt werden."
]
```

### 5.7 NEW `security` section (point #10)

```
Heading: "Datensicherheit"
Body: [
  "Sämtliche Verbindungen zur Website werden über TLS 1.3 verschlüsselt. Der Server wird regelmässig aktualisiert und durch Cloudflare-Proxy gegen automatisierte Angriffe abgeschirmt. Diese Massnahmen entsprechen den Anforderungen aus DSGVO Art. 32 und DSG Art. 8."
]
```

### 5.8 `rights` section — extend (points #4)

**Current:** Mentions auskunft/berichtigung/löschung/einschränkung/portabilität, contact email.

**New:** Append a paragraph naming the regulators:

```
[
  "Nach Schweizer Datenschutzgesetz (revDSG) und EU-DSGVO hast du das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenportabilität. Wende dich für alle Anfragen an: manuelheller@bluewin.ch.",
  "Für Beschwerden über die Verarbeitung deiner Daten kannst du dich an die zuständige Aufsichtsbehörde wenden: in der Schweiz an den Eidgenössischen Datenschutzbeauftragten (EDÖB, https://www.edoeb.admin.ch); innerhalb der EU an die Datenschutzbehörde deines Wohnsitzlandes."
]
```

### 5.9 NEW `lastUpdated` line at end of page

Plain `<p>` below the section list: "Stand: 6. Mai 2026"

## 6. Footer legal-links visibility uplift (point #15)

Currently the legal-links row uses `text-ink-muted` (low contrast, ~6.5:1 — passes AA but reads as decoration). The row sits below the social stamps + copyright line, so visually it's the third tier of footer content, easy to skip.

Two complementary changes:

1. **Move Impressum/Datenschutz to the SAME line as the © copyright**, not below. Currently:

   ```
   [© Manuel Heller · Basel-Region · MMXXVI]   [GH · LI · IG · MAIL]
   [Impressum · Datenschutz]
   ```

   New:

   ```
   [© Manuel Heller · Basel-Region · MMXXVI · Impressum · Datenschutz]   [GH · LI · IG · MAIL]
   ```

   On mobile, stacks vertically as before but legal-links sit RIGHT under the copyright line, not as a separate row.

2. **Strengthen contrast** on legal links: switch from `text-ink-muted` (rgba(10,6,8,0.7)) to `text-ink` (full opacity) with `underline decoration-ink-soft underline-offset-2 hover:decoration-ink` for visible link affordance. Read like normal in-text links, not decoration.

3. **Optional: add `Impressum · Datenschutz` next to the locale-switcher in the Nav.** Many sites surface legal links in the top-level nav. For a portfolio with deep-scroll first-section magic, this avoids forcing visitors to scroll past everything to find legal pages. Considered overkill for this scope; leave for a future polish pass.

Visual change scope: ~10 lines in `Footer.tsx`. No re-layout of the footer container.

## 7. Mobile fallback consideration

The legal pages render through `LegalDocument` server component at `/[locale]/impressum` and `/[locale]/datenschutz`. No mobile-specific changes; the JSON content additions render the same on all viewports. The Footer change above is responsive (`flex-col` mobile, `flex-row` desktop) — same pattern as today.

## 8. Translation pattern

Per Phase 11 deviation pattern: write all new copy in DE; mirror verbatim into EN/FR/IT. Proper translation lands in a future i18n pass. Shell strings (nav menu items, footer aria-labels) stay translated per existing per-locale state.

## 9. Risks & mitigations

- **Address accuracy** — confirmed by user 2026-05-06: Martisackerweg 18, 4203 Grellingen (Kanton Basel-Landschaft). Hardcoded into the message JSON as the canonical contact-of-record.
- **Resend forward-compatibility wording** — option (iii) means the same Datenschutz copy stays valid even when Resend goes live. The current text covers BOTH scenarios in passive language.
- **External-link disclosure scope creep** — listed services are the ones currently linked. If new services get linked in future, add to the externalLinks paragraph; not a recurring maintenance burden because the paragraph also covers "ask for an updated list via email".
- **Cloudflare proxying** — we describe Cloudflare as "Proxy-Schutz vor Bot-Angriffen" which is true if the orange-cloud is on. If Cloudflare is in DNS-only mode (grey cloud), the wording overstates. Phase 13 deployment used orange-cloud per CLAUDE.md memory; still accurate. If user disables proxy later, this text needs trimming — flagged.
- **No legal review by an actual lawyer** — Manuel said earlier "lieber zu viel als zu wenig"; the spec leans defensive. For a non-commercial portfolio in Switzerland this stack is over-spec'd, which is the intent. If user ever monetizes (commissioned work, ads, products), a real lawyer pass is warranted.

## 10. Done definition

- All 4 message JSON files contain the rewritten + new sections per §4 + §5.
- Footer renders legal links inline with copyright, full-contrast, on a single row at desktop / mobile-stacked.
- `pnpm typecheck` passes (no broken JSON, no broken next-intl key access).
- `pnpm exec playwright test` — existing tests still pass; no new test needed for content-only changes (the `axe.spec.ts` will catch any contrast or landmark regressions in the footer).
- `pnpm ci:local` passes.
- CLAUDE.md gets a one-paragraph addendum referencing this spec under a new `## Phase 13 deviations` sub-block (or post-launch-hardening section).

## 11. Out of scope explicitly

- Implementing the actual Resend bridge (Cloudflare Worker + Resend API). Separate sub-sprint.
- Changing the location field "Basel-Region" to a specific city in the Footer/Hero/About/About-Portrait — those are editorial labels, separate from the legal Impressum requirement. The legal pages get the precise zip; the editorial copy stays "Basel-Region" for branding consistency.
- Translation. DE source mirrored. Future locale pass closes the gap.
- Adding a Cookie banner. The site does not set cookies. localStorage is technically necessary and disclosed in §5.2; under Swiss revDSG no consent is required for technical-necessity storage, and EU ePrivacy (CookieConsent) requires consent only for non-essential storage.
