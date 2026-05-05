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
- Plan §8 budget: Lighthouse perf ≥ 95, a11y 100, LCP < 1.8s, CLS < 0.05,
  initial JS (gz) < 130kB
- **CI-asserted reality** (`.lighthouserc.json`): perf ≥ 0.55 (warn),
  a11y ≥ 0.95 (error), CLS ≤ 0.1 (error), LCP/TBT/script-size warn
  with relaxed thresholds. The animation-heavy hero (continuous
  FluidSim + GSAP RAF) caps perf score around 0.6 because Lighthouse
  measures TBT over the entire FCP-to-timeout window — every 50ms+
  RAF frame counts as a long task. Plan §8 was the aspirational
  pre-implementation target; the lhci config is what we actually gate
  CI on. CLS + a11y stay strict because those are real user problems,
  not measurement artefacts of always-on motion.

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

## Phase 9 deviations

> **Major pivot mid-phase.** The first pass shipped a runtime
> Riso-Duotone shader on every photo per plan §6.5 — wildlife portraits
> and Koenigsegg shots got posterised to 3-tone composites. Manuel
> rejected on visual review: the filter killed the actual
> *photography*, which is the whole point of the section. Same lesson
> Phase 6 (portrait) and Phase 8 (case-study screenshots) had already
> taught — pro photos are sacred, the Riso aesthetic must live in
> framing / animation / typography around them, never in pixel-level
> recolor. The runtime-Riso-Duotone shader from plan §6.5 is now
> formally retired site-wide; the photography-section animation lives
> instead in an **Ink-Mask Reveal** that dissolves a paper overlay to
> show the unmodified photo underneath.

### Architecture (post-pivot)

- **Photo lives in DOM as clean `<picture>`**. AVIF/WebP/JPG srcsets,
  no shader recolor, no UV flip, no posterisation. Browser handles
  decoding + responsive sizing per `sizes` attr.
- **Per-photo `PhotoInkMask` `<canvas>` overlay** sits absolutely
  positioned on top of the `<picture>` and dissolves on viewport
  entry. Each instance owns an isolated WebGL2 context running a
  simplified two-program fluid sim:
  - `advect.frag.glsl` — semi-Lagrangian advection of a density
    texture along a curl-noise velocity field (no pressure solve, no
    full Navier-Stokes; the reveal only needs ink to *flow outward
    and dissipate*, mass conservation is irrelevant)
  - `splat.frag.glsl` — gaussian-falloff additive ink injection
  - `mask.frag.glsl` — composes paper-color RGB + alpha from
    `1 - density`, plus a halftone-dot fringe at the bleed boundary
    (gives the "Riso plate dissolving" feel)
- **Trigger — scroll-center proximity**: IO with `rootMargin:
  "-20% 0px -20% 0px"` and `threshold: 0` fires the burst the moment
  the photo enters the central 60% band of the viewport. Replaces the
  first iteration's `threshold: 0.3` (which fired the moment the edge
  peeked in — felt premature, was Manuel's correction). Click-to-
  reveal override was tried + dropped: a11y lint demanded keyboard
  parity, and since the IO trigger fires reliably on scroll there was
  no real need for a manual shortcut. Photos read as content, not
  buttons.
- **Burst content** (post-`1d3e436` simplification): one strong
  centre splat (`strength 0.85`, `radius 0.18`) when the slot enters
  viewport, then small re-injection splats every ~120ms through the
  first 85% of the reveal to keep the centre saturated as the
  outward radial-velocity term carries density toward the edges.
  *Earlier iteration scripted ~9 splats with explicit inner/outer-
  ring satellites; the radial-velocity model produces equivalent
  coverage with one-tenth the splat math.* Plus **ambient pointer-
  velocity splats** from the document-level `pointermove` while the
  slot is in viewport — same global cursor that drives the hero
  fluid sim now bleeds ink into the photo masks. That is the
  semantic coupling Manuel asked for as "A-Full" without sharing
  WebGL contexts across components.
- **Lock-time listener removal**: when the reveal completes, the
  document `pointermove` listener is detached *and* the ambient
  splat queue is cleared (Phase-11 review fix). Without this, 5
  photos × document listeners survive past completion; every
  cursor sweep over the (already revealed) page paid 5
  getBoundingClientRects per pointermove for the rest of the
  session.
