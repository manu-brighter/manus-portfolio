# Mobile Rework — Design

**Status:** Draft
**Owner:** Manuel Heller
**Branch:** TBD (created at writing-plans stage)
**Pre-work dependency:** SF-3 (FluidOrchestrator Factory Pattern) must merge first

---

## TL;DR

The Mobile experience does not currently match the WOW factor of Desktop. Two
anchors — the FluidSim and the Case-Study Diorama — are absent or buggy on
Mobile, and the page feels overloaded and too long. This spec re-introduces
both anchors as mobile-native equivalents, compresses three overlong sections
(Photography, About, Case-Study), and lays a multi-instance Sim foundation
without changing the Desktop appearance.

- **Three distributed Sim-Spots** replace the global background Sim on Mobile:
  Hero (scroll-attached), Case-Study (Splat-Übergänge zwischen Stationen),
  Photography (Swiper).
- **Photography**: 5 vertical slots → 1 horizontal Swiper-Slot.
- **About**: 4 PullQuotes → 2; 3×3 ObjectGrid → horizontaler Swipe-Strip.
- **Case-Study**: horizontal-pin Diorama (Desktop) → eigene Mobile-Komponente
  `CaseStudyMobileScrolly`, vertikales Scrolly mit Sim-Splat-Übergängen
  zwischen Stationen.
- **Desktop unverändert.** Visual-Regression-Snapshots schützen das.
- **Page-Length-Ziel**: ~14-16 → ~8-10 Bildschirm-Höhen Scroll-Höhe.

---

## 1 · Goals & Non-Goals

### Goals

1. Mobile fühlt sich gleichwertig "WOW" an wie Desktop (subjektiv, aber zwei
   anchors müssen sichtbar funktionieren: Sim + Diorama).
2. Mobile-Page-Länge wird massiv reduziert (>40%).
3. Allgemeines Look & Feel bleibt: Riso-Paper-Aesthetic, Instrument Serif
   italic, asymmetric editorial, Spot-Colors, Mono-Stamps.
4. Performance auf Mid-Tier Phones (iPhone 13+, modernes Android) ≥ 40fps für
   die aktive Sim. Lower-Tier Phones fallen sauber zu Static-WebP zurück.
5. WCAG AA bleibt erfüllt, inkl. Touch-Target 44×44 (WCAG 2.5.5 AAA).

### Non-Goals

- Mobile-Sonder-Brand-Identity oder Visual-Stil-Bruch zu Desktop.
- WebGPU-Port (SF-1) — bleibt strategisch parkiert.
- Editorial-Rhythm-Pass (SF-8) — passiert IN diesem Rework, nicht davor.
- Per-Route i18n-Splitting (SF-5) — parallel-track, nicht Teil dieses Reworks.
- CSP / Security-Headers (SF-2) — parallel-track.

---

## 2 · Approach

**Chosen:** *Surgical Mobile-Adapt* — drei strukturelle Section-Umbauten +
multi-instance Sim-Architektur, ohne Desktop-Bruch.

### Rejected alternatives

- **Mobile-Native Rethink** — eigener Brand-Stil für Mobile (Touch-First UX,
  native-app-Konventionen). Verworfen: Brand-Bruch, widerspricht
  Goal #3.
- **Strip-Down / Trailer-Mobile** — Mobile zeigt nur Hero + 1 Showcase-Sim,
  Rest auf /about etc. Verworfen: SEO-Penalty + Authentizitäts-Verlust.

---

## 3 · Architecture — Three-Sim-Spot Distribution

### 3.1 Spot-Layout

```
Section 00  Hero                       Sim-Spot 1  (scroll-attached)
Section 01  Skills                     —
Section 02  Work                       —
Section 03  About (kondensiert)        —
Section 04  Case-Study Scrolly         Sim-Spot 2  (Splat-Übergänge)
Section 05  Photography Swiper         Sim-Spot 3  (Splat pro Swipe)
Section 06  Playground                 (Mini-Sims in Cards, paused)
Section 07  Contact                    —
```

### 3.2 Mode-Split Desktop ↔ Mobile

- **Desktop**: globale Hero-FluidSim bleibt `position: fixed` wie heute,
  cursor-driven, ambient-recorder-Replay, durchgehend sichtbar.
