# Manuel Heller — Craft Portfolio (Claude Code brief)

Awwwards-grade personal portfolio. Design direction **Toon Fluid**: fullscreen
GPU Navier-Stokes fluid sim, cel-shaded in Risograph aesthetic, cursor IS the
force source. Static export → Nginx. Full spec in [`docs/plan.md`](../docs/plan.md).

## Commands

- `pnpm dev` — localhost:3000
- `pnpm build` — static export to `./out`
- `pnpm lint` / `pnpm format` — Biome (project-wide)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Playwright smoke
- `pnpm lighthouse` — LHCI against `./out` (broken on Windows; use CI)
- `pnpm ci:local` — lint + typecheck + build + test (mirrors CI 1–4; run before every push)

**Package manager is pnpm**, not Bun — plan deviation (§3 still says Bun).

**When pnpm scripts break via WSL** (see "Tooling / Windows specifics"),
invoke the tools directly: `node node_modules/typescript/bin/tsc --noEmit`,
`node node_modules/@biomejs/biome/bin/biome check .`,
`node node_modules/next/dist/bin/next build`,
`node node_modules/@playwright/test/cli.js test --grep-invert "@visual"`
(with `$env:E2E_TARGET='prod'; $env:PORT=<free port>`).

## Folder conventions

- `src/app/` — App Router pages & layouts (locale segment lives here)
- `src/components/ui` — pure DOM components
- `src/components/sections` — page sections (Hero, About, Work, Playground, Contact)
- `src/components/scene` — WebGL/R3F wrappers; one persistent `<Canvas>` only
- `src/components/motion` — GSAP primitives
- `src/shaders/` — GLSL split into `common/`, `fluid/`, `ink-mask/`, `ink-wipe/`, `text-fluid/`. The retired `toon/` and `photo-duotone/` subdirs no longer exist — duotone treatment was reversed (see "Visual / image policy" below).
- `src/lib/` — `raf.ts`, `gpu.ts`, `motion/tokens.ts`, `i18n/`, `content/`, `site.ts` (central identity: URL/email/socials), `gl/compileShader.ts` (shared, with `#version`-strip)
- `src/hooks/` — `useLenis`, `useReducedMotion`, `useGPUCapability`, `useMousePosition`
- `content/` — MDX (project-scoped, 4 locales per file)
- `messages/` — next-intl UI strings (de/en/fr/it)

## Design tokens

Source of truth: `src/app/globals.css` (`@theme` block).

- Palette: `--color-paper{,-tint,-shade,-line}`, `--color-ink{,-soft,-muted,-faint}`,
  4 spots `--color-spot-{rose,amber,mint,violet}`
  - `--color-ink-muted` is `rgba(10,6,8,0.7)` (≈6.5:1) — not the 0.55 from
    plan §4.1. At 0.55 small mono labels fail axe (4.27:1 < AA 4.5:1).
  - `--color-ink-faint` (0.28) is **decorative-only — never text** (1.91:1).
- Fonts: `--font-display` (Instrument Serif, **static** — no variable axis
  exists upstream; Phase 5 Overprint-Reveal uses DOM char duplication, not
  weight morph), `--font-body` (Inter Variable),
  `--font-mono` (JetBrains Mono Variable)
- Motion tokens in TS: `src/lib/motion/tokens.ts` (`ease.expo/riso/fluidDrag`,
  `dur.micro/short/medium/long/epic`)
- **Hero is right-aligned (asymmetric) — never centered, never left-aligned.**
- Container utilities: `.container-page` (96rem) for most sections,
  `.container-page-wide` (110rem) for sections that need ultrawide breathing
  room (Object-Grid, AI-Workflow loud-centered block).

## Performance rules

- Single persistent R3F `<Canvas>` — never remount per section
- All animations share one RAF ticker (GSAP + Lenis + R3F coordinated in `raf.ts`)
- Hero FluidSim runs everywhere (no IO-pause, no runtime watchdog) — pointer
  drives ink across all sections including Photography ambient splats
- **Startup warmup gate**: `FluidOrchestrator.step()` short-circuits until
  `start()` (or `triggerAmbient()`, which calls `start()`) is invoked. Hero
  rig keeps the gate closed through loader + hero-reveal so the 8-pass sim
  pipeline doesn't burn GPU and stutter the OverprintReveal animation;
  `FluidSim` opens it ~2400ms after `loader-complete`. Mini-sims and Studio
  call `start()` directly at init (they manage ambient themselves). Don't
  remove the gate — it's load-bearing for the hero text reveal feel.
- 5 quality tiers: High 512² / Medium 256² / Low 128² / Minimal 96² / Static-WebP
  - Tier picked at startup by `lib/gpu.ts` + `useGPUCapability` (renderer
    name match + frametime probe). `useGPUCapability` lazy-inits from
    localStorage cache to avoid blank-flash mid-session reinit.
  - **Don't add a runtime watchdog to `FluidSim.tsx`** — if a tier proves
    too heavy in the wild, drop its config in `lib/gpu.ts` instead.
