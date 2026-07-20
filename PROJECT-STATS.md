# Project statistics — manus-portfolio

> Snapshot: 2026-07-20, after the creative pass (CV press proof, tile reveals, image quality).
> Refresh anytime with `git ls-files | wc -l` and friends.

## Self-written scope

| Category                              | Files |   Lines |
| ------------------------------------- | ----: | ------: |
| TypeScript / React (`.tsx` + `.ts`)   |   182 |  22 451 |
| Shaders (`.glsl`)                     |    21 |     951 |
| Styling (`.css`)                      |     1 |   1 242 |
| Static page (`maintenance.html`)      |     1 |     292 |
| Build / scripts (`.mjs`)              |     8 |   1 007 |
| **Code subtotal**                     | **213** | **25 943** |
| i18n / content (`.json`, 4 locales)   |    24 |   4 636 |
| Docs / specs / plans (`.md`)          |    35 |  22 249 |
| Configs (`.yml`, `.gitignore`, hooks) |     6 |     316 |
| **Total tracked, self-written**       | **278** | **53 144** |

## What changed since the previous snapshot (2026-05-14)

Two months of feature work, roughly doubling the codebase. The through-line
is that the fluid sim stopped being one look on one device and became a
switchable system that reaches everywhere:

- **+8 550 LOC in `.tsx`/`.ts`.** The Wow-Pass and theme-differentiation
  branches added the five user-switchable sim presets
  (`src/lib/content/simPresets.ts`, `src/lib/simPresetStore.ts`,
  `SimPresetSwitcher`, `SimThemeSync`, `InkCursor`), the mobile rework
  (`MobileBackgroundSim`, `PhotographyMobile`, `CaseStudyMobileCarousel`,
  `useMobileLayout`, `useCoarsePointer`), the `/cv` press-proof route
  (`src/components/cv/`), the About tile-reveal overlay, the Work
  side-projects strip, and the console menu plus Fehldruck easter egg.
  The `tests/` tree grew from 19 to 28 specs alongside it.
- **+348 LOC in `.glsl`, 18 → 21 files.** `render-toon.frag.glsl` and
  `common/posterize.glsl` were retired; five per-preset render shaders
  took their place (riso, wave, turbulenz, aquarell, nachtdruck), each
  with its own band ladder, halftone or granulation character.
- **+645 LOC in `.css`.** `globals.css` carries the per-theme token
  overrides (`data-sim-theme` night / warm / wash / wave), the tile-press
  keyframes, the print block that makes `window.print()` the CV's PDF
  export, and the Tweakpane theming variables.
- **4 → 24 message files.** SF-5 split the single per-locale `messages/*.json`
  into per-route namespaces (common, home, cv, legal, playground, notFound)
  so each route ships only the payload it needs. Content grew by ~1 000
  lines on top of that, mostly the new `cv` namespace.
- **+3 155 LOC in `.md`.** The mobile-rework plan and spec, `docs/cv.md`,
  the Cloudflare Worker contact README, and a much longer CLAUDE.md
  deviations log.
- **Contact went serverless.** The PHP-FPM template under `infra/contact/`
  is superseded by a Cloudflare Worker to Resend bridge
  (`infra/contact-worker/`) that intercepts at the CF edge, so the box
  still runs nothing but nginx.

## How to read this

- **~25 900 lines of production code** (TS/TSX + shaders + CSS + scripts) is what the website actually runs on.
- **~4 600 lines of i18n JSON** across 4 locales, now split per route (DE source + EN proper translation; FR/IT match the DE structure verbatim for body content until a dedicated translation pass).
- **~22 200 lines of Markdown.** Specs, plans, design docs across ~13 implementation phases plus the CLAUDE.md deviations log. Pure process artefacts, no runtime weight, but they document the AI workflow at depth.

Code-to-doc ratio is roughly **1 : 0.9**, down from 1 : 1.2 in the previous snapshot. The docs kept growing, the code just grew faster.

## Excluded from the count

`node_modules/`, `pnpm-lock.yaml`, `next-env.d.ts`, all binary assets (photos, AVIF/WebP/JPG/PNG, fonts), and generated build output (`out/`, `.next/`). Master assets now live under `content-input/` (gitignored), so they don't appear in tracked-file counts.

## Total tracked files (incl. assets, configs, etc.)

**501 files** via `git ls-files | wc -l`. Up from 278 self-written above. The delta is photo/icon/font binaries plus the playground/legal/case-study/CV assets that ship through the static export, and it grew with the image-quality pass (extra srcset rungs, the five-theme composite, the night-theme stamp variants, the About tile crops in both orientations).

## Reproduce

```bash
git ls-files \
  | grep -vE '\.(png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|otf|eot|pdf|mp4|mov|psd|sketch|fig)$' \
  | grep -vE '^(pnpm-lock\.yaml|package-lock\.json|next-env\.d\.ts)$' \
  | xargs -d '\n' wc -l
```
