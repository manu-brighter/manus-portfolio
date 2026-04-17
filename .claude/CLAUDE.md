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