- **Mobile**: keine globale Hintergrund-Sim. Drei separate Sim-Canvases,
  jede scroll-attached zu ihrer Section. IO-Pause-Gate: nur die Section
  die im Viewport ist, hat ihre Sim aktiv.

Detection: `(pointer: coarse)` + `(max-width: 767px)`. `SceneProvider` routet
zwischen Mode-Branches.

### 3.3 Pre-Work — SF-3 Factory Pattern

SF-3 (`FluidOrchestrator` Factory Pattern) wird vor Mobile-Rework gemerged.
Multi-Instance-Sim-Architektur ohne Factory ist hacky (8 definite-assignment
assertions, load-bearing class wird in 6+ Consumern instantiiert). Mit
Factory: sauberer `createFluidOrchestrator(config)` per Spot.

### 3.4 Sim-Trigger-Modell pro Spot

**Sim-Spot 1 — Hero**
- Mount: 1 Warmup-Frame (1px-Splat off-screen) gegen iOS-Compile-Stall
- Auto-Ambient: 3 Splats über 2-3s nach `loader-complete`
- Touch: Tap = 1 Splat, Drag = kurzer Trail
- **Kein Touch-Hint UI** — Discoverability via Auto-Ambient-Splats. Awwwards-
  Editorial-Aesthetic bricht mit "Tap here"-Stamps. Falls nach Real-Device-
  Test Discovery-Problem sichtbar: nachträglich subtler Mono-Stamp der
  einmalig nach 5s fades.
- IO-Pause bei 80% out-of-viewport

**Sim-Spot 2 — Case-Study-Scrolly**
- Sim-Canvas hinter den Karten, z-stacked unter Content
- ScrollTrigger pro Übergang: Splat triggert bei 50% durch eine Station,
  Spot-Color der eintreffenden Station, Force-Richtung von Vorgänger zu
  Folger (oben→unten Vektor)
- IO-Pause-Gate bei Section out

**Sim-Spot 3 — Photography-Swiper**
- 1 Sim-Canvas hinter dem Swiper-Container
- Splat triggert pro Swipe in Spot-Color der eintreffenden Photo
  - Pelican = amber, Koenigsegg = violet, Pano = amber, Tree-Lake = mint,
    Crocodile = rose
- PhotoInkMask-Reveal-Mechanik wird recycled (1 Context statt 5)

---

## 4 · Per-Section Strategies

### 4.1 Hero (Section 00)

**Unverändert:** Stamps-Column-Layout, H1 OverprintReveal mit Slash, Tagline.
**Geändert:** Sim wird scroll-attached statt fixed (Mobile only).

### 4.2 Skills (Section 01)

**Unverändert.** Vibecoded-Stamp + Skills-Liste + HeroSkillPulse bleiben.

### 4.3 Work (Section 02)

- Mobile-Cards-Layout aktuell OK.
- `fluidBus.dispatchSplat()` von WorkCard wird auf Mobile (Coarse-Pointer)
  zum No-Op — kein globaler Hero-Sim zum Empfangen.
- Hover-Affordance `→` zu Tap-Affordance umgelabelt (visual cue, kein
  Behaviour-Change weil Tap eh Navigation ist).

### 4.4 About (Section 03 — kondensiert)

- **PullQuotes**: 4 → 2. Behalten: `wer-ich-bin` (rose, opener) +
  `ai-workflow` (amber, loud-centered signature). Entfallen auf Mobile:
  `wie-angefangen` (mint), `antrieb` (violet).
- **Portrait + Currently-Block**: bleibt zwischen den 2 PullQuotes als
  Atem-Pause.
- **ObjectGrid**: 3×3 → horizontaler Swipe-Strip (`scroll-snap-x mandatory`),
  ~1.5 Items sichtbar, alle 9 Objects scrollbar.
- **AI-Closer**: kompakter (kleinerer Type, weniger vertikales Padding).
- **StampDivider-Sequenz**: bleibt — gibt rhythm trotz Compression.

Mobile-Toggle: **Inline-Branching** via `useCoarsePointer` in `About.tsx`.
Content (Translations) muss eh geladen werden — kein Bundle-Win bei
Lazy-Split, dafür DRY.

