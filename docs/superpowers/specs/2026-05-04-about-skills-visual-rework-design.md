# About + Skills Visual Rework — Design Spec

**Date**: 2026-05-04
**Phase**: Phase 11 polish-sprint (post-launch-prep)
**Status**: approved by Manuel, ready for implementation plan

> Brainstorm context: Manuel flagged About + Skills as "boring". The visual layer
> is the lever (briefing-prose stays unchanged). This spec captures the visual
> rework only; copy edits, voice changes, or new content are out of scope.
> Source briefing remains `docs/content-briefing.md` § 2 + § 3.

---

## 1 · Goal

Transform About + Skills from a typographic-list layout into an editorial
Riso-print sequence with deliberate dramaturgy, layered Riso theatrics,
and a small interactive layer on Skills. Awwwards-grade liveliness without
competing with the Hero (cursor-fluid) or Playground (interactive demos)
moments.

## 2 · Direction (locked-in)

- **B** — Layered Riso-Theatrics (every block + tier gets flourishes)
- **D** — Dramaturgy / Pacing (asymmetric block layouts, restructured spine)
- **C-touch** — Skills gets three subtle hover/reveal/ambient effects

Out: Big-Wow-Moment (would compete with AI-Pinsel pull-quote), Cursor-tied
trails through About (would compete with Hero), Skills-only spectacle
(ignores Manu's primary "About boring" complaint).

---

## 3 · About — New Spine

The Briefing § 2.2 prose stays verbatim. What changes is the structural
spine: 5 equal-rectangle parts → 6 rhythmically-varied blocks with a
portrait anchor and an object-grid interlude.

### Block flow (top → bottom)

```
┌─ 00 · Section Header ─────────────────────────────────────────
│   Mono "Section 01 · About" · Headline · Subhead
│   (unchanged from current)

├─ 01 · "Wer ich bin"  ─────────────────────────────────────────
│   Layout:    4/12 marginalia │ 8/12 content
│   Spot:      rose
│   Pull-quote: "Die spannenden Sachen passieren genau *dazwischen*."
│   Marginalia: "01 / 04 · IDENTITÄT · MMXXVI"
│   Body:      § 2.2 part 1 prose, drop-cap on first letter, 65ch

├─ 02 · "Wie ich angefangen" ───────────────────────────────────
│   Layout:    6/12 content │ 3/12 stamp-year column on right
│   Spot:      mint
│   Pull-quote: "Ich will verstehen, *wie das alles unter der Haube* läuft."
│   Marginalia: stamps "MINECRAFT · 2014" / "NOVARTIS EFZ · 2017–2021"
│               / "ZVOOVE · 2021—" floating in right column
│   Body:      § 2.2 part 2 prose, drop-cap, 65ch

├─ 03 · Portrait-Anchor ────────────────────────────────────────
│   Visual breath. PhotoInkMask treatment, 4:5 aspect.
│   Caption "Basel-Region · MMXXVI" stays.
│   Position: opposite-aligned to flanking blocks (left if block 04
│   is right-shifted, etc.) — set per implementation.

├─ 04 · "Wie ich mit AI arbeite" ───────────────────────────────
│   Layout:    10/12 centered (the loud block)
│   Spot:      amber
│   Pull-quote (XXXL): "AI-generierte Websites sehen heute alle gleich
│               aus, weil die meisten Leute der AI nur sagen *was* sie
│               wollen, nicht *wie*."
│   Body:      § 2.2 part 3 prose, drop-cap, optional 2-column layout
│              for visual rhythm

├─ 05 · "Was mich antreibt" ────────────────────────────────────
│   Layout:    8/12 centered, short
│   Spot:      violet
│   Pull-quote: "Wer aufhört zu *lernen*, ist innerhalb von 12 Monaten
│               abgehängt."
│   Body:      § 2.2 part 4 prose (short, single paragraph), drop-cap

├─ 06 · Object-Grid · "Off-Screen + Currently merged" ─────────
│   Layout:    Full-width container, 3×2 grid (Desktop), 2×3 (Mobile)
│   Replaces:  Briefing § 2.2 part 5 ("Ausserhalb vom Bildschirm")
│              + Briefing § 2.5 ("Currently…" block)
│   Tiles:     6 inline-SVG Riso-stamps, each with verb-caption
│              (see § 5 for tile spec)
│   Sub-band:  Mono "Currently learning · R3F 9 · WebGPU-Shader" line
│              under the grid header (the only Currently-line that
│              has no physical-object equivalent)

├─ 07 · AI-Pinsel-Pull-Quote ───────────────────────────────────
│   Section closer. Unchanged from current implementation.
└────────────────────────────────────────────────────────────────
```

### Spot-color mapping (storied blocks)

| Spine-# | Block | Storied-counter | Spot-color | Drop-cap | Word-highlight in pull-quote |
|---|---|---|---|---|---|
| 01 | Wer ich bin | 01 / 04 | rose | rose | "dazwischen" |
| 02 | Anfangen | 02 / 04 | mint | mint | "wie das alles unter der Haube" |
| 04 | AI-Workflow | 03 / 04 | amber | amber | "wie" (and contrast with "was") |
| 05 | Antrieb | 04 / 04 | violet | violet | "lernen" |

Two numbering schemes coexist: **spine-#** is the vertical position
in the section flow (00 header, 01 Wer ich bin, 02 Anfangen, 03
Portrait, 04 AI-Workflow, 05 Antrieb, 06 Object-Grid, 07 AI-Pinsel-
Closer). **Storied-counter** is what the marginalia displays — only
the four storied blocks share that counter ("01/04" through "04/04").
Portrait, Object-Grid, and AI-Pinsel-Closer have no storied-counter.

The Drop-Cap and the Word-Highlight inside the pull-quote share the
same spot-color per storied block — gives each block its own "Riso-
plate" identity. AI-Pinsel-Closer (out of band) keeps its existing
rose-Riso treatment.

---

## 4 · Riso-Theatrics Repertoire (the B-layer)

Decorations applied on top of the spine. Reference numbers `B1`-`B11`
match the brainstorm catalog.

### Mandatory (signature of the project)

- **B1** OverprintReveal on each pull-quote (XXL-italic), incl. AI-Pinsel
  closer. Existing primitive (`src/components/motion/OverprintReveal.tsx`).
  Rose+Mint ghost layers with Riso-misregistration, IO-triggered.
- **B2** FadeIn primitive (existing, `src/components/motion/FadeIn.tsx`)
  on body prose paragraphs, staggered ~120ms after pull-quote reveal,
  per-paragraph stagger ~60ms.
- **B3** Mono-stamp marginalia using `.type-label-stamp` for block
  numeration ("01 / 04"), year stamps in block 02, and the Object-Grid's
  Currently-band.

### Strong Riso (the punch)

- **B4** Drop-Cap on first letter of body prose. Applied only to the
  four storied blocks (spine-# 01, 02, 04, 05); skipped on 03 Portrait
  (no body prose), 06 Object-Grid (no body prose), 07 AI-Pinsel-Closer
  (the closer carries its own typographic weight via the existing
  pull-quote). Italic Instrument Serif, ~4× line-height, block-keyed
  spot-color (see § 3 mapping). Drops 3 lines tight. CSS `:first-letter`
  pseudo with explicit color.
- **B5** Riso-Plate-Corner-Marks: small `+`-style registration crosses
  in `--color-ink` 1.5px stroke at the four corners of:
  - The Section header
  - The Object-Grid (block 06)
  - The AI-Pinsel-Closer
  4 corners per "plate". Pure SVG inline.
- **B6** Stamp-Divider between blocks: not just whitespace — a Riso-
  stamped asterism (`✱ · ✱`) or 3-dot-stamp-row in spot-color of the
  *outgoing* block, centered, ~24px tall.
- **B7** Animated `[vibecoded]`-stamp on Block 04 — see C1 (Skills uses
  the same primitive, just in a different context).

### Optional (locked in)

- **B9** SVG-path-underline animation on key words in pull-quotes. Drawn
  via `stroke-dasharray` animation tied to the pull-quote reveal
  timeline. The "highlighted word" per block (see § 3 mapping table)
  gets the underline. Hand-drawn-stroke style: `stroke-linecap: round`,
  slight bezier wobble. Renders behind the text via z-index.
- **B10** Object-Grid-Tile-Hover (block 06): tile rotates ~2° on hover,
  spot-color floods from one corner via CSS gradient over 280ms,
  caption shifts +2px (live Riso-misregistration). Tile-specific
  spot-color (cycled rose → mint → amber → violet → rose → mint over
  the 6 tiles).
- **B11** Pull-quote word-highlights: the keyword in each pull-quote
  (per block-mapping) gets the spot-color (`text-spot-{X}`). Static
  color — the *motion* is the underline (B9). Together they read as
  "this is the riso plate for this block".

### Out-of-scope (rejected)

- **B8** Subtle ink-bleed background creep — would clash with the
  existing Hero-Fluid + Photo-Ink-Mask + Object-Grid riso plates.
- **B12** Cursor-trail ink through About — competes with Hero.
- **B13** Audio narration — out of scope, maintenance burden.
- **B14** Parallax-tilt on Portrait — Photo-Ink-Mask treatment is enough.

---

## 5 · Object-Grid Detail (Block 06)

### Structure

```
┌─ Header ──────────────────────────────────────────────────────
│   Mono-stamp "Off the screen" + sub-band "Currently learning ·
│   R3F 9 · WebGPU-Shader" (the residue of the Currently block)

├─ Grid (3×2 desktop, 2×3 mobile) ─────────────────────────────
│   ┌ KAMERA      ┐ ┌ AUDI S5    ┐ ┌ JOGGEDIBALLA ┐
│   │ Sony α7 IV  │ │ B8.5 ·     │ │ Verein · VP  │
│   │ "shooting"  │ │ Tuning     │ │ "co-running" │
│   │             │ │ "driving"  │ │              │
│   └─────────────┘ └────────────┘ └──────────────┘
│   ┌ SKI/SNOW    ┐ ┌ TAUCHEN    ┐ ┌ PING-PONG    ┐
│   │ Wintersaison│ │ Wo's geht  │ │ zvoove-Titel │
│   │ "carving"   │ │ "diving"   │ │ "chasing"    │
│   └─────────────┘ └────────────┘ └──────────────┘

└─ Plate-corner-marks at the 4 grid corners (B5) ────────────
```

### Tiles (inline custom SVG, choice 1A)

Six tiles, each a `<figure>` with:
- An inline-SVG riso-stamp icon (~80×80, hand-styled)
- A bold name (Mono UPPERCASE)
- A caption-line (verb + context)
- A subtle border (1.5px ink)
- Spot-color for the icon stroke (rose → amber → mint → violet → rose →
  amber across the 6 tiles; rose and amber repeat once each because
  6 tiles ÷ 4 inks = 1.5)

| # | Icon | Spot | Name | Verb-caption |
|---|---|---|---|---|
| 1 | Camera body silhouette | rose | KAMERA | shooting · Sony α7 IV · Wildlife |
| 2 | Car silhouette (sportscar profile) | amber | AUDI S5 | driving · B8.5 · Tuning-Projekt |
| 3 | "JdB" wordmark stamp | mint | JOGGEDIBALLA | co-running · Verein · Vize-Präsident |
| 4 | Mountain triangle + chevron | violet | SCHNEE | carving · Ski/Snowboard · Wintersaison |
| 5 | Diving mask + bubble | rose | TIEFE | diving · Wo's geht |
| 6 | Ping-pong paddle + ball | amber | PING-PONG | chasing · zvoove-Champion-Titel |

Icon rendering: hand-drawn-feel SVG paths, `stroke-linecap: round`,
`stroke-linejoin: round`, `stroke-width: 2px`, `fill: none` for most
strokes plus solid spot-color fills on accent shapes (e.g. the
camera lens center, the diving mask glass). All stamps share the
same visual language — slightly imperfect lines, ~10% rotation
asymmetry per icon to feel hand-cut. Total LOC budget: ~150 across
the 6 stamps in `src/components/about/stamps/`.

### Mobile-collapse

3×2 → 2×3. Same 6 tiles, smaller. Captions stay full-text. The
Currently sub-band stacks under the header.

---

## 6 · Skills Section — C-Touch

Three concrete effects, all subtle.

### C1 — Animated `[vibecoded]`-stamp on reveal

**Where**: every `[vibecoded]` marker in the Vibecoded-Stack tier
(currently 10 items: TypeScript, React, Next.js, Tailwind, tRPC,
Drizzle ORM, shadcn/ui, GSAP, Three.js / R3F, Lenis).

**Mechanic**: GSAP-timeline per marker. Initial state: `scale 1.6`,
`rotate -8deg`, `opacity 0`. Reveal staggers ~80-100ms between markers
when the Vibecoded tier scrolls into view. Animation tween:
`rotate → 0`, `scale → 1`, `opacity → 1`, ease `riso` (snappy).
Plus a brief shadow-burst behind the stamp at impact (small
`spot-rose` halo, fades over ~200ms).

**Reveal trigger**: IntersectionObserver, `threshold: 0.4` on the
Vibecoded tier container. One-shot.

### C2 — Hover-misregistration on every skill-word

**Where**: every skill-name in every tier (PHP, Vue, MariaDB, …).

**Mechanic**: CSS-only via `::before` (mint ghost, `translate -2px`,
`opacity 0.7`) and `::after` (rose ghost, `translate +2px`, `opacity
0.7`) pseudo-elements. Triggered by `:hover` and `:focus-visible`,
150ms transition in, 150ms transition out. Pseudo-elements use
`mix-blend-mode: multiply` to feel like print plates.

**Reduced-motion**: pseudo-elements stay hidden (CSS-variable toggle
on the section root: `--rm: 1` then `[data-rm="1"] .skill::before`
display: none).

### C3 — Hero-Skill ambient pulse

**Where**: the XXL "AI-Workflow & Vibecoding" block (single instance).

**Mechanic**: an absolutely-positioned `<div>` halo behind the text.
`mix-blend-mode: multiply`, `filter: blur(40px)`, `opacity 0 → 0.4 →
0` over 2.8s, then a 1.2s pause, then next spot-color. GSAP-timeline
loops. Color cycle: rose → amber → mint → violet → rose. Width ~120%
of the text block, height ~80%, centered.

**Reduced-motion**: timeline killed at mount, halo stays at opacity 0.

### C4 — Tier-Flood (future add-on, NOT in scope)

Recorded for future iteration: hover on a Skill-Tier-Group floods
the tier with its own spot-color (Daily-Driver=rose, Production=amber,
Vibecoded=mint, Werkzeugkasten=violet, Craft=gold). Adds tier-identity
visual code. Excluded now to avoid hover-busyness with C1/C2/C3.

---

## 7 · Drop-Cap Style (locked, choice 2B)

**Per block, drop-cap renders in the block's spot-color.** Mapping in
§ 3. Implementation:

```css
.about-block-{id} > .body-prose > p:first-of-type::first-letter {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 4.5em;        /* ~ 4 line-heights */
  line-height: 0.85;
  float: left;
  margin: 0 0.08em -0.15em 0;
  color: var(--color-spot-{X}); /* per block */
}
```

`color` driven via per-block CSS variable `--block-spot` set on the
block container, so the same CSS applies to all blocks and the spot
rotates implicitly. Reduced-motion: no special branch needed (it's
static styling).

---

## 8 · Mobile, Reduced-Motion, A11y

### Mobile (< 768px)

- All asymmetric blocks collapse to single-column 12/12.
- Marginalia (block-numeration, year-stamps) wraps above pull-quote
  as a small mono-stamp header row.
- Portrait stays embedded between blocks 02 and 03, full-width.
- Object-Grid: 2×3 instead of 3×2. Captions stay full-text.
- AI-Pinsel-Closer: full-width, slightly reduced XXL.
- Plate-corner-marks remain, smaller (DPR-aware).
- Drop-Caps shrink proportionally (`clamp()`-driven).

### Reduced-Motion (per-effect branch)

| Effect | Behaviour |
|---|---|
| OverprintReveal pull-quotes | Existing reduced-motion branch (plain text, no per-char split) |
| FadeIn body prose | Tween skipped, paragraphs render full-opacity |
| C1 Vibecoded-stamp | Skip GSAP, render in end-state |
| C2 Skill-hover misregistration | Pseudo-elements hidden via `--rm` toggle |
| C3 Hero-skill pulse | Halo at opacity 0, timeline killed |
| B9 SVG-path-underline | Render fully drawn, no draw-in animation |
| B10 Object-Grid-Tile-Hover | No rotate, no flood, no caption shift |
| B11 Word-highlight | Spot-color stays, no animated reveal |

### A11y

- Drop-Caps: pure CSS `:first-letter`. Screen-readers read the word
  normally (no ARIA).
- Animated stamps (`[vibecoded]`, B7): the stamp animation is
  `aria-hidden`, the text content carries the accessible name.
- Hover-microeffects: `:focus-visible` triggers the same CSS so
  keyboard users see the misregistration too. No keyboard parity
  required (the effects are decorative bonuses, not function).
- Object-Grid tiles: `<figure>` with `<figcaption>`, no `role="button"`
  (tiles are not interactive — hover is decorative bonus).
- Pull-quotes: semantic `<blockquote>`. Pull-quote text + body prose
  both readable.
- Color-contrast: Pull-quote text in `text-ink` (max contrast).
  Mono marginalia in `text-ink-muted` (0.7 alpha = 6.5:1 on paper, AA).
  Spot-color drop-caps are decorative-only (`<span aria-hidden>`-wrapped
  is NOT needed because `:first-letter` is purely visual; SR reads the
  letter as part of the word, no double-read).

---

## 9 · Files-To-Touch + Files-To-Add

### Modify

- `src/components/sections/About.tsx` — full restructure
- `src/components/sections/Skills.tsx` — add C1-C3 wiring
- `src/app/globals.css` — `:first-letter` drop-cap rule, hover-misreg
  pseudo-element rules, `[data-rm="1"]` toggle infra
- `messages/{de,en,fr,it}.json` — pull-quote keys, marginalia keys,
  Object-Grid tile texts (currently the about prose is in `about.parts[]`,
  needs new keys for `pullQuote`, `marginalia`, `dropCapHint`(?), and a
  fresh `objectGrid` namespace)

### Add (proposed file layout)

```
src/components/about/
├─ AboutBlock.tsx           # generic block container w/ spot, layout, marginalia
├─ PullQuote.tsx            # XXL Italic pull-quote w/ OverprintReveal + word-highlight
├─ DropCap.tsx              # (or pure CSS, no component needed — TBD in plan)
├─ PlateCornerMarks.tsx     # 4-corner SVG `+`-style registration marks
├─ StampDivider.tsx         # asterism / dot-row between blocks
├─ ObjectGrid.tsx           # the grid container + currently sub-band
└─ stamps/
   ├─ CameraStamp.tsx
   ├─ AudiStamp.tsx
   ├─ JoggediballaStamp.tsx
   ├─ SchneeStamp.tsx
   ├─ TauchenStamp.tsx
   └─ PingPongStamp.tsx

src/components/skills/
├─ VibecodedStamp.tsx       # animated [vibecoded] marker
└─ HeroSkillPulse.tsx       # ambient halo behind XXL hero skill

src/components/motion/
└─ MisregistrationHover.tsx # CSS-only hover-glitch wrapper (or pure CSS class — TBD)
```

Final decomposition is up to the implementation plan — this layout is
one viable shape, not a hard requirement.

---

## 10 · Implementation Boundaries

### NOT in scope

- Briefing § 2.2 prose changes — voice and content stay verbatim.
- New About content (no new parts, no new bios).
- Translation of new keys into FR/IT/EN — DE-mirror per Phase 6/7/8/9
  pattern, proper translation lands in Sprint 5 (Phase 11).
- C4 Tier-Flood — future add-on, recorded.
- New deps (no `lucide-react`, no icon library).
- Changes to Hero, Work, CaseStudy, Photography, Playground, Contact.
- Changes to FluidSim or any WebGL pipeline.

### In scope

- Full visual rework of About (`<About />`).
- C1+C2+C3 effects on Skills (`<Skills />`).
- New About-domain primitives (block, pull-quote, drop-cap, stamps,
  object-grid, plate marks).
- Skills VibecodedStamp + HeroSkillPulse primitives.
- CSS additions for drop-cap and hover-misregistration.
- Message-key additions for pull-quotes + marginalia + grid texts.

---

## 11 · Acceptance Criteria

The rework lands when:

- All 8 spine items (00 header through 07 AI-Pinsel-Closer) render
  per § 3, on mobile and desktop.
- Pull-quotes have OverprintReveal + spot-color word-highlight + B9
  underline animation (when in motion).
- Drop-caps render in block-keyed spot-colors on blocks 01-04.
- Plate-corner-marks render at section + grid corners.
- Object-Grid renders all 6 inline-SVG stamps with hover effects.
- Currently-block (Briefing § 2.5) is fully removed from About;
  its semantics live in the grid + sub-band.
- Skills shows animated `[vibecoded]`-stamps on tier reveal,
  per-skill hover-misregistration, and Hero-skill ambient pulse.
- All effects respect `prefers-reduced-motion: reduce`.
- All A11y rules from § 8 hold; axe stays clean.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:a11y` green.
- No regression on Iris Xe `< 40fps` Low tier (no new heavy GPU work
  is added — the effects are CSS/GSAP/SVG, not WebGL).

---

## 12 · Open Implementation Decisions (deferred to plan)

- DropCap as pure CSS via `:first-letter` (smaller) vs as a
  `<DropCap>` component (more controllable). Lean: pure CSS unless
  the spot-color rotation needs JS-driven dynamism.
- Stamp-divider asterism vs dotted-row vs hand-stamped svg —
  prototype during implementation, pick visually.
- MisregistrationHover as pure CSS class (`.skill-name`) vs wrapper
  component. Lean: pure CSS.
- Block 04 "loud-block" body: 1-column or 2-column? Prototype during
  implementation.
- Plate-corner-mark exact glyph: `+`, `⊕`, `✚` — prototype, pick.

---

**End of design spec.** Implementation plan to follow under
`docs/superpowers/plans/`.
