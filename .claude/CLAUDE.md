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
- `pnpm ci:local` — run lint + typecheck + build + test in one shot (mirrors CI stages 1–4; run before every push)

**Package manager is pnpm**, not Bun — plan deviation (§3 still says Bun).

## Folder conventions

- `src/app/` — App Router pages & layouts (locale segment lives here)
- `src/components/ui` — pure DOM components
- `src/components/sections` — page sections (Hero, About, Work, Playground, Contact)
- `src/components/scene` — WebGL/R3F wrappers; one persistent `<Canvas>` only
- `src/components/motion` — GSAP primitives
- `src/shaders/` — GLSL split into `common/`, `fluid/`, `toon/`, `photo-duotone/`, `page-transition/`
- `src/lib/` — `raf.ts`, `gpu.ts`, `motion/tokens.ts`, `i18n/`, `content/`
- `src/hooks/` — `useLenis`, `useReducedMotion`, `useGPUCapability`, `useMousePosition`
- `content/` — MDX (project-scoped, 4 locales per file)
- `messages/` — next-intl UI strings (de/en/fr/it)

## Design tokens

Source of truth: `src/app/globals.css` (`@theme` block).

- Palette: `--color-paper{,-tint,-shade,-line}`, `--color-ink{,-soft,-muted,-faint}`,
  4 spots `--color-spot-{rose,amber,mint,violet}`
  - Plan §4.1 sketches `--color-ink-muted` at `rgba(10,6,8,0.55)`, but
    plan §9 demands AA 4.5:1 for UI text — at 12px small mono labels
    that opacity yields only 4.27:1 (axe fails). Bumped to `0.7`
    (≈6.5:1 on paper). `--color-ink-faint` (0.28) is decorative-only;
    **never use it for text content**, the contrast is unrecoverable.
- Fonts: `--font-display` (Instrument Serif, static — see note below),
  `--font-body` (Inter Variable), `--font-mono` (JetBrains Mono Variable)
  - Plan §4.3 specifies a Variable Instrument Serif; upstream ships
    only a static family (Google Fonts + `@fontsource/instrument-serif`).
    No `@fontsource-variable/instrument-serif` exists. Weight axis is
    not available — Phase 5 Overprint-Reveal uses duplicated DOM char
    copies with color offsets (per §6.3), not an axis morph, so static
    cuts are sufficient. Do **not** re-file this as a bug.
- Motion tokens in TS: `src/lib/motion/tokens.ts` (`ease.expo/riso/fluidDrag`,
  `dur.micro/short/medium/long/epic`)
- **Hero is right-aligned (asymmetric) — never centered, never left-aligned.**

## Performance rules