### 4.5 Case-Study (Section 04 — Diorama-Mobile)

- **Neue Komponente** `src/components/case-study/CaseStudyMobileScrolly.tsx`
  parallel zu existierendem `CaseStudy.tsx` `mobileFallback`. Auf
  Mobile-Branch wird `CaseStudyMobileScrolly` gerendert statt
  `mobileFallback`.
- **Struktur:** 4 vertikale Stationen
  - Station 1: Hook (Joggediballa-Polaroid + Hook-Text)
  - Station 2: Context+Stack (Facts + Story-Paragraphs + Stack-Card)
  - Station 3: Admin+Overlay-Highlights (zwei Highlight-Cards)
  - Station 4: Public-Shots-Strip (3 Polaroids + Reflection)
- **Sim-Splat-Übergänge** zwischen Stationen: 1-Bildschirm-Höhe Spacer mit
  full-bleed Sim-Canvas. Splat triggert bei 50% durch Vorgänger-Station.
- **Polaroid + Lupe** bleiben als Touch-Elements pro Station. Lightbox-Mechanik
  unverändert.
- **Kein horizontal-pin ScrollTrigger** — komplett vertikal.
- Desktop `DioramaTrack` + `DioramaCards` + `DioramaIllustration` + `DioramaLupe`
  bleiben **unverändert**.

### 4.6 Photography (Section 05 — Swiper)

- **Aus 5 vertikalen Slots → 1 horizontaler Swiper-Slot**, ~75vh hoch.
- Container: `<div role="region" aria-roledescription="carousel" aria-label="…">`
- Layout pro Slide: full-bleed Photo + Sim-Canvas darunter + Mono-Caption
  rechts/unten je nach Aspect-Ratio.
- Snap-Mechanik: `scroll-snap-type: x mandatory` mit `scroll-snap-align: center`
  pro Slide. Touch-Swipe nativ.
- **Pagination-Dots** oben rechts (5 dots, current = spot-color filled,
  44×44 hit-area).
- **Prev/Next Buttons** sichtbar als Touch-Affordance + Keyboard-Parity.
- `aria-live="polite"` Region announcet "Bild X von 5" beim Swipe-Snap
  (debounced ~300ms).
- **Swipe-Hint** Mono-Stamp "Swipe →" dezent unten, fades nach erstem Swipe.
- Lightbox-Mechanik bleibt (Tap auf Photo → Lightbox).

Existing `PhotoInkMask`-Komponente wird angepasst: 1 Sim-Canvas-Instanz die
auf Swipe re-triggert (statt 5 separate Instanzen).

### 4.7 Playground (Section 06)

- Cards stack auf Mobile (existing).
- **Mini-Sims in Cards pausen wenn out-of-viewport** (teilweise existing,
  härter durchziehen).

### 4.8 Contact (Section 07)

- Form-Layout-Stack bleibt.
- Honeypot bleibt.
- Footer-Block kompakter (Stamp-Layout auf 375px).

---

## 5 · Performance, Devices, Fallbacks

### 5.1 GPU-Tier-Routing

| Tier | Devices | Sim-Res | Behaviour |
|------|---------|---------|-----------|
| **Flagship** | M-iPad, S25 Ultra, iPhone 16 Pro Max | **256²** Medium-Tier | Alle 3 Sims aktiv |
| Medium | iPhone 13+, modernes Android | **128²** Low-Tier | Alle 3 Sims aktiv |
| Low | Mid-tier Android, ältere iPhones | **96²** Minimal-Tier | 3 Sims aktiv aber reduzierte Splat-Rate |
| Minimal | Sehr alt / frametime > 14ms / unbekannt | Hero only | Case-Study + Photography zu Static-WebP |
| Static | `prefers-reduced-motion` / Detection fail | — | Alle Sims zu Static-WebP, Diorama-Scrolly ohne Splat-Übergänge |

Tier-Detection läuft bereits via `lib/gpu.ts` + `useGPUCapability`. Wir
extenden die Mapping-Tabelle um die obigen Mobile-spezifischen Mappings.

### 5.2 iOS Safari WebGL2-Context-Budget