- **Reveal duration**: `REVEAL_DURATION_MS = 3000`. At progress >=
  1.0 the canvas opacity is snapped to 0 (the mask shader output is
  already ~98% transparent everywhere by that point — the snap
  guards against compositor edge-cases) and the RAF tick
  unsubscribes. Zero GPU work per photo after that point.
- **No `gl.readPixels`-based coverage detection**. An earlier
  iteration sampled the centre pixel every 200ms; readback stalls
  the WebGL pipeline (Chrome surfaces this as `GPU stall due to
  ReadPixels`), and with 5 photos × every 200ms = 25 stalls/sec the
  signal-to-noise was poor. Replaced with the deterministic
  duration-based completion above. Net: zero readPixels in
  Photography post-pivot.

### Editorial-asymmetric layout (no sticky pins)

Manuel rejected the first pass's sticky-pin stack ("durch scrollen
sieht komisch aus"). Replaced with an editorial-asymmetric flow that
mixes full-bleed and side-text-paired layouts:

| Slot | Image | Layout |
|------|-------|--------|
| 1 | Egret | full-bleed centre, ~80vh |
| 2 | Koenigsegg | right-60% block + left meta-text column (`<h3>` italic + body prose) |
| 3 | Panorama | full-bleed thin spread (3.72:1, breaks the container gutters via negative margin) |
| 4 | Tree-Lake | left-70% block + right meta-text column (mirror of slot 2) |
| 5 | Crocodile + butterfly | full-bleed centre, ~80vh |

No GSAP ScrollTrigger, no sticky positioning, no pinning. Just normal
flow + IntersectionObserver per slot. Captions slide in horizontally
(`translate-x-4 → 0` + `opacity 0 → 1` over 700ms) parallel with the
ink dissolve.

### Fluid-sim lifecycle

- **Hero fluid sim runs everywhere, period.** No IntersectionObserver
  pause, no frametime watchdog. The cursor drives ink across all
  sections; in Photography it powers the ambient splats into
  PhotoInkMask. The earlier Phase 9 watchdog + perf-mode IO pause was
  removed — on Iris Xe with 5 always-on PhotoInkMask contexts the
  watchdog latched within seconds of load, then pinned the sim to
  hero/photography for the rest of the session, which is exactly the
  opposite of what was wanted.
- **GPU capability tiering is the right place for "this device can't
  cope" decisions** — `lib/gpu.ts` + `useGPUCapability` pick a tier
  (`high`/`medium`/`low`/`minimal`/`static`) up front, with `static`
  falling all the way back to `<StaticFallback />` (no Canvas at all).
  That's a startup decision based on renderer name + an initial
  frametime probe, not a runtime watchdog. Don't reintroduce a
  runtime watchdog in `FluidSim.tsx` — if a tier proves too heavy in
  the wild, drop its config in `lib/gpu.ts` instead.
- The `measuring` / `recordFrametime` flow in `FluidSim` stays — it's
  the tier auto-tuner, not perf-mode.

### Lessons preserved from the discarded first pass

These bit during the pre-pivot iteration. Preserved here so future
WebGL components don't re-step the rakes:

- **`loseContext()` in cleanup is poison under StrictMode**. React
  dev-time double-invoke does mount → cleanup → mount on the *same*
  canvas element. Per WebGL spec, `getContext` on a canvas with a
  lost context returns *that same* dead context — not a fresh one.
  Every subsequent compile then fails silently with `null` info-log.
  PhotoInkMask's cleanup deletes programs/buffers/textures/VAOs
  *only*, never `WEBGL_lose_context.loseContext()`. GC drops the
  context when the canvas element actually unmounts.
- **GLSL ES 3.00 requires `#version` to be the literal first line**.
  Even comments before are an error. The codebase pattern (see also
  `src/shaders/common/quad.vert.glsl`) puts `#version 300 es` on
  line 1, comments after. PhotoInkMask additionally normalises
  loaded shader source via regex strip-and-prepend in case raw-loader
  / Turbopack HMR ever delivers a cached-stale newline before the
  directive.
