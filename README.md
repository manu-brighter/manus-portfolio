# Manuel Heller — Craft Portfolio

An Awwwards-grade personal portfolio, design direction "Toon Fluid" — a fullscreen
GPU Navier-Stokes fluid simulation rendered in a cel-shaded Risograph aesthetic.

Stack: Next 16 · React 19 · TypeScript · Tailwind v4 · R3F 9 · GSAP · Lenis ·
next-intl · Contentlayer2 · MDX. Static export to Nginx. Package manager: **pnpm**.

```bash
pnpm install        # install dependencies
pnpm dev            # localhost:3000
pnpm build          # static export to ./out
pnpm lint           # Biome check
pnpm typecheck      # tsc --noEmit
pnpm test           # Playwright smoke
pnpm lighthouse     # LHCI against ./out
```

Full specification (architecture, design tokens, performance budget, phases):
see [`docs/plan.md`](./docs/plan.md).
