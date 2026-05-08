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

## Folder conventions

- `src/app/` — App Router pages & layouts (locale segment lives here)
- `src/components/ui` — pure DOM components
- `src/components/sections` — page sections (Hero, About, Work, Playground, Contact)
- `src/components/scene` — WebGL/R3F wrappers; one persistent `<Canvas>` only
- `src/components/motion` — GSAP primitives
- `src/shaders/` — GLSL split into `common/`, `fluid/`, `toon/`, `photo-duotone/`, `page-transition/`
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
- **Skills**: `VibecodedStamp` IO `threshold: 0.4`; stagger via parent
  `delay={i * 0.08}` prop. `HeroSkillPulse` loops continuously without IO
  gate (cheap, avoids re-mount cycle restart).
- **Work**: editorial DOM/SVG cards (no 3D toon planes — would compete with
  hero sim). Cards dispatch splats via `fluidBus`. `PortfolioCardVisual` is
  generative SVG (no real screenshot, no re-shoot per iteration).
- **Case Study**: inline section, NOT a `/work/[slug]` route. Diorama design
  (one wide SVG illustration + absolute-positioned HTML cards in vh units,
  4200×1000 viewBox at 100vh tall = 420vh wide horizontal-pin track).
  - Mobile/reduced-motion fallback breakpoint is **height-aware**:
    `(max-width: 767px), (max-height: 899px)` — catches 1366×768, 1600×900.
  - `bg-paper` on `<DioramaTrack>` isolates from root FluidSim ink bleed.
  - `<DioramaTrack>` ScrollTrigger uses `kill(true)` on cleanup to revert
    pin spacers when reduced-motion / resize toggles desktop branch off.
  - `Polaroid` is case-study-exclusive; About-Portrait uses
    `src/components/ui/Portrait.tsx` (different component, no token cross-talk).
- **Photography**: editorial-asymmetric flow (full-bleed + side-text-paired
  layouts), no sticky pins, no ScrollTrigger. Each `PhotoInkMask` owns an
  isolated WebGL2 context with simplified two-program sim (advect + splat +
  mask, no pressure solve). Trigger IO: `rootMargin: "-20% 0px -20% 0px"`,
  `threshold: 0` — fires when photo enters central 60% band. Document
  pointermove listener detached + ambient queue cleared at reveal lock.
- **Playground**: Leva ships in prod (the demo IS runtime parameter
  exploration). Mini-sims on cards stay paused after first hover/focus for
  instant re-hovers. Dynamic-imported in `/playground/[slug]` so home pays
  zero cost.
- **Contact**: form is fully built but submit is **stubbed** (320ms graceful
  fallback → mailto:`SITE.author.email`). Cloudflare Worker → Resend bridge
  is the next sprint. Honeypot field (`bot-trap`, off-screen, `tabIndex=-1`,
  `aria-hidden`) — trip silently swallows (`return` after `preventDefault`),
  never expose mailto fallback to bots.
- **Legal**: `/[locale]/impressum` + `/[locale]/datenschutz` as separate
  routes through shared `<LegalDocument namespace>` server component.
  CH-conform DSG/revDSG + EU DSGVO informational. No cookie banner (site
  sets no cookies; documented in datenschutz).
- **404**: `src/app/not-found.tsx` owns its own `<html>`/`<body>` shell
  (root layout is pass-through). Strings come from `notFound` namespace at
  `routing.defaultLocale`. `<html lang="de">` hardcoded; `noindex`. Footer
  has locale-switch row to hand users back into preferred locale's home.

## Launch / SEO / metadata

- **`src/lib/seo/metadata.ts`** builds per-locale `Metadata`. Hard-sets
  `robots: { index: true, follow: true }` from this sprint forward.
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