- Single persistent R3F `<Canvas>` — never remount per section
- All animations share one RAF ticker (GSAP + Lenis + R3F coordinated in `raf.ts`)
- Fluid-sim auto-pauses via `IntersectionObserver` + `visibilitychange`
- 5 quality tiers: High 512² / Medium 256² / Low 128² / Minimal 96² / Static-WebP
- **Iris Xe is a supported target** (Manuel's work laptop) — no regression that
  drops Low tier below 40fps
- Budget §8: Lighthouse perf ≥ 95, a11y 100, LCP < 1.8s, CLS < 0.05,
  initial JS (gz) < 130kB

## i18n rules

- 4 locales: `de` (default), `en`, `fr`, `it`
- No hard-coded strings in components — always through next-intl
- Content MDX has 4 per-locale variants (e.g. `project.de.mdx`)
- Routes always include the `[locale]` segment

## Accessibility (non-negotiable)

- `prefers-reduced-motion`: sim → pre-rendered WebP, GSAP durations → 0
- Keyboard nav, visible `:focus-visible` ring on `--color-spot-mint`
- Semantic landmarks: `<main>`, `<section>`, `<article>`, `<nav>`
- Alt text on every photo; ARIA labels on icon buttons + meaningful canvases
- Axe-Playwright in CI; build breaks on violations

## Git

- Conventional commits: `feat:`, `chore:`, `ci:`, `docs:`, `fix:`, `refactor:`
- English commit messages. One concern per commit.

## Never do

- Hard-code strings (always via next-intl)
- Center or left-align the hero — asymmetric right-align is the signature
- Mount a second `<Canvas>` — share the one at root layout
- Skip the reduced-motion branch — not optional
- Add deps not listed in `docs/plan.md` §3 without asking first
- Inline secrets in code or commits — use `.env.local` (gitignored)
- Edit `docs/**` — the plan is a frozen spec; deviations go here in
  `CLAUDE.md`, not in the plan itself. `.claude/settings.json` enforces
  this by omitting `Edit/Write(docs/**)` — if a plan amendment is truly
  warranted, the resulting permission prompt is the right friction.

## Phase 4 deviations

- **curl.frag.glsl added**: Plan §5 lists 7 fluid shaders. Added dedicated
  curl pass (8th) for cleaner separation.
- **quad.vert.glsl in common/**: All passes share one fullscreen triangle
  vertex shader rather than per-pass vertex shaders.
- **CSS gradient as static fallback**: Plan §8 says WebP stills. Phase 4
  uses CSS gradient; WebP stills follow once sim is visually polished.
- **Adaptive GPU tiering**: Plan §8 describes fixed tiers. Added runtime
  frametime measurement (30 frames) + localStorage caching for
  unrecognized GPUs.
- **`getContext()` via R3F**: FluidOrchestrator accesses the raw
  `WebGL2RenderingContext` through `renderer.getContext()` rather than
  creating its own.
- **SceneErrorBoundary + WebGL2 check**: Not in plan. Catches R3F/WebGL
  runtime failures gracefully, falls back to StaticFallback. Also gates
  Canvas mount on `hasWebGL2()` to avoid crash in environments without
  WebGL2 support.
- **Turbopack GLSL rule**: Next.js 16 uses Turbopack for builds. Added
  `turbopack.rules: { "*.glsl": { type: "raw" } }` alongside the
  existing webpack `asset/source` rule.
- **@types/three added as devDependency**: Three.js 0.183 requires
  separate `@types/three` for TypeScript declarations.
- **RafBridge passes elapsedMs to advance()**: R3F 9's `advance()`
  requires a timestamp argument. Plan's `advance()` call was argument-less.
- **Ink Drop Bloom Loader**: Plan §6.1 describes a generic loader. Phase 4
  ships a GSAP ink-drop bloom in `components/ui/Loader.tsx` that cycles
  through the 4 spot colors, announces progress via SR live region, and
  fires a `loader-complete` window event consumed by `FluidSim` to trigger
  ambient motion. Race-guarded so late-mounting consumers still pick up
  completion (`isLoaderComplete()` helper).
- **Ink Bleed Dots ScrollProgress**: Not in plan. Section-count dots on the
  right edge driven by `IntersectionObserver`, filled as Lenis scrolls past
  each anchor. Hidden under `prefers-reduced-motion` (native scrollbar
  restored in its place — see below).
- **Native scrollbar hidden**: `globals.css` hides the native scrollbar
  (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) since
  ScrollProgress dots are the visible affordance. Restored under
  `prefers-reduced-motion` so keyboard/AT users have a scroll indicator.
- **`overscroll-behavior: none` on html**: Suppresses iOS Safari
  pull-to-refresh and horizontal back-swipe that otherwise fight the
  fluid-sim pointer input. Replaces the CSS-only `touch-action: none` on
  the canvas (which doesn't reach the root document's overscroll gestures).
- **Turbopack GLSL via `as: "*.js"` + raw-loader**: Plan §3 doesn't list a
  GLSL transport dep. Turbopack's `type: "raw"` rule alone wasn't enough
  for the inlined-string imports our orchestrator relies on — added
  `raw-loader` and configured `turbopack.rules["*.glsl"].as = "*.js"` so
  the loader output is treated as a module.
- **Ambient motion params extracted**: `FluidOrchestrator.ts` now has a
  top-level `AMBIENT_PARAMS` constant (3 wandering points, per-point
  freq/range/force multipliers). Makes future Leva-dev tuning a one-file
  change; previously hard-coded in the step loop.

## Phase 5 deviations

- **Custom char splitter over GSAP SplitText**: Plan §6.3 references a
  per-char split for the Overprint-Reveal. Shipped `src/lib/motion/
  splitChars.ts` (~25 LOC, grapheme-safe via `Array.from`) instead of
  importing `gsap/SplitText`. Saves ~6–8kB gz against the §12 bundle
  budget (< 130kB gz), and SplitText's single-layer split wouldn't help
  with the triple-layer (ink + rose ghost + mint ghost) duplication
  anyway — we need three copies of every char regardless.
- **IntersectionObserver one-shot, not ScrollTrigger**: Plan §6.3 says
  "getimed per Lenis-Scroll-Velocity". Implemented via a one-shot IO at
  `threshold: 0.35`, because ScrollTrigger adds ~12kB gz and the velocity
  sync is already free: GSAP timelines ride `gsap.ticker`, which IS our
  shared RAF (`src/lib/raf.ts`), so Lenis and the reveal settle inside
  the same frame. No explicit Lenis coupling needed.
- **AccName rescue via sr-only sibling**: The visual composition is
  `inline-block` per char (three stacked spans per glyph). The ARIA
  AccName algorithm treats each inline-block as a separate word, so the
  accessible name would read `"H e l l e r , M a n u e l ."` —
  screen readers spell-reading the hero. Fix: the entire char-stack
  composition is wrapped in `aria-hidden="true"`, and a sibling
  `<span className="sr-only">{text}</span>` carries the accessible name.
  Ink layers inside also keep `data-layer="ink"` for test selectors but
  are aria-hidden by inheritance. This is a real bug caught via
  `page.locator().ariaSnapshot()` in Playwright — keep the sr-only
  sibling if anyone refactors this primitive.
- **`aria-label` intentionally absent on root span**: axe flags
  `aria-label` on `role="generic"` (the default for `<span>`), so the
  accessible name comes from the sr-only child, not an attribute.
- **Resting misregistration preserved, not animated to 0**: Plan §6.3
  describes the reveal as ghosts snapping into place; kept them at a
  ±2px resting offset + ±1px deterministic per-char jitter so the
  "print-registration" feel persists after the animation settles. Riso
  plates never perfectly align — the static offset is the signature.
- **Reduced-motion branch drops the split entirely**: Under
  `prefers-reduced-motion: reduce` the component renders a plain
  `<span>{text}</span>` — no ghosts, no per-char stacks, no GSAP
  timeline. Simplest DOM, natural SR reading, zero animation cost.
- **Hero choreography via `delay` prop, not a parent timeline**: The
  H1 uses two `OverprintReveal` instances separated by an aria-hidden
  slash; the second gets `delay={0.25}` so "Manuel." lands a beat
  after "Heller,". Keeps the primitive self-contained — no shared
  timeline orchestration, each reveal owns its own IO + GSAP lifecycle.

## Phase 6 deviations

- **Translations deferred**: Plan §3 says the gate is "alle Locales
  komplett". Phase 6 ships the DE source content for About/Skills/
  AI-Pinsel/Currently and mirrors it verbatim into EN/FR/IT message
  files so next-intl renders something in every locale. Proper
  translation is its own pass after the visual lands.
- **No photo-duotone shader on Portrait**: Plan §5 lists `photo-duotone`
  as the Portrait treatment. Skipped because the photos are meant to
  showcase Manuel's photography — overlaying a Riso effect on
  professional portraits undercuts the point. Portrait gets a simpler
  Riso treatment instead: 2px ink frame, paper-shade backing, +2px
  spot-rose offset shadow, no shader. Re-evaluate in Phase 9 when the
  Photography teaser ships, but the working hypothesis is "leave the
  pro photos alone".
- **`<picture>` over next/image**: Plan §3 implies next/image, but
  `images.unoptimized: true` (required by `output: 'export'`) disables
  optimization anyway. Used a native `<picture>` with AVIF + WebP +
  JPG fallback srcsets — same output, no runtime cost.
- **One-off sharp-cli for portrait variants**: Generated 480/800/1200w
  AVIF + WebP + JPG with `pnpm dlx sharp-cli` rather than adding sharp
  as a project dep. The general asset pipeline lands in Phase 9
  (`scripts/optimize-assets.ts`); for 6 outputs a one-shot was the
  proportional move.
- **Currently block uses `<dl>`, not `<table>`**: Briefing §2.5 reads
  as label/value pairs. `<dl>` is the semantic primitive for term/
  definition pairs; gives proper SR reading without table overhead.
- **`<aside>` demoted to `<div>` inside About**: Originally wrapped the
  Portrait + Currently column as `<aside>` for "complementary content".
  axe flags `landmark-complementary-is-top-level` because an aside
  inside `<section>` violates the landmark hierarchy. Demoted to plain
  `<div>` — same visual, no spurious landmark.
- **`vibecoded` marker is a filled rose pill, not rose text**: First
  pass used spot-rose text on a rose-bordered pill; axe failed at
  2.19:1 contrast vs the WCAG AA 4.5:1 floor. Flipped to
  `bg-spot-rose text-ink` — ~12:1 contrast and reads more like a Riso
  stamp anyway.
- **Hero extracted from page.tsx into sections/Hero.tsx**: page.tsx is
  now just a server-component composer that calls Hero/About/Skills.
  Each section owns its own translations namespace + structure.
- **Pre-existing failure not addressed in Phase 6**: `tests/e2e/
  overprint.spec.ts` "H1 has no ghost layers at all" under
  `reducedMotion: reduce` fails on main as well. Root cause is the
  SSR/hydration flow in `useReducedMotion` (`getServerSnapshot()`
  returns `false`, so server HTML always contains the 14-span ghost
  composition; the client flips after mount). Out of scope for Phase 6
  — flagged here so the next pass at OverprintReveal sees it.

## Phase 7 deviations

- **No 3D toon-cel-shaded planes**: Plan §6.4 calls for a 3D Toon-Shader
  gallery in the persistent R3F Canvas. With briefing §4.1's reduction
  to 2 projects, a separate 3D scene next to the hero fluid-sim would
  compete for attention and cost ~50kB+ bundle. Replaced with DOM/SVG
  editorial cards that integrate INTO the existing fluid-sim by
  dispatching colored splats — the cards become force-source inputs
  rather than a parallel WebGL world. Toon-shader experiments may move
  to Phase 10 Playground.
- **`/work/[slug]` MDX routes deferred to Phase 8**: Briefing §4 has
  two projects, only one (Jogge di Balla) needs a detail page, and
  that detail page IS the Phase 8 case study deliverable. The Portfolio
  card is self-referential. Building `/work/[slug]` infrastructure in
  Phase 7 with no consumer would have been speculative scaffolding.
- **Fluid-Ink-Wipe page-transition deferred to Phase 8**: Plan §6.4
  describes the transition as the click-target reveal. With no real
  routing destination in Phase 7, the transition primitive lands in
  Phase 8 paired with the case-study route.
- **Splat-injection bus (`src/lib/fluidBus.ts`) over context**: Cards
  need to nudge the global FluidSim without holding an orchestrator
  reference. Used a tiny pub/sub module rather than React context —
  the orchestrator lives in a persistent root-layout Canvas, the cards
  live deep in page.tsx, and the dispatch is fire-and-forget. Context
  would have required threading a provider through the entire tree
  for one event direction. Saves ~80 LOC and a re-render path.
- **Pause-discards-splats**: When `#hero` leaves viewport,
  FluidOrchestrator pauses (Phase 4 deviation). To avoid a glitch where
  queued hover-splats from Work cards all dump at once on scroll-back,
  the queue is cleared in `step()`'s pause early-return. Hover splats
  while user is in Work section are silently dropped — acceptable: the
  big click-burst on the Portfolio card lands AFTER smooth-scroll
  completes (350ms timeout in `WorkCard.onClick`), by which time
  IntersectionObserver has resumed the sim.
- **Generative Portfolio card visual (no real screenshot)**: The
  Portfolio card is a meta-card representing this site. Embedding a
  real screenshot of the hero would force re-shooting at every iteration.
  Shipped `src/components/ui/PortfolioCardVisual.tsx` — an SVG-only
  abstraction (paper backing + 4 spot-color blurred blobs + halftone
  pattern + signature mark) that captures the visual language without
  pinning to a frame. Phase 11 swaps in a real screenshot once the hero
  is final.
- **Joggediballa CTA target is a not-yet-existent anchor**:
  `#case-study` doesn't exist in Phase 7. The browser's default
  behaviour for missing fragments is to do nothing, so the link is
  inert until Phase 8 ships the section. No 404, no error, just a
  no-op click — clean degradation.
- **`vibecoded` stamp is a paper-bg shadow-pill, not a rose-fill pill**:
  Skills section's stamp (Phase 6) lives ON the spot-rose pill colour
  for visual emphasis. On Work cards the stamp sits in the corner of
  the media frame, where rose-fill would clash with the screenshot
  hues. Used `bg-paper text-ink shadow-[2px_2px_0_var(--color-ink)]`
  for a different "Riso receipt" feel. Same data, different context,
  intentionally different visual.
- **One-off sharp script for screenshot variants**: Same pattern as
  Phase 6 portrait. Inline `node -e` against the resolved sharp install
  path rather than adding a script. Phase 9 will generalize this into
  `scripts/optimize-assets.ts`.
- **`dev.cmd` shipped for Windows pnpm/Corepack bypass**: Manuel's
  Windows machine has WSL installed; pnpm 10.x picks up WSL's
  `bash.exe` from PATH and routes scripts through Linux Node, breaking
  `pnpm dev` (loads Linux SWC binaries instead of Windows). The cmd
  shim invokes `node node_modules/next/dist/bin/next dev` directly,
  bypassing pnpm. CI on Linux is unaffected. Documented inside the
  file itself for future-Manuel.

## Phase 8 deviations

- **Inline `<CaseStudy />` instead of `/work/[slug]` route**: Plan §5
  IA puts the case study as Section 04 of the long-scroll home page,
  AND lists `/work/[slug]` as a route family. Phase 7's WorkCard CTA
  already points at `#case-study` anchor. Going inline keeps the
  single-page-portfolio narrative intact, avoids speculative routing
  scaffolding for the lone consumer (only Jogge di Balla needs a
  detail page; the Portfolio card is self-referential), and lets the
  click choreography stay client-side scroll instead of a real route
  transition. `/work/[slug]` infrastructure is now Phase 11 / on-demand.
- **No photo-duotone shader on screenshots**: Plan §6.5 calls for a
  runtime Risograph-Duotone shader on screenshots (luminance → 2 spot
  colors + halftone). Same call as Phase 6 made on the portrait —
  pro UI captures need to stay legible, the visitor reads code/UI in
  these screenshots. Riso treatment lives entirely in the framing
  (paper-shade backing block, 2px ink border, spot-color offset
  shadow). Shader proper lands in Phase 9 (Photography), where
  artistic recolor is the point; can backport to case-study later if
  the look calls for it.
- **No Fluid-Ink-Wipe page-transition primitive**: Phase 7 deviation
  said this would land "paired with the case-study route". Since the
  case study is inline (no route transition), there's nothing to
  wipe between. Joggediballa CTA gets Lenis smooth-scroll +
  scrollIntoView fallback (no splat burst — destination is below
  hero, sim paused, splats would be silently dropped). The transition
  primitive moves to Phase 11 if a real route ever ships.
- **`scripts/generate-joggediballa-screenshots.mjs` (committed
  script, not inline `node -e`)**: Phase 6/7 used inline node
  invocations against the resolved sharp install. With 7 screenshots
  × 3 widths × 2 codecs + JPG fallback = 49 outputs, an inline
  command got unwieldy; reified into a script. Pulls sharp directly
  from `node_modules/.pnpm/sharp@0.34.5/...` (sharp isn't a project
  dep — same pattern as Phase 6). Phase 9 will fold this into the
  generalised `scripts/optimize-assets.ts`.
- **`type-body-sm` utility added to `globals.css`**: Phase 7 introduced
  the class in `WorkCard.tsx` but never defined it — the rule was
  silently a no-op. Phase 8 needed the same utility for the case-study
  table cells and reflection block, so the CSS rule was added (font-
  body, 0.875rem, line-height 1.55, max-width 70ch). Behaviour at the
  Phase 7 use-sites is now slightly tighter than before; visually
  acceptable, no test regressions.
- **Spot-amber accent appears as fill, never as text**: Spot-amber
  on paper hits ~1.28:1 contrast — far below the AA 4.5:1 floor.
  Same lesson as Phase 6's vibecoded marker (rose text fail). For
  the case-study eyebrow + highlight kickers, the amber lives in a
  small filled square preceding the label (`<span className="size-2
  bg-spot-amber" />`); the label itself is `text-ink type-label`.
  Reads as a Riso ink-bleed dot next to the kicker — same colour
  signal, AA-clean.
- **Public-layer screenshot grid uses irregular layouts array, not
  CSS-generated offsets**: Tried `nth-child` Tailwind variants for the
  alternating col-span/col-start pattern; with 5 items and 3 distinct
  shapes the math got hairier than just hard-coding the per-index
  classes. Five `md:col-span-X md:col-start-Y md:mt-Z` strings in a
  layouts array, looked up by `i`. Trivially editable, no surprise
  cascade collisions.
- **Translation deferred (DE source mirrored to EN/FR/IT)**: Same
  pattern as Phase 6/7. The case-study namespace is large (~80 keys
  with nested arrays); proper translation belongs in a dedicated
  pass after the visual lands. Mirror-script: one-liner over
  `messages/{de,en,fr,it}.json` that copies `caseStudy` from de to
  the others.