- **ASCII-only in shader sources**. Some Windows ANGLE versions choke
  on Unicode in comments (→, ×, °, etc.). Shaders use `->`, `x`,
  `degrees` instead.
- **`<aside>` inside `<section>` triggers axe `landmark-complementary-
  is-top-level`**. Same trap that bit Phase 6 About. Photography's
  side meta-text columns started as `<aside>`, demoted to `<div>`.
- **`text-ink-faint` ≠ text colour**. Phases 6, 8, 9 (twice in 9 —
  pre and post pivot) all rediscovered this. The token's contrast
  ratio (1.91:1 on paper) is unrecoverable for AA. Caption uses
  `text-ink-muted` (~6.5:1).

### Other Phase-9 specifics

- **`scripts/optimize-assets.mjs` (`.mjs`, not `.ts` per briefing
  §10.2)**. No ts-runner in devDeps; ESM JS keeps the asset pipeline
  one `node` invocation. Per-task `quality` field lets the photography
  group override AVIF quality (q38–q50) since fullscreen detail shots
  blow the §8 budget at default q60. Tree-lake runs at q38, others at
  q42, panorama at q50.
- **Editorial pano spread (`DSC06968`)**. Briefing §6 said "4 Bilder";
  Phase 9 ships **5** because the panorama (3.72:1, Panama freighters
  under cumulus) would have been ugly letterboxed in a regular slot.
  Treated as a print spread, full-bleed thin band.