- **iOS-Limit**: 8 simultane Contexts
- **Worst-Case Mobile-Page**: Hero-Sim (1) + Case-Study-Sim (1) + Photography-
  Sim (1) + Playground Mini-Sims (2-3, paused) = 5-6 Contexts. Buffer reicht.
- **SF-4 (Pooled Context)** ist Safety-Net falls Limits einbiegen; aktuell
  nicht blockierend.

### 5.3 Compile-Stall Mitigation

- Beim ersten Touch hat eine Sim ~50-100ms shader-compile-stall auf iOS
  Safari.
- **Lösung:** Warmup-Frame beim Mount jeder Sim-Instanz (1px-Splat off-screen).
  Compile happens silent vor User-Interaktion.

### 5.4 LCP / CLS / TBT

- **LCP**: Hero-H1 ist LCP-Target. OverprintReveal blockt nicht (per-char
  inline-blocks rendern sofort, GSAP delay-startet). Mobile-LCP-Ziel < 2.5s.
- **CLS**: Sim-Canvases haben `width/height`-attributes — kein layout-shift.
- **TBT**: aktueller Desktop ~140ms. Mobile-Ziel: ≤ 160ms (IO-Pause-Gates
  halten nur eine Sim aktiv).

### 5.5 Loader-Strategy

- Loader bleibt unverändert. Hero-Sim Gate `triggerAmbient()` ~2400ms after
  `loader-complete` bleibt.

---

## 6 · Testing, A11y, Acceptance Criteria

### 6.1 Touch-Targets (WCAG 2.5.5 AAA target 44×44)

- Swiper-Pagination-Dots: 44×44 hit-area auch wenn visuell 12×12 (padding).
- Polaroid-Buttons in Case-Study-Scrolly: 44×44 minimum.
- Bestehende Form-Inputs sind schon ≥ 44×44.

### 6.2 Photography-Swiper A11y

- `role="region"` + `aria-roledescription="carousel"` + locale `aria-label`.
- **Prev/Next Buttons** sichtbar (Keyboard-Parity).
- `aria-live="polite"` Region "Bild X von 5" beim Swipe-Snap (debounced).
- Lightbox-Open per Tap + per Enter auf focused Slide.

### 6.3 Case-Study-Scrolly A11y

- Semantisch `<article>` mit `<section>`-Stationen.
- ScrollTrigger-Splat-Übergänge sind decorative (`aria-hidden`).
- Polaroid-Buttons pro Station fokussierbar mit Tab.

### 6.4 Hero-Sim A11y

- Canvas `aria-hidden="true"` (decorative).
- Keine Touch-Hint nötig — organic discovery.

### 6.5 Reduced-Motion-Path

- Existing `useReducedMotion` hook handelt das.
- Diorama-Scrolly bei reduced-motion: ScrollTrigger.kill(), Stationen
  rendern als clean vertical-stack ohne Sim-Übergänge.

### 6.6 Visual-Regression-Setup (NEU)

- **Setup Playwright Visual-Snapshots** als Pre-Sprint-Aufgabe.
- Baseline-Screenshots der **Desktop**-Sektionen capturen vor Mobile-Rework:
  - Hero @ 1440×900
  - Skills @ 1440×900
  - Work @ 1440×900
  - About (8-spine) @ 1440×900 — 4-5 Screenshots scrollend
  - Case-Study Diorama @ 1440×900 — horizontaler Scroll-Verlauf
  - Photography (5 Slots) @ 1440×900 — 5 Screenshots
  - Playground @ 1440×900
  - Contact @ 1440×900
- Pendant: `tests/e2e/visual-regression.spec.ts` mit
  `toHaveScreenshot({ maxDiffPixelRatio: 0.01 })` pro Sektion.
- Test schlägt fehl wenn Desktop-Erscheinung sich ändert während Mobile-Rework.

### 6.7 Neue E2E-Tests

- `tests/e2e/photography-swiper.spec.ts` — swipe-gesture, pagination-state,
  keyboard prev/next.
- `tests/e2e/case-study-scrolly-mobile.spec.ts` — vertikales Scrolly,
  ScrollTrigger-Splat-Trigger-Positionen.
