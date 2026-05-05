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
- `.claude/CLAUDE.md` — deviations from the original plan, accumulated
  over ~13 phases of iterative implementation.

## License

MIT for the code; all photography © Manuel Heller, all rights reserved.