- **Spot-amber repeats** (egret + panorama). 5 slots, 4 colours; mint,
  rose, violet each fit exactly one subject (mint↔green-tree,
  rose↔butterfly, violet↔cool-counter to the Koenigsegg's orange).
  Amber is the multi-fit one.
- **Translation deferred** (DE source mirrored across EN/FR/IT). Same
  pattern as Phase 6/7/8.
- **`<figure>` + `<figcaption>` proper pairing**. AT users hear
  location/year/subject metadata associated with the image
  semantically.
- **Captions: best-guess locations** (Costa Rica, St. Moritz, Panama,
  Lake Arenal, Tárcoles). Flagged for Manu review when alt-texts
  get a proper pass. TÁRCOLES caption says "Schmetterling" (not
  Eidechse — Manu corrected during the photo-selection dialogue).

## Phase 10 deviations

- **Leva remains a dev-only dep** but is bundled into the playground
  routes' client JS, not just dev. Plan §3 lists it under "Shader
  parameter tuning (dev only)"; we ship it in prod because the
  playground experiments are themselves the demo, and runtime
  parameter exploration IS the user-facing feature. Treated as
  intentional plan deviation. Bundle impact is contained to
  `/playground/[slug]` routes via dynamic import in
  `ExperimentRouter`, so the home long-scroll never pays the cost.
- **`SceneVisibilityGate` + `sceneVisibility` zustand store**:
  Plan §3 doesn't reference a scene-visibility store, but the
  persistent root-layout `<Canvas>` + `<InkWipeOverlay>` need to be
  hidden inside `/playground/[slug]` (the experiment owns the
  viewport) without being unmounted (re-mount would lose hero state).
  Solution: a tiny store that the experiment route flips, plus a
  `<SceneVisibilityGate>` that toggles `display: none` on the root
  scene. Cleanup runs on unmount → back-nav restores the hero.
- **`inkWipeStore` for the page-transition primitive**: a 4-phase
  state machine (`idle → growing → covered → retracting → idle`)
  driven by `PlaygroundCard` clicks; consumed by the `InkWipeOverlay`
  component in the locale layout. State lives in zustand because
  the consumer is mounted in the layout shell while the producer is
  deep in a card; lifting through context would mean re-rendering
  every section on every transition tick.
- **Single shared `compileShader` helper at `src/lib/gl/compileShader.ts`**
  (Phase-11 review extraction). Prior to extraction the same logic
  lived in `PhotoInkMask`, `InkWipeOverlay`, and `textStamp.ts` —
  only PhotoInkMask handled the leading-whitespace-before-`#version`
  trap from the Phase 9 deviations. The other two were one HMR cache
  slip away from a silent compile failure on Windows ANGLE. Shared
  helper has the strip-and-prepend; PhotoInkMask wraps it in
  try/catch to preserve its existing soft-failure mount path.
- **`PlaygroundCard` click → `setTimeout(router.push)` is tracked
  in a ref and cleared on unmount** (Phase-11 review fix). Without
  cleanup, a card click followed by a fast unmount (locale switch
  mid-grow) would race against the user's actual destination.
- **`TypeAsFluid` rasterises text via Canvas2D + Gaussian blur**, not
  a JFA-computed signed distance field as briefing §7.2 implied.
  At typical text sizes a wide Gaussian is visually
  indistinguishable from a real SDF once the result hits the fluid
  sim, which destroys precise distances within frames anyway. Saves
  ~10 shader passes and the seed-encoding plumbing.
- **`UNPACK_FLIP_Y_WEBGL` on text-stamp upload**: Canvas2D is
  Y-down, GL UV is Y-up. Without the flip, letters render
  upside-down. Counter-balanced by setting back to `false` at the
  end so the orchestrator's other texture uploads aren't affected.
- **Mini-sims on Playground cards stay mounted in `paused` state
  after first hover/focus**, so re-hovers are instant. The
  orchestrator's `setPaused(true)` halts the sim; the visual is
  cross-faded out to the static SVG. Memory cost: one orchestrator
  per card × 2 cards. Acceptable on the home page; gives way to a
  full-screen orchestrator inside `/playground/[slug]`.
- **Playground translation deferred** (DE source mirrored across
  EN/FR/IT). Same pattern as Phase 6/7/8/9.

## Phase 11 deviations

- **Two-commit sprint structure**: tooling concern (the pre-commit
  hook) committed separately from the launch deliverables (Contact,
  Legal, 404). One concern per commit per Manuel's CLAUDE.md.
- **Pre-commit hook auto-unstages `next-env.d.ts`** via
  `.githooks/pre-commit` + `scripts/install-git-hooks.mjs` (cross-
  platform, no `simple-git-hooks` dep). `package.json` `prepare`
  script wires `core.hooksPath` once on `pnpm install`. The hook
  short-circuits cleanly when `.git` is missing (CI tarball
  contexts). Replaces the manual "`git checkout -- next-env.d.ts`
  before every `git add`" rule that existed earlier in this file.
- **`src/lib/site.ts` as central identity module**, not a
  next-intl namespace. URL, contact email, social links, author
  region. These are *technical* constants (consumed by Contact +
  Sprint 3 SEO/meta layer + JSON-LD), not user-facing copy that
  changes per locale. Living in `messages/*.json` would mean four
  JSON files to keep in sync for one URL. URL hardcoded for now;
  swap to `process.env.NEXT_PUBLIC_SITE_URL ?? "https://manuelheller.dev"`
  when CI gains a preview-vs-prod split.
- **Contact form is fully built but submit is stubbed** to a 320ms
  graceful fallback that surfaces a `mailto:` to `SITE.author.email`.
  The Cloudflare Worker bridge to Resend lands in Sprint 6 (Server
  pass). Honeypot pattern (`bot-trap`, off-screen, `tabIndex=-1`,
  `aria-hidden`) is real: bots fill the field blindly, real users
  never see/focus it. **Honeypot trip is silently swallowed** — the
  earlier draft showed the fallback state with the mailto link,
  which would have handed bots Manuel's email. The fix: just `return`
  after `preventDefault()`.
- **`setTimeout(setStatus, 320)` is tracked in a ref and cleared on
  unmount** to avoid React's "state update on unmounted component"
  warning if the user submits then navigates within the timer
  window.
- **`/[locale]/impressum` and `/[locale]/datenschutz`** as separate
  routes (not query-modes on a single legal page). Both render
  through a shared `<LegalDocument namespace="legal.impressum" |
  "legal.datenschutz">` server component. Boilerplate is CH-conform
  for a private non-commercial portfolio with a contact form (DSG
  revDSG + EU DSGVO informationally). No cookie banner because the
  site sets no cookies; documented explicitly in datenschutz.
- **Global 404 at `src/app/not-found.tsx`** owns its own
  `<html>`/`<body>` shell because the root layout is a pass-through
  (same pattern as `src/app/page.tsx`). Strings come from the
  `notFound` namespace at `routing.defaultLocale` — page is served
  by Nginx for ANY unknown URL incl. ones the user typed at
  `/en/...`, so route-based locale detection doesn't apply. `<html
  lang="de">` is hardcoded to match the rendered copy; SEO is
  `noindex` so the AT signal is the only consumer (DE voice is
  correct here). Locale-switch row in the footer hands users back
  into their preferred locale's home.
- **Form primitives (`riso-input`, `riso-submit`)** added to
  `globals.css`. Riso "print-receipt" feel: paper-tint inputs with
  1.5px ink border, focus snaps a 3px spot-mint offset shadow that
  mimics a Riso plate misregistration; submit button is the inverse
  with hover-snap to -2/-2px and a spot-rose shadow underneath.
- **Footer social stamps remain decorative `<abbr>` elements**, not
  real `<a>` links. The same handles ARE exposed as real anchors in
  the Contact section's direct-channels list. The footer treats them
  as ornamental Riso stamps; the Contact section treats them as
  functional links. Keep both — different visual contexts, different
  affordances. (Reviewer flagged the inconsistency; intentional.)
- **Phase 11 review (post-Sprint 1)**: Phase 9 splat-count drift
  corrected in this file; PhotoInkMask listener-on-lock leak fixed;
  `compileShader` helper extracted (see Phase 10 deviations);
  Photography `bg-spot-${slide.spot}` dynamic class replaced with
  static `SPOT_BG_CLASS` map (same trap PlaygroundCard already
  documented). PlaygroundCard `setTimeout` orphan + ContactForm
  `setTimeout` orphan both ref-tracked + cleaned on unmount.
- **Translation deferred for body content** (`legal.*`, `contact.*`,
  `notFound.*`) — DE-mirrored across EN/FR/IT. Shell strings
  (`nav.items.impressum`, `datenschutz`, `footer.legalAriaLabel`)
  ARE properly translated per locale (matches Phase 6/7/8/9 pattern:
  shell translated, body mirrored). Sprint 2 closes the gap.

### Phase 11 polish-rework — About + Skills visual rework

Driven by `docs/superpowers/specs/2026-05-04-about-skills-visual-
rework-design.md`. Implementation plan at
`docs/superpowers/plans/2026-05-04-about-skills-visual-rework.md`.

- **About spine restructured**: the 5 equal-rectangle parts of the
  Phase 6 implementation are now an 8-spine-item flow (header → 4
  storied quote-blocks varying in column width → portrait anchor →
  object-grid → AI-Pinsel-Closer). Briefing § 2.2 prose stays
  verbatim; only structure + theatrics change.
- **Currently block re-attached at the Portrait section**, not
  dropped from About. Plan §Task 9 originally dropped Currently in
  favour of the Object-Grid's currently-band, but visual review
  found the lone Portrait too sparse on ultrawide. Currently lives
  next to the portrait now as the editorial flank (Plate-stamp → ✱
  → "Currently" h3 → 5-item dl → ✱). The Object-Grid `currentlyBand`
  changed copy from Bildschirm-tech ("React 19 · R3F 9 · WebGPU")
  to off-screen activities since the section IS off-screen and the
  old text contradicted the headline.
- **Per-block spot-color via `--block-spot` CSS variable**. Drop-cap
  (CSS `:first-letter`) and word-highlight inside pull-quotes both
  read this variable, so each block has its own "Riso plate"
  identity (rose / mint / amber / violet for the four storied blocks).
- **Pull-quote marker syntax is `[[keyword]]`, not `{keyword}`**.
  next-intl interprets curly braces as ICU MessageFormat
  placeholders ("FORMATTING_ERROR: variable X not provided"). Plan
  §Task 8 specced curly-brace markers; switched to `[[...]]` in
  PullQuote's regex + 16 message strings (4 keys × 4 locales). The
  ICU-escape alternative `'{x}'` was rejected as ugly; bracket-
  delimited markers read clearly in the JSON source.
- **Pull-quote uses its own `.pull-quote` CSS class** (not
  `.type-display`). Plan §Task 5 used type-display (clamp 3.5rem→
  11rem hero-size) but at that size each `inline-block` char from
  OverprintReveal wraps unpredictably in narrow columns. Pull-quote
  is now clamp(1.625rem, 3.2vw, 3rem) — editorial italic
  Instrument Serif, fits a single line at typical column widths.
- **Drop-Cap is outline-style** (`-webkit-text-stroke: 1.5px ink` +
  `paint-order: stroke fill` + spot-color fill). Plan §Task 1 had
  pure spot-color fill; visual review found it too soft against
  paper, the thin ink stroke gives it edge.
- **StampDivider is pure markup** (Flexbox row with five spans —
  two dots / asterism / two dots — coloured via inherited
  `--block-spot`). No SVG, no JS.
- **Plate-corner-marks are absolutely-positioned inline SVG
  components** anchored to the parent's 4 corners with a 6px
  outset. Section + Object-Grid containers use
  `className="plate-corners relative"` to opt-in.
- **Stamps in 140x90 viewBox, not 80x80**. Plan §Task 6 specced 80×80
  square, but Audi-S5-coupé and Joggediballa-oval need horizontal
  aspect ratios to read correctly. All 6 stamps now share 140×90
  (1.55:1) for layout consistency. Manuel will replace the SVGs
  with custom icons later — these are placeholder-quality.
- **`.container-page-wide` (110rem) utility** added in addition to
  `.container-page` (96rem). Used by Object-Grid + the loud-centered
  AI-Workflow block on About so they breathe on ultrawide displays
  without bumping the global cap (which would shift Hero + Work +
  other already-validated sections). `AboutBlock` accepts a
  `wide?: boolean` prop that swaps the container.
- **Portrait section is an editorial composition, not a centered
  single image**. Portrait left (md:col-span-5), editorial-flank
  right (md:col-span-4): plate-stamp → asterism → "Currently"
  heading → 5-item dl → asterism. Visual-review-driven; the
  centered-portrait-only version felt empty especially on ultrawide.
- **C1 VibecodedStamp** uses an IO at `threshold: 0.4` keyed on the
  stamp's own viewport-entry. Stagger between siblings is the parent
  `Skills.tsx`'s job — it passes `delay={i * 0.08}` per stamp. Each
  stamp has a brief rose-halo burst at impact (200ms blur+fade)
  layered behind the stamp via a sibling absolutely-positioned
  `<span>`.
- **C2 hover-misreg is mouse-only** (post-review). The earlier
  `tabIndex={0}` keyboard-parity attempt was reverted: it added
  20+ Tab stops behind the skill names with no action attached,
  which is keyboard-noise rather than parity. Decorative effects
  with no semantic information aren't worth a focus stop. The
  CSS `:focus-visible` selector stays in `.misreg-hover` for
  callers that legitimately make the wrapper interactive (none
  on About/Skills today; future-proofing).
- **C3 HeroSkillPulse loops continuously** without an IO gate. The
  cost is negligible (one GSAP timeline animating an `opacity` on a
  blurred div), and adding an IO gate would introduce a re-mount
  bug if the user scrolls past then back — the colour-cycle would
  restart from rose every time. Continuous loop is the simpler
  contract.
- **BodyProse FadeIn slowed** from `dur.medium` (0.56s) to
  `dur.long` (1.1s), per-paragraph stagger from 60ms to 120ms,
  baseline delay 400ms→500ms. Visual-review-driven — the original
  cadence felt snappy in a section that wants to read calm.
- **Loader plays on F5, not on locale-switch**. Phase 11 Sprint 1
  had `sessionStorage` cache that persisted across F5 in the same
  tab. Visual-review-driven fix: check
  `performance.getEntriesByType("navigation")[0].type === "reload"`
  to detect a manual reload, and only honor the sessionStorage
  cache for non-reload navigations (locale-switch re-mounts).
- **FluidSim no mid-session reinit on capability swap**. Symptom:
  on first load the orchestrator inits with the `medium` default,
  the GL probe identifies the actual GPU (Iris Xe → `low`), config
  prop changes, FluidSim's config-effect disposes + reinits the
  orchestrator → blank flash → ambient kicks back in 3s later.
  Two-layer fix: (1) `useGPUCapability` lazy-inits state from the
  localStorage tier cache so cached visitors start with the correct
  config from the first paint, no swap; (2) `probeGPU` now returns
  a `matched: boolean` field and `useGPUCapability` skips the
  30-frame measurement phase for matched-or-cached tiers (caches
  the matched tier on first encounter so the next visit lazy-inits
  cleanly). First-time visitors with a recognized GPU still see
  one swap (default→matched) but no measurement-driven second swap.
- **Translation deferred** (DE source mirrored across EN/FR/IT) for
  the new about-rework keys (`pullQuotes`, `marginalia`,
  `objectGrid`, `portrait.{plate,label,stamps}`). Same pattern as
  Phase 6/7/8/9/11-sprint-1 body content. Sprint 5 closes the gap.
- **Post-review fixes (PR #6 review pass)**:
  1. `.pull-highlight` re-asserts `--block-spot` on
     `[data-layer="ink"]` descendants — OverprintReveal's ink layer
     sets `text-ink` Tailwind directly, which would otherwise win
     the cascade and the highlighted keyword would render in
     ink-black instead of spot-color (visible signature dead).
  2. `<StampDivider>` takes a `spot` prop now (typed `Spot`) — it's
     rendered as a *sibling* of `<AboutBlock>`, not nested, so
     `--block-spot` cascade can't reach it. Each call-site in
     `<About />` passes the outgoing block's spot. The fallback
     `var(--color-ink-muted)` stays for future call-sites that
     don't have an outgoing spot.
  3. `<HeroSkillPulse>` cleanup tracks `activeTl` and calls
     `activeTl?.kill()` on unmount. The previous
     `gsap.killTweensOf(halo)` missed the dummy hold-tween whose
     target is `{}`, not `halo` — surviving the unmount and firing
     `onComplete: cycle` against the unmounted component (guarded
     by the `killed` flag, so behaviour was correct, but timelines
     leaked into GSAP's global ticker until self-resolution).
  4. `<FluidSim>` had a dead second `useEffect` that was supposed
     to handle config-swap, but always short-circuited because the
     first effect's deps include `config` and dispose+reinit happen
     in cleanup+mount of that effect already. Deleted; behaviour
     unchanged.

## Phase 12 deviations

### Phase 12 — Case Study diorama redesign (post-T18 rework)

The original Phase 12 plan's Case Study section (slideshow-style flex
track of discrete `StationFrame` items) failed 5 visual-review
iterations. The replacement design pivots to a **diorama**: one wide
SVG illustration of a photographer's table that the user pans across
horizontally. Spec at
`docs/superpowers/specs/2026-05-05-case-study-diorama-redesign.md`,
plan at
`docs/superpowers/plans/2026-05-05-case-study-diorama-redesign.md`.
The final shipped state diverged substantially from the plan after
~35 visual-review polish iterations; this section reflects what
actually shipped.

- **vh-based coordinate system** (4200×1000 viewBox at 100vh tall →
  420vh wide track). Consistent across normal desktop and ultrawide
  displays — fixed-px decorations on the prior slideshow looked tiny
  on 3840×1600 viewports.
- **Single SVG illustration component** (`<DioramaIllustration />`)
  draws comic-style table-edge outlines plus 5 embedded tools
  (camera, hot-shoe flash, pencil, ruler, coffee mug top-down) and
  scattered Riso-color ink splats. Tools are drawn into the
  illustration rather than sprinkled as separate components —
  coherence over modularity. The component is a pure server component
  (no hooks); the SVG is `aria-hidden="true"` and carries no `<title>`
  (a `<title>` under aria-hidden is dead — the AT tree ignores it).
- **Lupe extracted to `<DioramaLupe />` foreground overlay** at
  z-20 (above DioramaCards, below any future fixed UI). It's a small
  client component with a single GSAP tween that translates the
  wrapper `<div>` from `x: -25vh` to `x: +25vh` over 5.5s
  (sine.inOut, yoyo, repeat). The wrapper sits at left=167vh /
  top=12vh / 18vh×18vh, positioned to drift over the Admin
  polaroid. Animating the wrapper (not the inner SVG group) was
  required because viewBox-units gave too small a real-world sweep.
- **Cards as absolute-positioned HTML divs** (`<DioramaCards />`)
  layered above the SVG illustration, in vh-unit coordinates. Six
  cards: Hook, What, Stack, Admin, Overlay, Public. Cards overlap
  deliberately (admin + overlay) and are slightly rotated for the
  hand-laid feel. `CARD_LAYOUT` is typed
  `Record<CardKey, CSSProperties>` with `CardKey` a literal union of
  the six card slugs — adding/renaming a card becomes a TS error
  rather than a silent `undefined` spread. Dimensions live in the
  const, not in JSDoc — JSDoc references to dimensions rot fast.
- **Highlight cards (Admin + Overlay) use vertical layout**: polaroid
  at the top of the card spanning full width, kicker / title / lede /
  features list below. The bigger polaroid trades off against text
  density but visually wins — the screenshot is the hero of those
  cards. The two cards are 95% byte-identical (only spot color +
  screenshot slug + kicker dot color differ); kept as duplicates
  pending a third highlight card that would justify extracting a
  shared primitive.
- **HookCard is horizontal**: phone-screenshot polaroid (44%) on the
  left, the `t("hook")` text ("Vereine kämpfen alle...") as a
  blockquote with «...» chevron decoration on the right (56%). The
  storyParas (`t.raw("context.story")` — origin story + role) live on
  WhatCard, NOT HookCard. (One pivotal Polish round inverted these
  texts; final assignment is hookText→HookCard, storyParas→WhatCard.)
- **PublicCard's 3 polaroids use diagonal staggering**: the first
  polaroid (statistics) gets `marginTop: 18vh` to clear the coffee
  mug above-left in the illustration; second sits at top, third at
  marginTop 5vh — creates a fan-out cascade.
- **Mobile + reduced-motion fallback**: vertical stack of card
  content, no diorama, no horizontal pin. Same content via the cards
  themselves; the illustration + tools are decorative-only and don't
  translate to vertical layout. The duplicate-id risk between mobile
  visible h2 and desktop sr-only h2 is eliminated by placing the
  sr-only h2 INSIDE `<DioramaTrack>` children — DioramaTrack picks
  one branch (mobileFallback or children) at runtime, mutually
  exclusive.
- **DioramaTrack ScrollTrigger uses `kill(true)` on cleanup** to
  revert pin spacers + body inline styles (overflow,
  scrollbar-padding) when reduced-motion / viewport-resize toggles
  the desktop branch off mid-session.
- **bg-paper on DioramaTrack section** isolates the diorama from the
  persistent root-layout `<FluidSim>` Riso canvas (which would
  otherwise bleed colored splats through the case-study). Without
  this, the Diorama looks like the hero ink is floating between the
  cards.
- **Ink columns: tried, dropped.** Three implementations attempted —
  raw WebGL2 fluid sim (advect/splat/composite), dedicated
  column-mask shader, then an SVG-paths-with-staggered-tweens
  variant — none satisfied the visual brief of "thick sharp ink
  columns pinned to the viewport edges." The diorama reads cleaner
  without them. Card-fluid interaction (cards spawning from the
  columns) was always plan §11 out-of-scope; remains so.
- **Massive cleanup**: 15 files deleted from prior slideshow attempt
  (StationContainer, StationFrame, TrackDecor, InkSplat,
  PaperWorkplace, InkTransition, 5 station components, 4 cliparts).
  Polaroid and StackNotebook primitives kept (consumed by cards).
- **`StackRow.why?: string` was optional** in card and consumer types
  during sprint — and was DROPPED in the post-PR cleanup pass when
  it was confirmed no card renders it.
- **Translation deferred** (DE source mirrored across EN/FR/IT) for
  card content; matches Phase 6/7/8/9/11 pattern. Orphan i18n keys
  from intermediate iterations (`platform.intro`, `platform.modules`,
  `stations.stack.rule`, `publicLayer.screenshots`, `subhead`, etc.)
  were stripped in the post-PR cleanup pass.