- `tests/e2e/hero-sim-mobile.spec.ts` — sim-canvas mount, IO-pause bei Out.
- Existing Mobile Chrome project deckt das ab; specs extenden die Coverage.

### 6.8 Axe-Playwright

- Existing axe-spec pages bleiben.
- **Extended** auf Mobile-Chrome-Viewport für home/de + home/en.
- Erwartete Neu-Violations: keine.

### 6.9 Acceptance Criteria

1. Mobile-Page scroll-length von ~14-16 auf ~8-10 Bildschirm-Höhen reduziert.
2. Drei sichtbare FluidSim-WOW-Moments auf Mobile (Hero, Case-Study,
   Photography).
3. Photography auf einem Swiper-Slot statt 5 vertikalen Slots.
4. About kondensiert auf 2 PullQuotes + horizontal-Swipe-ObjectGrid.
5. Case-Study Diorama auf Mobile als vertikales Scrolly mit Sim-Übergängen.
6. Lighthouse Mobile-Perf ≥ 0.55 (matches Desktop-CI-Bar; nicht regressiv).
7. Lighthouse Mobile-A11y = 1.00.
8. Keine WebGL-Context-Limit Crashes auf iOS Safari (Real-Device-Test vor
   Merge).
9. Iris-Xe-vergleichbare Hardware: keine Sim-Spot < 30fps.
10. **Desktop-Erscheinung unverändert** — Playwright Visual-Snapshots grün.

### 6.10 Real-Device-Smoke-Test (vor Merge)

- iPhone (Manuel's eigenes Gerät).
- Mid-tier Android (falls verfügbar; Proxy: Chrome DevTools "4x Slowdown" +
  Mobile-Emulation).
- iPad (Manuel's): Flagship-Tier Sanity-Check.

---

## 7 · Implementation Phases (high-level — full plan via writing-plans skill)

1. **Pre-Work:** SF-3 FluidOrchestrator Factory Pattern mergen.
2. **Visual-Regression-Baseline:** Playwright Snapshots der Desktop-Sektionen
   capturen + committen vor jedem Mobile-Code-Change.
3. **Sim-Architektur:** Multi-Instance Sim-Mode-Split in `SceneProvider`.
4. **Hero Mobile-Sim:** scroll-attached Canvas, Touch-Driver.
5. **Photography Swiper:** strukturelle Umstellung 5 → 1.
6. **Case-Study Mobile-Scrolly:** neue Komponente, Sim-Übergänge.
7. **About Compression:** PullQuote-Reduktion + ObjectGrid-Swipe-Strip.
8. **A11y Pass:** Touch-Targets, Pagination, aria-live.
9. **Real-Device-Test + CI.**

Detail-Steps + ordering kommen aus dem writing-plans output.

---

## 8 · Resolved Design Decisions

- **Mobile-Toggle-Pattern (Hybrid):**
  - Strukturell stark abweichende Sections (Photography Swiper, Case-Study
    Scrolly) → eigene `*Mobile.tsx`-Komponenten, lazy-imported per
    `next/dynamic`. Bundle-Win durch nicht-geladenen Desktop-Code
    (DioramaTrack-Tree, 5-Slot-Photography-Tree).
  - Sections mit Compression / Pacing-Variant (About, Hero) →
    Inline-Branching via `useCoarsePointer`. Content muss eh geladen
    werden, kein Lazy-Split-Gewinn, dafür DRY.
- **Hero Touch-Hint:** *Keiner.* Ambient-Splats kommunizieren das Medium
  organisch. Awwwards-Editorial-Aesthetic bricht mit "Tap here"-Stamps.
  Falls nach Real-Device-Test Discovery-Problem auftritt: subtilen Mono-
  Stamp nachschieben der einmalig nach 5s fades.

---

## 9 · References

- `.claude/CLAUDE.md` — Performance-Regeln, A11y-Traps, Visual-Policy.
- `.rework/REPORT.md` — Strategic Follow-ups (SF-3, SF-4 relevant).
- `docs/superpowers/specs/2026-05-05-case-study-diorama-redesign.md` —
  existing Diorama design context.
- `docs/superpowers/specs/2026-05-04-about-skills-visual-rework-design.md` —
  existing About spine context.

---
