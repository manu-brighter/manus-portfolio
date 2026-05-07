# manuelheller.dev

Personal craft portfolio. Awwwards-grade design direction, **Toon Fluid** —
fullscreen GPU Navier-Stokes fluid simulation, cel-shaded in Risograph
aesthetic. Cursor IS the force source.

> Live at [manuelheller.dev](https://manuelheller.dev) ·
> Mirror: [manuelheller.ch](https://manuelheller.ch)

## Stack

- **Framework:** Next.js 16 (App Router, static export)
- **UI:** React 19 + Tailwind v4 + Instrument Serif
- **Motion:** GSAP + ScrollTrigger + Lenis (single shared RAF ticker)
- **3D / WebGL:** React Three Fiber + Three.js + custom GLSL shaders
- **i18n:** next-intl (DE / EN / FR / IT)
- **State:** zustand (scene visibility, ink-wipe overlay, fluid bus)
- **Test:** Playwright (E2E + axe-core a11y)
- **Lint / Format:** Biome
- **Deploy:** static-export → Nginx + Cloudflare CDN

## Run locally

```bash
pnpm install
pnpm dev
```

## Build / deploy

```bash
pnpm build              # → ./out static export
pnpm ci:local           # lint + typecheck + build + e2e (mirrors CI)
pnpm test:a11y          # axe across all 4 locales
pnpm lighthouse         # local Lighthouse run (Linux/CI; broken on Windows)
```

Static export → Nginx + Cloudflare. Server-side runbook for the
initial deployment (and for a fresh AI session dropped onto the
server) lives at
[`docs/superpowers/server-handoff/2026-05-06-deploy-manusportfolio.md`](docs/superpowers/server-handoff/2026-05-06-deploy-manusportfolio.md).

## Maintenance mode

`public/maintenance.html` ships with the static export and renders
through an Nginx flag-file toggle, so the site can be taken offline
without redeploying or reloading Nginx:

```bash
# Maintenance ON  (replace <docroot> with the nginx document root —
# /var/www/manus-portfolio/out per the server-handoff doc)
touch <docroot>/.maintenance

# Maintenance OFF
rm    <docroot>/.maintenance
```

The HTTP status served during maintenance is `503` so search engines
treat the outage as temporary (no deindex). Required Nginx snippet
is documented in the HTML comment at the top of
[`public/maintenance.html`](public/maintenance.html).

## Why look at the source

This is a **vibecoded** portfolio — built with [Claude Code](https://claude.com/claude-code) over multiple iterative sessions. The repo
is open if you want to see how an AI-driven workflow scales to a
production-grade single-page-portfolio. Notable bits:

- `src/components/scene/PhotoInkMask.tsx` — per-photo dedicated WebGL2
  fluid sim that dissolves a paper overlay to reveal the photograph.
- `src/components/case-study/DioramaTrack.tsx` — sticky-pin + horizontal-
  translate diorama via GSAP ScrollTrigger.
- `src/components/motion/OverprintReveal.tsx` — Riso misregistration
  reveal primitive (3 stacked layers per char + IO-driven GSAP timeline).
- `src/lib/raf.ts` — single shared RAF ticker for GSAP + Lenis + R3F.
- `public/maintenance.html` — single-file, fully self-contained Riso-
  styled 503 page (inline CSS, system fonts, no external assets).
- `.claude/CLAUDE.md` — deviations from the original plan, accumulated
  over ~13 phases of iterative implementation.

## License

MIT for the code; all photography © Manuel Heller, all rights reserved.