- **Iris Xe is a supported target** (Manuel's work laptop) — no regression
  that drops Low tier below 40fps
- Plan §8 budget: Lighthouse perf ≥ 95, a11y 100, LCP < 1.8s, CLS < 0.05,
  initial JS (gz) < 130kB
- **CI-asserted reality** (`.lighthouserc.json`): perf ≥ 0.55 (warn),
  a11y ≥ 0.95 (error), CLS ≤ 0.1 (error), LCP/TBT/script-size warn relaxed.
  Continuous FluidSim caps perf around 0.6 (TBT artefact of always-on RAF).
  Don't retighten until perf-optimisation sprint lands.

## i18n rules

- 4 locales: `de` (default), `en`, `fr`, `it`
- No hard-coded strings in components — always through next-intl
- **No em dashes ("—") in any user-visible copy** — Manuel reads them
  as an AI tell ("schreit extrem nach AI"), same for ad-speak negation
  phrases ("Kein leeres Versprechen"). Rewrite with period/comma/colon;
  title separators use "·"; date ranges use en dash ("2016–2020",
  "seit 11/2021"). Purged site-wide 2026-07-20 (messages/** + component
  strings) — don't reintroduce.
- Content MDX has 4 per-locale variants (e.g. `project.de.mdx`)
- Routes always include the `[locale]` segment
- **Pull-quote keyword marker is `[[keyword]]`, not `{keyword}`** — next-intl
  treats curly braces as ICU placeholders (FORMATTING_ERROR).
- **Translation pattern**: shell strings (nav, footer, labels) are properly
  translated per locale; large body content (case-study, photography,
  legal, contact, about-rework keys) is DE source mirrored verbatim into
  EN/FR/IT until a dedicated translation pass lands.
- `src/lib/site.ts` holds technical constants (URL, email, socials, region).
  These are NOT next-intl strings — one file beats four JSONs in sync.

## Accessibility (non-negotiable)

- `prefers-reduced-motion`: sim → pre-rendered WebP, GSAP durations → 0
- Keyboard nav, visible `:focus-visible` ring on `--color-spot-mint`
- Semantic landmarks: `<main>`, `<section>`, `<article>`, `<nav>`
- Alt text on every photo; ARIA labels on icon buttons + meaningful canvases
- Axe-Playwright in CI; build breaks on violations

### A11y traps (re-discovered multiple times)

- **`<aside>` inside `<section>` fails axe `landmark-complementary-is-top-level`**
  — demote to `<div>` (bit Phase 6 About, Phase 9 Photography meta-text).
- **`aria-label` on role=generic (default `<span>`) fails axe** — accessible
  name must come from sr-only child or content, not the attribute.
- **Inline-block per-char composition (OverprintReveal) breaks AccName**
  — SRs spell-read each char as a word. Wrap composition in
  `aria-hidden="true"` + sibling `<span className="sr-only">{text}</span>`.
- **Spot colors as text fail AA**: rose 2.19:1, amber 1.28:1 on paper.
  Use spot colors as **fills** (pills, dots, frames), with `text-ink` for
  the label. Mint+violet on paper are AA-passable but check before use.
- **`text-ink-faint` is never text** (1.91:1). Captions/muted prose use
  `text-ink-muted` (~6.5:1).
- **Decorative effects don't earn focus stops** — `tabIndex={0}` on hover-
  misreg wrappers without action attached is keyboard-noise, not parity.

## WebGL / shader traps

- **`compileShader` helper at `src/lib/gl/compileShader.ts`** — single shared
  implementation. Strips leading whitespace and ensures `#version 300 es` is
  literally line 1 (raw-loader / Turbopack HMR can deliver cached-stale
  newlines that break GLSL ES 3.00 silently).
- **Don't call `WEBGL_lose_context.loseContext()` in cleanup** — under
  React StrictMode the same canvas survives mount→cleanup→mount, and per
  WebGL spec `getContext` on a lost-context canvas returns the same dead
  context. Subsequent compiles fail silently with `null` info-log. Cleanup
  deletes programs/buffers/textures/VAOs only; GC drops the context when
  the canvas element actually unmounts.
- **ASCII-only in shader sources** — Windows ANGLE chokes on Unicode in
  comments (→, ×, °). Use `->`, `x`, `degrees`.
- **GLSL transport**: webpack `asset/source` rule + Turbopack
  `turbopack.rules["*.glsl"] = { type: "raw", as: "*.js" }` + `raw-loader`
  for inlined-string imports.
- **`UNPACK_FLIP_Y_WEBGL`** when uploading Canvas2D → GL texture (Canvas2D
  is Y-down, GL UV is Y-up). Reset to `false` after to not affect other
  uploads.
- **No `gl.readPixels`-based progress polling** — readback stalls the
  pipeline. Use deterministic duration-based completion (PhotoInkMask
  pattern: `REVEAL_DURATION_MS = 3000`, then snap opacity 0 + unsubscribe).

## Visual / image policy

- **Pro photos and screenshots never get duotone/posterise shaders.** Visited
  this lesson 3× (Phase 6 portrait, Phase 8 case-study, Phase 9 photography
  pivot). Riso aesthetic lives in **framing** (paper-shade backing, ink
  border, spot-color offset shadow) and in **animation/typography around**
  the photo, not in pixel-level recolor. Photo-duotone shader stack is
  retired site-wide.
- **`<picture>` over next/image** — `images.unoptimized: true` (required by
  `output: "export"`) disables optimization anyway. Native `<picture>` with
  AVIF + WebP + JPG srcsets, same output, no runtime cost.
- **Asset pipeline**: `scripts/optimize-assets.mjs` (`.mjs`, not `.ts` — no
  ts-runner in devDeps). Per-task `quality` field for AVIF override on
  detail-heavy shots (q38–q50 vs default q60).
- **Override note**: `docs/content-briefing.md` §§2.4, 5.2, 6.2 still describe a Riso-Duotone shader treatment — that direction was reversed. The framing-only rule above wins.

## Sim presets & night theme

- **5 user-switchable presets** (riso/wave/turbulenz/aquarell/nachtdruck)
  defined in `src/lib/content/simPresets.ts`; persisted selection in
  `src/lib/simPresetStore.ts` (zustand + localStorage `manus-sim-preset`).
- **One render shader per preset** (theme-differentiation pass): riso =
  the ORIGINAL soft-ladder + Sobel pooling (deliberately the quietest —
  it's the default under the hero text; the louder overprint rework was
  demoted from default after user feedback), wave = overprint ring-band
  plates + misreg seams + ink bleed in a blue plate ladder, turbulenz =
  screenprint comic (hard bands, halftone, ink contour lines), aquarell =
  wet blur + granulation + wet-edge rims, nachtdruck = neon terraces +
  additive glow + chroma fringes. All five compile at `init()`; selection
  via `FluidVisuals.style` (exhaustive switch in `renderProgram()`).
  `render-toon.frag.glsl` is retired (its look lives in render-riso).
  Blur hierarchy is deliberate: aquarell >> riso > wave/turbulenz/
  nachtdruck (crisp).
- **Idle ambient swarm**: the ambient rig runs up to 10 wandering points
  (3 hand-tuned A/B/C + 7 procedural golden-angle extras) —
  `FluidVisuals.ambientPointCount` picks how many, `ambientChurn` (0..1)
  cycles points beyond A/B in/out on staggered ~10-20s sines (visible
  spawn/despawn; dye deposit fades with the life gate via runSplat's
  dyeMul). Turbulenz 8/full churn so the swarm persists while IDLE too
  (user feedback: pointer-only multi-splat "verschwindet gleich"),
  nachtdruck 6/0.8, wave 6/0.7. Defaults 3/0 = original rig.
- **Wave is a full page theme**: `theme: "wave"` re-inks paper AND ink
  family (blue-black on blue-white, globals.css) — unlike warm/wash
  which only tint paper. Switcher dot uses `swatchHex` (blue sits
  outside the four canonical spots).
- **PhotoInkMask follows the theme**: mask paper = preset sim paper,
  per-photo spot maps onto the preset ladder slot (mint=0/amber=1/
  rose=2/violet=3, the legacy uniform order), read per frame, gated on
  `data-sim-theme` so the static tier stays canonical.
- **Render shaders are `precision highp float`** — the shared noise include
  overflows fp16 internally (`permute` ~3e6) and pixel-space halftone
  coords exceed fp16 range; sim passes stay mediump. Halftone uses
  `gl_FragCoord.xy` (spec-guaranteed highp), Sobel steps in SIM texels
  (`uSimTexel`) so edge response is viewport-independent.
- **Per-style knob reuse**: `FluidVisuals.edgeStrength` means contour-line
  strength (turbulenz), wet-edge darkening (aquarell), glow gain
  (nachtdruck); riso ignores it. A shader that doesn't declare a uniform
  no-ops it (null location).
- **Two-channel application**: physics subset via `setParams()` (reset to tier
  baseline first — never touches gridSize/halfRate/pressureIterations, so weak
  GPUs can't regress), look via `setVisuals(FluidVisuals)` (style,
  outline, grain, paper, 4-slot color ladder, splat scales/count/scatter,
  ambient multipliers).
- **Multi-splat swarm**: `splatCount`/`splatScatter` in FluidVisuals —
  turbulenz throws 7 tiny jittered droplets per pointer frame (position AND
  direction jitter; N parallel copies of one stroke otherwise).
  dye/velocityScale are per-droplet — retune them when changing count.
- **Ink cursor follows the theme** via `--color-ink-cursor` (globals.css,
  `:root` + per-`data-sim-theme` overrides; decorative, visibility-picked,
  not AA). InkCursor reads computed color per frame — live on switch.
- **FluidSim re-applies the preset after every orchestrator init** (tier
  auto-tune re-creates the orchestrator) and fires a center splat-burst on
  live switches only. `firePresetBurst` previews the preset's STEADY-STATE
  character (radius × splatRadiusScale, swarm presets detonate a scattered
  droplet cloud, ring splats seat off-centre) — "start must match idle"
  was explicit user feedback; don't revert to a one-size celebration.
- **Theme follows through to content**: the Work-card Joggediballa shot
  swaps to the real darkmode screenshot under Nachtdruck
  (`JoggediballaScreenshot`, gated like SimThemeSync so static tier keeps
  light); the Portfolio card shows a **five-theme split composite**
  (`homepage-themes-*`, five vertical hero slices in switcher order with
  ink seams — composed via scratchpad Playwright + sharp, master in
  content-input, pipeline task in `optimize-assets.mjs`). Night theme
  swaps the three raster object-grid stamps (car/joggediballa/pingpong)
  to hand-recolored `-dark` PNG variants (generate-icons.mjs emits them;
  masters in content-input/icons) — CSS filters can't re-ink raster
  accents (invert turned the pingpong ball brown, joggediballa mint dark
  green). Swap logic + hydration gating in `useNightTheme` (shared by
  `RasterStamp` and `JoggediballaScreenshot`); the three SVG stamps
  (camera/schnee/tauchen) re-token via CSS and don't swap. Warm/
  Turbulenz adds a layered paper `text-shadow` halo on main/header/
  footer for glyph contrast over hard bands.
- **Switcher UX**: pointer-selection blurs the radio + disarms
  group-hover until pointerleave (immediate collapse); keyboard keeps
  focus/expansion. On first appear the pill unfolds for 6.5s
  (`INTRO_PEEK_MS` discoverability peek; `expanded` drives mobile,
  `introPeek` the md: pill). During the peek `SimPresetSwitcherHint`
  renders the onboarding note: hand-drawn SVG arrow (pathLength dash
  draw + rose misreg ghost) + typewriter paper chip, fully decorative
  (aria-hidden, pointer-events-none), breakpoint-mirrored to the pill's
  corner. Peek (and hint) end early on selection, manual toggle, OR
  real scroll (>160px — a scrolled user has moved on; without this the
  fixed hint floats over mid-page content). Desktop chip sits at
  md:bottom-10 to clear the hero bio stamps (screenshot-verified).
- **Console menu + easter egg**: `ConsoleMenu` (root layout) prints the
  MANUS banner once (module flag vs StrictMode) and installs
  `window.manus` = help/preset/burst/fehldruck — file-top
  `biome-ignore-all lint/suspicious/noConsole` MUST precede "use client".
  `PrintJamOverlay` runs the Fehldruck sequence (Konami via `e.code` +
  printJamBus): `<html data-print-jam>` jitters headings (CSS in
  globals.css), splat storm via fluidBus, reject-stamp then
  NEU KALIBRIERT; reduced-motion = static stamp only. Stamp strings live
  in the `easterEgg` common.json namespace (identical across locales).
- **Playground/mini-sims inherit look only** via `syncPresetVisuals()` —
  their tuned physics stays authoritative. Two option flags matter:
  `lookOnly` applies ONLY the render subset (style/paper/ink/ladder/
  grain/edges) and leaves the caller's splat-feel (count/scatter/
  velocity/dye scale) alone — Type-as-Fluid needs this because the
  preset swarm feel is tuned for the hero's fast dye fade and piles
  into a solid dark mass under the experiment's slow-fade text physics
  (turbulenz's density-to-dark shader makes it obvious). `cursor-
  SplatRadiusBase` re-scales the hover cursor by the preset's
  splatRadiusScale on each switch (turbulenz tiny, aquarell a bloom).
  InkDropStudio instead applies full preset physics via its Tweakpane
  sync, so it keeps the swarm.
- **Type-as-Fluid auto-writes a fresh word every 6.5s** (continuous
  self-rearming rotation) AND re-inks immediately on preset switch.
  The catch: each stamped word blooms + spreads viewport-wide, so
  repeated stamping piles the dye into a solid mass under turbulenz's
  density-to-dark shader. The fix is `autoStamp()` = `orchestrator
  .reset()` THEN stampWord, so the canvas is always one clean word at
  a time on EVERY device — no reliance on the dye fading fast enough
  between stamps (which throttles hard on weak GPUs / headless).
  Rotation is gated on `lastTypedAtRef` (updated on typing AND
  cursoring) so it never wipes ink mid-gesture. `pickWord()`
  centralizes typed-vs-default selection.
- **Playground preset switcher is a DOCKED bar, not the floating pill.**
  `PlaygroundPresetBar` (a labeled riso card) flows in the
  ExperimentChrome title column (below caption on mobile, below title
  on desktop — adapts to caption height); the site-wide
  `SimPresetSwitcher` returns null on `/playground/*` (usePathname,
  locale-stripped) so there's one switcher per screen. `swatchGradient`
  is exported from SimPresetSwitcher for reuse. InkDropStudio's
  Tweakpane docks bottom-centre on mobile (thumb zone, above the button
  row) / top-right on desktop (a control column with the preset bar);
  its title is "SIM-PARAMETER" (not a second page title). The
  ExperimentChrome back link is `self-start` (bordered stamp hugs
  content). BOMB splats sustain over ~8 frames (full impulse frame 0,
  gentle dye deposits after) so each splat builds into a pool instead
  of a one-frame poke.
- **Ladder contrast rule**: light-theme ladder bands must never approach
  text-ink luminance — DOM text sits on top of the sim; a near-black pool
  under near-black type is unreadable (screenshot-verified).
- **Nachtdruck = night mode**: preset `theme: "night"` → `SimThemeSync` sets
  `<html data-sim-theme="night">` → CSS var overrides in globals.css flip the
  whole token set (dark paper / light ink). Sim paints near-black paper with
  an ascending (glowing) posterized ladder.
- **LightningCSS trap**: `color-scheme` inside a non-`:root` rule makes the
  Turbopack CSS pipeline's polyfill drop the ENTIRE rule silently. Never add
  `color-scheme: dark` to the night block.
- **Visual tuning workflow**: headless-Playwright screenshot scripts against
  the dev server (pin tier via localStorage `manus-gpu-tier`, set preset,
  synthesize pointer churn, screenshot) — used for the turbulenz/nachtdruck
  retunes and the per-preset shader pass; far faster than eyeballing param
  changes blind. Verify at BOTH high and low tier — blur radii and band
  edges are constant in UV, so their ratio to a sim texel swings ~4x
  between 512^2 and 128^2 grids.

## Mobile architecture (post mobile-wow-pass)

- **All coarse-pointer devices (phone + tablet) run the live
  `MobileBackgroundSim`** — one fixed full-viewport WebGL2 canvas behind all
  content, own orchestrator. The `AmbientVideo` tablet fallback (8MB mp4) is
  retired; SceneProvider routes coarse → MobileBackgroundSim, fine-pointer →
  SceneCanvas+FluidSim.
- **Scroll behavior is platform-split** in MobileBackgroundSim: the
  fade-out/in scroll-drain runs on iOS/iPadOS ONLY (masks the fixed-WebGL
  momentum-scroll cull — a real iOS Safari bug). Everywhere else the sim
  stays visible while scrolling and scroll velocity injects an invisible
  force splat (zero-dye) so ink drifts with the page. Don't reintroduce a
  blanket drain — the blank-on-scroll flicker was explicit user feedback.
- **Presets + themes are pointer-agnostic**: MobileBackgroundSim applies the
  persisted preset on init + live on store change (same wiring as FluidSim);
  SimThemeSync and SimPresetSwitcher gate only on `config && !reducedMotion`.
  Switcher renders as a horizontal bottom-left row with 44px touch targets
  below `md`; from `md` up a vertical pill that rests as the active dot
  and expands on :hover OR :focus-within (focus keeps the native-radio
  arrow-key pattern working — collapsed dots are h-0, not display:none).
- **Tap-to-splat** reads touch at document level; taps on interactive UI
  (`a/button/input/label/[data-no-splat]`) are ignored; color is a random
  spot per tap.
- **Side-swipe carousels: use sparingly, not never.** Manuel finds them
  genuinely cool in the right situation — three at once was just too
  many. ObjectGrid (responsive 2-col grid) and Photography (vertical
  editorial stack, `PhotographyMobile`) went vertical in the mobile
  wow-pass; the Case-Study `CaseStudyMobileCarousel` deliberately keeps
  its side-swipe because the horizontal movement IS the diorama metaphor
  (desk slides, mirroring the Desktop horizontal-pin track) — Manuel
  explicitly asked for it back after a first cut removed it. A new
  carousel needs a reason like that, not just "content overflows".
- **FadeIn on potentially-viewport-tall blocks needs a low `threshold`**
  (~0.15): IO `intersectionRatio` can never reach the default 0.35 when the
  element is taller than the viewport → entrance never fires.
- **ScrollProgress is Desktop/Tablet-only** (`useMobileLayout` gate) — on
  phones the fixed right-edge rail sat on top of full-width content.

## Tailwind / dynamic classes

- **Never `bg-spot-${slot}` interpolated**. Tailwind v4 JIT scans literal
  strings; dynamic values are purged. Use static map:
  `const SPOT_BG_CLASS = { rose: "bg-spot-rose", amber: "bg-spot-amber", ... }`.
  Same trap bit Photography (`SPOT_BG_CLASS`) and PlaygroundCard.
- **Custom utilities** (`.type-body-sm`, `.riso-input`, `.riso-submit`,
  `.pull-quote`, `.misreg-hover`, `.plate-corners`) live in `globals.css`.
  When adding a new util, define it BEFORE first use site or it's a no-op.

## State / data flow

- **`fluidBus`** (`src/lib/fluidBus.ts`) — pub/sub for fire-and-forget splat
  injection (Work cards → root FluidSim). Cleared when sim is paused.
- **`inkWipeStore`** (zustand) — 4-phase state machine for the page-transition
  primitive (PlaygroundCard → InkWipeOverlay).
- **`sceneVisibilityStore`** (zustand) — toggles `display: none` on the root
  scene without unmounting; `/playground/[slug]` flips this so the experiment
  owns the viewport while the hero state survives back-nav.
- **`setTimeout` in components**: always track in a ref + clear on unmount.
  Bit ContactForm, PlaygroundCard, Photography. React's "state update on
  unmounted component" warning is the canary.
- **`gsap.killTweensOf(target)` misses dummy hold-tweens with `target = {}`** —
  track `activeTl` and `activeTl?.kill()` on unmount instead (HeroSkillPulse
  pattern).

## Section architecture (non-obvious choices)

- **Hero**: H1 uses two `OverprintReveal` separated by aria-hidden slash;
  second gets `delay={0.25}` for choreography. Each instance owns its own IO
  + GSAP lifecycle (no parent timeline).
- **About**: 8-spine flow (header → 4 storied PullQuote blocks → portrait →
  object-grid → AI-closer). Per-block spot color via `--block-spot` CSS
  variable cascading to drop-cap (CSS `:first-letter`) and `.pull-highlight`.
  `<StampDivider>` is a sibling of `<AboutBlock>` (not nested) so cascade
  doesn't reach it — takes a `spot` prop instead.
- **Object-Grid tile reveals** (creative pass): tiles listed in
  `src/components/about/tileReveals.ts` (`TILE_REVEAL_KEYS`) carry a
  stretched button + corner "+" chip; click opens `TileRevealOverlay`
  IMMEDIATELY with a ~320ms "Andruck" registration snap: the spot
  plate (a rough-edged SVG rect behind the photo) travels in from
  translate(38,42)+1.4deg, overshoots past its resting 8px offset and
  seats; the photo fades 0.55→1 over scale 1.04→1; the caption stamps
  a beat later (`tile-plate-in` & friends in globals.css). Three
  iterations got here, so don't undo any of them:
  - The original full-page ink-wipe reuse (~1s) was cut as too slow.
  - v2 animated **`box-shadow`** from out-of-register and scaled the
    whole `<figure>` from 1.14 behind a blobby ink rim. box-shadow is
    not compositor-animatable (it repainted a fullscreen photo every
    frame → "holprig"), the figure scale dragged the caption, and the
    rim pushed past the viewport ("unten abgeschnitten"). Everything
    animated is now transform/opacity only.
  - The plate's timing function must **not** overshoot on its own: a
    back-ease applies per keyframe segment and consumed ~85% of the
    travel in the first 60ms, making the move invisible. Overshoot
    belongs in the keyframes, the curve only decelerates.
  - The plate's `inset-0` must resolve against the PHOTO (own
    `relative` wrapper), not the `<figure>` — anchored to the figure
    it painted a solid spot block behind the caption text.
  - The photo may not start at opacity 0: that flashed the bare
    full-size spot plate for ~2 frames.
  Open drops one fluidBus splat at
  the pointer, close leaves a two-splat burst at the tile (desktop
  only — no mobile subscriber).
  The overlay is a **fixed div, NOT `dialog.showModal()`** with manual
  focus pin/restore (single close control). Heads-up for tests: the
  mobile hamburger nav keeps a permanent `role="dialog"` node in the
  DOM — select the overlay via `[aria-labelledby="tile-reveal-caption"]`,
  never by bare dialog role. Manuel authors BOTH crops per tile
  (`content-input/about/tiles/{key}-{landscape|portrait}.{jpg|png}`,
  uniformly 16:9 / 2:3 since the second image drop); pipeline group
  `about-tiles` only scales — never re-crop his framing. Orientation
  picked at view time via `<source media="(orientation: portrait)">`.
  pingpong tile has no master yet → stays decorative until one lands
  (drop-in path documented in tileReveals.ts). Reduced-motion opens
  statically, no splats.
- **optimize-assets.mjs single-resize rule**: sharp honours only the
  LAST `resize()` in a pipeline — aspect-crop + width-scale MUST happen
  in one call (fixed in the creative pass; the old two-step silently
  dropped the crop and nobody noticed because every earlier master was
  pre-cropped to the task aspect). The runner falls back to a `.png`
  sibling when a task's `.jpg` source is missing (tauchen video stills).
- **Image quality floor for pro photos: avif q60 / webp q82.** The
  earlier q38–50 range showed visible compression at display size —
  explicit user feedback ("da will ich meine Photography-Skills
  zeigen"). Full-bleed photography slides (sizes=100vw) also need a
  ~2560w srcset rung or large/high-DPR screens upscale 1600w. All five
  slides now ship the full set; 01-pelican's master is
  `DSC05422-Verbessert-RR.jpg` (4524×3016, native 3:2 — an earlier
  note pointed at DSC05426, which does not exist).
- **Skills**: `VibecodedStamp` IO `threshold: 0.4`; stagger via parent
  `delay={i * 0.08}` prop. `HeroSkillPulse` loops continuously without IO
  gate (cheap, avoids re-mount cycle restart).
- **Work**: editorial DOM/SVG cards (no 3D toon planes — would compete with
  hero sim). Cards dispatch splats via `fluidBus`. The generative-SVG
  `PortfolioCardVisual` era is over: the Portfolio card shows the real
  five-theme split screenshot behind `PortfolioCardReveal`'s hover stage,
  Joggediballa shows real shots (`JoggediballaScreenshot`, night-aware).
  Below the two hero cards sits the **side-projects strip**
  (`SideProjectCard`, server-rendered, CSS-only hover): Shot-Counter +
  full-project-rework as compact catalog cards linking to GitHub.
  Label is "Weitere Projekte" — the earlier "B-Seiten" wording was cut
  (user: they're projects, not sides). Repo URLs live in `SITE.repos`
  (site.ts), spots mint/violet (the pair the hero cards don't use).
  The section stays "two intentional projects" — a third hero card
  needs a reason, not just a new repo.
- **Case Study**: inline section, NOT a `/work/[slug]` route. Diorama design
  (one wide SVG illustration + absolute-positioned HTML cards in vh units,
  4200×1000 viewBox at 100vh tall = 420vh wide horizontal-pin track).
  - Mobile/reduced-motion fallback breakpoint is **height-aware**:
    `(max-width: 767px), (max-height: 899px)` — catches 1366×768, 1600×900.
  - `bg-paper` on `<DioramaTrack>` isolates from root FluidSim ink bleed.
  - `<DioramaTrack>` ScrollTrigger uses `kill(true)` on cleanup to revert
    pin spacers when reduced-motion / resize toggles desktop branch off.
  - **Pin an INNER wrapper, never the `section#case-study` itself.**
    The section is a direct child of `<main>`; ScrollTrigger's
    pin-spacer re-parents the pinned element, and on client-side
    navigation React's deletion pass calls `main.removeChild(section)`
    → NotFoundError ("Failed to execute 'removeChild'"). Passive
    effect cleanup (and the sceneHidden kill) runs AFTER that DOM
    mutation on layout-mount routes (/cv, legal), so no store dance
    can save it — only keeping the spacer INSIDE the section does.
    Regression spec: tests/e2e/route-transitions.spec.ts.
  - `Polaroid` is case-study-exclusive; About-Portrait uses
    `src/components/ui/Portrait.tsx` (different component, no token cross-talk).
- **Photography**: editorial-asymmetric flow (full-bleed + side-text-paired
  layouts), no sticky pins, no ScrollTrigger. Each `PhotoInkMask` owns an
  isolated WebGL2 context with simplified two-program sim (advect + splat +
  mask, no pressure solve). Trigger IO: `rootMargin: "-20% 0px -20% 0px"`,
  `threshold: 0` — fires when photo enters central 60% band. Document
  pointermove listener detached + ambient queue cleared at reveal lock.
- **Playground**: Tweakpane ships in prod (the demo IS runtime parameter
  exploration). Tweakpane v4 replaced Leva (SF-7) — single consumer in
  `InkDropStudio.tsx`. Theming via `--tp-*` CSS variables on the wrapper
  `<div className="riso-tweakpane">` (defined in `globals.css`), no
  fixed-positioned portal-to-body so `data-no-splat` lives on the
  wrapper. Pane mutates a stable `paramsRef.current` object and fires
  `on('change')`; we forward to the orchestrator without React re-renders.
  Mini-sims on cards stay paused after first hover/focus for instant
  re-hovers. Dynamic-imported in `/playground/[slug]` so home pays zero
  cost.
- **Contact**: form POSTs JSON `{name,email,message}` same-origin to
  `/api/contact`, handled by a **Cloudflare Worker → Resend** bridge (live
  2026-06-19). The Worker is bound to route `manuelheller.dev/api/contact` and
  intercepts at the CF edge **before** nginx — no server runtime, no nginx edit
  (the box has no PHP; the old `infra/contact/` PHP-FPM template is superseded
  and unused). Worker code + setup in `infra/contact-worker/`. On any failure
  the form degrades to a `mailto:`SITE.author.email` link (messages never
  lost). Honeypot field (`bot-trap`, off-screen, `tabIndex=-1`, `aria-hidden`)
  — trip silently swallows (`return` after `preventDefault`), re-checked
  server-side in the Worker; never expose mailto fallback to bots.
- **Legal**: `/[locale]/impressum` + `/[locale]/datenschutz` as separate
  routes through shared `<LegalDocument namespace>` server component.
  CH-conform DSG/revDSG + EU DSGVO informational. No cookie banner (site
  sets no cookies; documented in datenschutz).
- **CV**: `/[locale]/cv` press proof (`CvDocument`, server component; own
  `cv` i18n namespace — DE authored, EN translated, FR/IT DE-mirrored).
  **`window.print()` IS the PDF export**: the `@media print` block in
  globals.css strips chrome (`nav, [data-site-chrome], .skip-link,
  .fixed` — the site Footer carries `data-site-chrome`; a bare `footer`
  selector would also swallow the CV sheet's own footer) and forces
  `print-color-adjust: exact`, so the PDF prints in the ACTIVE
  ink character (Nachtdruck included) — don't add a build-time PDF
  generator.
  - **Print parity is the design rule**: the sheet is a fixed
    `max-w-[184mm]` block, fixed rem type only (NO vw/clamp — viewport
    units resolve differently against the A4 page box), `@page` margin
    11mm. Screen and PDF share ONE geometry; only desk backdrop,
    topbar, and shadow are `print:`-stripped. Never add `print:` size/
    gap/column overrides — that reintroduces the shifted-PDF bug.
  - **`break-inside-avoid` scales with block size.** A page-sized
    section with an avoid gets shoved wholesale and strands a third
    page (the original bug), so Berufserfahrung and Eigene Projekte
    stay breakable and carry ITEM-level avoids. The short sidebar
    sections (all <250px against a 1039px page) take a section-level
    avoid via `CvSection keepTogether` — otherwise the boundary sliced
    straight through Sprachen.
  - **The sheet is a two-page budget, and it is TIGHT** (~2000px of
    2078px available; EN has ~250px more headroom than DE/FR/IT).
    Decorative height is not free: absolutely position ornaments.
    `tests/e2e/cv-print.spec.ts` asserts exactly 2 pages in all four
    locales via a real `page.pdf()` — if it fails after a content
    edit, trim the sheet's vertical rhythm, not the content.
  - Pressroom ornaments all ride tokens (theme-aware): Druckprobe
    calibration bar, ink blobs/droplets, wobble rules with hanging
    ink drips (`WobbleRule drips=`), misreg double ghost on the name
    (`.cv-name` — a CLASS, never an inline style, so the per-theme
    blocks can override it), and `CvInkStamp` — a client island that
    names the active ink character by reading `<html data-sim-theme>`
    (NOT the preset store: on reduced-motion/static tier the store may
    hold a preset the sheet never applies).
  - **Theme character on the sheet** (`CvSimFrame` + `.cv-theme-
    texture`, per-theme blocks in globals.css). The sheet is opaque
    paper sitting ON TOP of the sim, so none of the sim's look reaches
    it on its own. `CvSimFrame` prints the render pass's posterized
    ladder as a still frame (top + flipped at the foot) and each theme
    adds its shader's signature: Wave overprint bands + channel-split
    headings, Turbulenz halftone screen, Aquarell wet blur + pooled
    corners, Nachtdruck additive screen blend + neon bloom. Riso stays
    quiet on purpose (same hierarchy as the sim). All of it is colour /
    text-shadow / filter, so `print-color-adjust: exact` carries it
    into the PDF. Three rules this went through user feedback to reach:
    - **Colour comes from the ACTIVE preset's dye ladder**, published
      as `--cv-dye-1..4` by `CvDyeSync` reading `simPresets.ts`
      directly. Painted in canonical Riso spots the sheet looked the
      same in every theme, because the spots barely move between
      presets while the sim runs blue-green under Wave and
      violet/pink/wine under Nachtdruck. Never restate the ladder as a
      hex table here — it would drift when a preset is retuned.
    - **Bands tile edge to edge.** Each band is drawn as "everything
      below my boundary" and painted top-down, with every boundary
      running past both viewBox edges. Per-band ribbons ended at
      different x positions and read as an accident. Opacity sits on
      the group, never per band (overlapping bands accumulate alpha).
    - **Don't invent a Turbulenz glow.** The sheet inherits the
      site-wide `[data-sim-theme="warm"] main` paper halo verbatim; an
      amber bloom substituted for it read as a different effect
      ("mach das richtig oder gar nicht"). It works on the sheet
      because the still frame puts dye under the headings for the halo
      to cut through.
    - `.cv-sheet` carries `isolation: isolate`, or Nachtdruck's screen
      blend composites past the opaque paper against the live sim.
    - **`CvSimFrame` needs an explicit `w-full` from every caller.** An
      `<svg>` with a viewBox is a replaced element with an intrinsic
      aspect ratio: given only `left-0 right-0` plus a percentage
      height, the browser derives the WIDTH from that ratio instead of
      from the offsets. At `h-[42%]` of a 2000px sheet the frame came
      out 2240px wide against a 696px sheet and spilled ~1.5 screens
      to the right, by a different amount per frame because their
      heights differ. **An element screenshot of the `<article>` clips
      to the article box and hides this entirely** — it survived two
      rounds of print-screenshot review and only showed up in a
      full-viewport shot. Check overflow with a page screenshot or by
      comparing bounding boxes, never with an element shot.
  - **The /cv desk is opaque** (`bg-paper-shade`, not `/60`). The sheet
    now carries its own band structure, and the live sim showing
    through around it reads as those same bands continuing — except
    the sim can't be aligned to anything. The theme is fully expressed
    by the sheet itself, so the sim stays off this one page.
  - **The saved PDF's filename is `document.title`.** The route sets
    `title: { absolute: ... }` (the locale layout's template would
    append the name a second time), and `CvActions` swaps in a title
    carrying the active theme for the duration of the print, restoring
    it on `afterprint` — otherwise five differently inked exports all
    land in Downloads under one name.
  - **The experience timeline spine is segmented per entry**, not one
    border on the container: a container border runs through the
    inter-entry gaps as well, so the page boundary sliced it mid-air
    and the cut read as a printing error instead of a page turn.
  - Contact chips: email, manuelheller.dev, GitHub only — visible text
    must equal the destination; LinkedIn was cut (shortened label lied
    about the URL, useless on paper).
  - Content is the PUBLIC redaction of `docs/cv.md`: never add street
    address, phone number, or birth date (privacy section of that doc).
    Route is noindex+follow with self-canonical (legal-pages pattern),
    excluded from sitemap, linked from footer document row and a
    Contact direct channel. Axe scans it (tests/a11y PAGES list).
- **404**: `src/app/not-found.tsx` owns its own `<html>`/`<body>` shell
  (root layout is pass-through). Strings come from `notFound` namespace at
  `routing.defaultLocale`. `<html lang="de">` hardcoded; `noindex`. Footer
  has locale-switch row to hand users back into preferred locale's home.

## Launch / SEO / metadata

- **`src/lib/seo/metadata.ts`** builds per-locale `Metadata`. Hard-sets
  `robots: { index: true, follow: true }` — the default for content routes.
  Routes that should NOT be indexed override `robots` at the page level
  (page-level metadata field-replaces the layout's `robots` object, not
  deep-merges): `not-found.tsx`, root `page.tsx` (locale-redirect),
  `[locale]/styleguide`, `[locale]/impressum`, `[locale]/datenschutz`,
  `[locale]/playground/[slug]`. Legal pages use `index: false, follow: true`
  (allow link discovery); playground + styleguide use `false, false`
  (dead-end routes). `robots.txt` does NOT disallow these — noindex on a
  crawl-allowed page is the only signal that reliably prevents snippet-less
  URL listings when third parties link to the URL. Sitemap excludes them too
  for the same coherence.
- **`metadataBase` in both root layout and `[locale]` layout** — required
  by `next/og` for relative URL resolution.
- **OG / Twitter images at `[locale]/opengraph-image.tsx` + `twitter-image.tsx`**
  generate per-locale 1200×630 / 1200×600 PNGs via `next/og`. Wordmark
  rendered as flex `<div fontFamily="serif">` because Satori (next/og)
  doesn't support SVG `<text>`. No ghost layers on these (clean at OG scale).
- **JSON-LD inlined as first child of `<body>`** (Next 16 App Router has no
  clean head-injection for arbitrary scripts). Documented Next.js workaround.
- **`export const dynamic = "force-static"` on every metadata route** —
  required by `output: "export"` for `icon.tsx`, `apple-icon.tsx`,
  `manifest.ts`, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`,
  `twitter-image.tsx`.
- **Favicon pipeline**: master at `public/brand/icon-source.svg`. Run
  `node scripts/generate-favicons.mjs` after editing the source SVG to
  regenerate `public/icon-{192,512}.png` + `icon-maskable-{192,512}.png`
  (sharp pipeline, 80% safe-area for maskable). Tab favicon
  (`src/app/icon.tsx`) ships transparent bg; iOS apple-icon
  (`src/app/apple-icon.tsx`) ships `--color-paper` bg (iOS no transparency).
  - **The 4 .tsx icon routes have inline ellipse coords for the misreg
    ghosts** that don't auto-update from the source SVG. Hand-update
    `icon.tsx`, `apple-icon.tsx`, `[locale]/opengraph-image.tsx`,
    `[locale]/twitter-image.tsx` when the source SVG geometry changes.
- **The Nav wordmark is the site-wide return-to-home control.** On any
  sub-route it is a plain `<Link href="/">`; ON HOME it preventDefaults
  and Lenis-scrolls to the top, because the router treats a same-route
  push as a no-op and the click otherwise did nothing at all for a
  scrolled reader. Regression spec: `tests/e2e/home-return.spec.ts`.
- **Mobile hamburger menu**: `useState` + custom toggle (not `<details>`) —
  needs JS for mq-resize-close behaviour anyway, and animation needs the
  open state to drive className transitions. Esc-to-close explicit.
- **Locale switch uses View Transitions API directly**
  (`document.startViewTransition()`), not Next.js's experimental wrapper.
  Falls back gracefully when API unavailable.

## Tooling / Windows specifics

- **`dev.cmd`**: Manuel's Windows machine has WSL; pnpm 10.x picks up WSL's
  `bash.exe` and routes scripts through Linux Node, breaking `pnpm dev` (loads
  Linux SWC binaries instead of Windows). The cmd shim invokes
  `node node_modules/next/dist/bin/next dev` directly. CI on Linux unaffected.
- **`next-env.d.ts`** is gitignored. `.githooks/pre-commit` (wired via
  `prepare` script + `core.hooksPath`) auto-unstages it as belt-and-suspenders.

## Git

- Conventional commits: `feat:`, `chore:`, `ci:`, `docs:`, `fix:`, `refactor:`
- English commit messages. One concern per commit (tooling separate from
  feature deliverables).

## Never do

- Hard-code strings (always via next-intl)
- Write em dashes ("—") or ad-speak phrasing into user-visible copy
- Pin a direct child of `<main>` with ScrollTrigger (removeChild crash
  on route change — pin an inner wrapper)
- Add `print:` overrides that change the CV sheet's sizes/gaps/columns
- Center or left-align the hero — asymmetric right-align is the signature
- Mount a second `<Canvas>` — share the one at root layout
- Skip the reduced-motion branch — not optional
- Add deps not listed in `docs/plan.md` §3 without asking first
- Inline secrets in code or commits — use `.env.local` (gitignored)
- Edit `docs/**` — the plan is a frozen spec; deviations go in this
  `CLAUDE.md`. `.claude/settings.json` enforces this by omitting
  `Edit/Write(docs/**)`. The permission prompt is the right friction.
- Apply duotone/posterise shaders to pro photos or UI screenshots
- Reintroduce a runtime watchdog in `FluidSim.tsx` — tier in `lib/gpu.ts`
- Use `text-ink-faint` for text content
- Use spot colors as text on paper without checking AA contrast
- Interpolate Tailwind class names (`bg-spot-${x}`) — use static maps
- Call `loseContext()` in WebGL component cleanup (StrictMode-poison)
