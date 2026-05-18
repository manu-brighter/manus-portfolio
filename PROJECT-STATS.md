# Project statistics — manus-portfolio

> Snapshot: 2026-05-14, after the full-project rework branch landed.
> Refresh anytime with `git ls-files | wc -l` and friends.

## Self-written scope

| Category                              | Files |   Lines |
| ------------------------------------- | ----: | ------: |
| TypeScript / React (`.tsx` + `.ts`)   |   123 |  13 899 |
| Shaders (`.glsl`)                     |    18 |     603 |
| Styling (`.css`)                      |     1 |     597 |
| Static page (`maintenance.html`)      |     1 |     275 |
| Build / scripts (`.mjs`)              |     6 |     779 |
| **Code subtotal**                     | **149** | **16 153** |
| i18n / content (`.json`, 4 locales)   |     4 |   3 612 |
| Docs / specs / plans (`.md`)          |    29 |  19 094 |
| Configs (`.yml`, `.gitignore`, hooks) |     6 |     178 |
| **Total tracked, self-written**       | **188** | **39 037** |

## What changed since the previous snapshot (2026-05-07)

The `chore/full-rework-2026-05-13` branch landed 28 commits that
materially reshaped the codebase:

- **+834 LOC in `.tsx`/`.ts`** even after a major consolidation pass —
  most of the gain is the new shared infrastructure (`src/lib/palette.ts`,
  `src/lib/loaderSession.ts`, `src/lib/gl/createProgram.ts`,
  `src/lib/motion/context.ts`, `src/lib/content/sections.ts`,
  `src/lib/seo/socialCard.tsx`, `src/lib/seo/escapeForScript.ts`, plus
  three new hooks: `useOrchestratorRAF`, `useHoverOrCenterViewport`,
  `useCoarsePointer`) and the new `tests/` specs (contact, mobile-nav,
  locale-switch, keyboard-nav, ink-wipe, gpu unit tests).
- **+57 LOC in `.css`** — `globals.css` collapsed the split `@layer base`
  blocks and gained the `--container-max-wide` token.
- **+65 LOC in `.mjs`** — `scripts/optimize-assets.mjs` learned the
  `public/**/source/` regression assertion + reads from `content-input/`.
- **-280 LOC in `.json`** — message files lost the orphan `backWork` +
  `ctaCaption` keys and consolidated some structure.

## How to read this

- **~16 200 lines of production code** (TS/TSX + shaders + CSS + scripts) is what the website actually runs on.
- **~3 600 lines of i18n JSON** — content across 4 locales (DE source + EN proper translation; FR/IT match the DE structure verbatim for body content until a dedicated translation pass).
- **~19 100 lines of Markdown** — almost half the repo. Specs, plans, design docs across ~13 implementation phases plus the CLAUDE.md deviations log. Pure process artefacts, no runtime weight, but they document the AI workflow at depth.

Code-to-doc ratio is roughly **1 : 1.2** — slightly less doc-heavy than the previous snapshot (1 : 1.3) because the rework pulled out duplicates from code without adding more spec docs.

## Excluded from the count

`node_modules/`, `pnpm-lock.yaml`, `next-env.d.ts`, all binary assets (photos, AVIF/WebP/JPG/PNG, fonts), and generated build output (`out/`, `.next/`). Master assets now live under `content-input/` (gitignored), so they don't appear in tracked-file counts.

## Total tracked files (incl. assets, configs, etc.)

**334 files** via `git ls-files | wc -l`. Up from 193 self-written above — the delta is photo/icon/font binaries + the playground/legal/case-study assets that ship through the static export.

## Reproduce

```bash
git ls-files \
  | grep -vE '\.(png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|otf|eot|pdf|mp4|mov|psd|sketch|fig)$' \
  | grep -vE '^(pnpm-lock\.yaml|package-lock\.json|next-env\.d\.ts)$' \
  | xargs -d '\n' wc -l
```
