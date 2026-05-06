# Launch Pass — SEO + Meta + Favicon + Pre-Deployment Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the manuelheller.dev portfolio to launch-ready, Awwwards-grade state — full SEO/meta layer, branded favicon pipeline (Riso-Ink-Drop + MH lettering, multiple bg variants), accessible mobile-aware navigation, View Transitions for locale-switch, and pre-deployment content fixes (Skills/Work/Nav). Ends with a server-side handoff prompt for the deploy step.

**Architecture:** Lean on Next 16 file-based metadata + dynamic OG via `next/og`. Site identity stays in `src/lib/site.ts`; per-locale title/description fanned out via next-intl message keys consumed by `generateMetadata()`. Favicon pipeline: one SVG source, multiple PNG variants for different rendering contexts (transparent for browser-tabs, paper-bg for iOS/Android/SERP). No new runtime deps — `next/og` is built-in, `sharp` already in devDependencies for asset generation.

**Tech Stack:** Existing — Next.js 16 (App Router metadata API), React 19, TypeScript, Tailwind v4, next-intl, GSAP, sharp. New deps: none.

**Spec reference:** Conversation 2026-05-06 with Manuel:
- Favicon: farbiger Ink-Splat in den 4 Hero-Spot-Farben (rose/amber/mint/violet) mit flüssig überlaufendem "MH" — multiple Varianten je nach Use-Case
- Domain: `manuelheller.dev` (primary) + `manuelheller.ch` (301-redirect, beide Ionos)
- DNS: Cloudflare davor (Ionos slow-DNS-Workaround)
- Analytics: Plausible self-hosted (DSG/DSGVO-konform, no-cookie-banner)
- noindex toggle: handled in Sprint 13b handoff prompt (after first successful prod-deploy)
- Pre-deployment items: Skills "vibecoded" tier needs +next-intl/zustand/GLSL; Portfolio Work-card stack needs +zustand/ScrollTrigger; Nav needs all sections + mobile hamburger

**Branch:** `feat/launch-pass` (branched from main at `005af9b`)

---

## File structure

### New files

```
src/app/
├── icon.tsx                            # 32×32 transparent — browser tab favicon
├── apple-icon.tsx                      # 180×180 paper-bg — iOS home-screen
├── opengraph-image.tsx                 # 1200×630 paper-bg — social share
├── twitter-image.tsx                   # 1200×600 paper-bg — Twitter card
├── sitemap.ts                          # all 4 locale routes + statics
├── robots.ts                           # env-aware allow/disallow
└── manifest.webmanifest                # PWA-light manifest

public/
├── icon-192.png                        # Android Chrome — paper-bg
├── icon-512.png                        # Android splash — paper-bg
├── icon-maskable-192.png               # Android adaptive — safe-area padded
└── icon-maskable-512.png               # Android adaptive — safe-area padded

scripts/
└── generate-favicons.mjs               # SVG → all PNG variants via sharp

public/brand/
└── icon-source.svg                     # Single SVG source — ink-splat + MH

src/components/ui/
└── NavMobileMenu.tsx                   # Hamburger + slide-down dropdown

src/components/motion/
└── useViewTransition.ts                # View Transitions API hook

src/lib/seo/
├── jsonLd.ts                           # Person + WebSite schema builders
└── metadata.ts                         # generateMetadata helper per route
```

### Modified files

- `src/app/[locale]/layout.tsx` — add generateMetadata + JSON-LD injection + viewTransition wrapper
- `src/app/layout.tsx` — drop `index: false` (managed in handoff prompt phase) + add manifest reference
- `src/app/[locale]/page.tsx` — section-aware title (uses generic for now, per-section optional later)
- `src/app/not-found.tsx` — bigger ink-bloom visual + brand consistency
- `src/components/ui/Nav.tsx` — add Skills/Photography to NAV_ITEMS, integrate NavMobileMenu, IO-driven aria-current
- `src/i18n/navigation.ts` — verify locale-switching preserves hash (Phase 3 TODO note in Nav.tsx)
- `src/components/sections/Skills.tsx` — i18n side: 3 new vibecoded items (next-intl, zustand, GLSL)
- `src/components/sections/Work.tsx` — i18n side: portfolio.stack adds zustand + ScrollTrigger
- `messages/{de,en,fr,it}.json` — Skills + Work updates, new metadata keys
- `.gitignore` — add `next-env.d.ts`
- `README.md` — Awwwards-grade rewrite

### Deleted files

- `next-env.d.ts` (committed) — replaced by .gitignore entry; pre-commit hook stays as belt-and-suspenders

---

## Task list

### Task 1: Pre-deployment content fixes — Skills + Work + Nav i18n

**Files:**
- Modify: `messages/de.json`, `messages/en.json`, `messages/fr.json`, `messages/it.json`
- Modify: `src/components/ui/Nav.tsx`

- [ ] **Step 1.1: Update Vibecoded Stack tier in DE messages**

In `messages/de.json`, locate `skills.tiers[]` entry with `id: "vibecoded"`. Append three new items at the end of the `items` array:

```json
{
  "name": "next-intl",
  "vibecoded": true
},
{
  "name": "zustand",
  "vibecoded": true
},
{
  "name": "GLSL · WebGL Shader",
  "vibecoded": true
}
```

The tier now has 13 items total (up from 10).

- [ ] **Step 1.2: Mirror to EN/FR/IT**

The other 3 locale files mirror DE for the vibecoded-stack section per the project's translation-deferred pattern. Apply the same 3-item append to `messages/en.json`, `messages/fr.json`, `messages/it.json`. Each item's `name` stays identical across locales (these are tech names, not translatable copy).

- [ ] **Step 1.3: Update Portfolio Work-Card stack in DE messages**

In `messages/de.json`, locate `work.projects[]` entry with `id: "portfolio"`. Replace the `stack` array with:

```json
"stack": [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind v4",
  "GSAP · ScrollTrigger",
  "Lenis",
  "R3F",
  "WebGL Shader",
  "next-intl",
  "zustand"
]
```

(Added: `zustand`. Renamed: `GSAP` → `GSAP · ScrollTrigger` to make the heavy-use-tool explicit.)

- [ ] **Step 1.4: Mirror to EN/FR/IT**

Apply the same `stack` replacement to the portfolio entry in `messages/en.json`, `messages/fr.json`, `messages/it.json`. Stack values stay identical (tech names, not translatable).

- [ ] **Step 1.5: Add Nav items for Skills + Photography**

In `messages/de.json`, locate `nav.items` object. Add two new keys:

```json
"skills": "Skills",
"casestudy": "Case Study",
"photography": "Fotografie"
```

(All three added even though we won't initially link `casestudy` from desktop — it's reserved for the mobile menu where we want to show all sections.)

- [ ] **Step 1.6: Mirror Nav items to EN/FR/IT**

`messages/en.json` adds: `"skills": "Skills"`, `"casestudy": "Case Study"`, `"photography": "Photography"`.
`messages/fr.json` adds: `"skills": "Skills"`, `"casestudy": "Étude de cas"`, `"photography": "Photographie"`.
`messages/it.json` adds: `"skills": "Skills"`, `"casestudy": "Caso studio"`, `"photography": "Fotografia"`.

- [ ] **Step 1.7: Update Nav.tsx NAV_ITEMS**

In `src/components/ui/Nav.tsx`, replace the current `NAV_ITEMS` const + comment block with:

```tsx
// Order matches the on-page section flow in [locale]/page.tsx:
//   Hero → About → Skills → Work → CaseStudy → Photography → Playground → Contact
// Hero is meta (not anchored). CaseStudy is reachable from the Work card,
// kept out of the desktop bar to avoid 7+ items but surfaced in the mobile
// menu for completeness.
const NAV_ITEMS_DESKTOP = [
  { href: "#about", key: "about" },
  { href: "#skills", key: "skills" },
  { href: "#work", key: "work" },
  { href: "#photography", key: "photography" },
  { href: "#playground", key: "playground" },
  { href: "#contact", key: "contact" },
] as const;

const NAV_ITEMS_MOBILE = [
  { href: "#about", key: "about" },
  { href: "#skills", key: "skills" },
  { href: "#work", key: "work" },
  { href: "#case-study", key: "casestudy" },
  { href: "#photography", key: "photography" },
  { href: "#playground", key: "playground" },
  { href: "#contact", key: "contact" },
] as const;
```

Update the JSX to use `NAV_ITEMS_DESKTOP` instead of `NAV_ITEMS`. Mobile rendering is added in Task 9 — leave a comment placeholder for now:

```tsx
{/* Mobile hamburger: see Task 9 (Launch Pass plan). NAV_ITEMS_MOBILE is consumed there. */}
```

- [ ] **Step 1.8: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean. Build succeeds with all message keys resolved across 4 locales.

- [ ] **Step 1.9: Commit**

```bash
git add messages/ src/components/ui/Nav.tsx
git commit -m "feat(content): pre-launch — vibecoded tier +3 items, portfolio stack +zustand, nav adds skills/photography"
```

---

### Task 2: next-env.d.ts → .gitignore

**Files:**
- Modify: `.gitignore`
- Delete (from tracking): `next-env.d.ts`

- [ ] **Step 2.1: Add next-env.d.ts to .gitignore**

In `.gitignore`, locate the `# Node / Bun (will apply once Phase 0 lands)` section. Add a new entry below `coverage/`:

```
# Next.js auto-generated TypeScript reference — content differs between
# `next dev` (`./.next/dev/types/...`) and `next build` (`./.next/types/...`).
# Regenerated on every dev/build invocation; never commit.
next-env.d.ts
```

- [ ] **Step 2.2: Stop tracking the file**

```bash
git rm --cached next-env.d.ts
```

This removes it from git tracking but keeps the working-copy file (Next.js will regenerate it on next `pnpm dev` or `pnpm build`).

- [ ] **Step 2.3: Verify**

Run: `git status` — should show `next-env.d.ts` is no longer staged for deletion AND no longer in tracked files. The file should still exist on disk.

Run: `pnpm build` — should regenerate `next-env.d.ts` (now untracked, ignored).

- [ ] **Step 2.4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore next-env.d.ts (auto-generated, content varies dev/build)"
```

---

### Task 3: Brand source SVG — Riso ink-splat + flowing MH

**Files:**
- Create: `public/brand/icon-source.svg`

- [ ] **Step 3.1: Write the source SVG**

Create `public/brand/icon-source.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <title>Manuel Heller — Brand Icon</title>
  <defs>
    <!-- Multiply blend so overlapping spot colours mix Riso-style. -->
    <filter id="riso" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="0.4" />
    </filter>
  </defs>

  <!-- Four overlapping ink-blobs in Riso spot colours.
       Positions roughly form a diamond around the centre so MH
       letters land on a multi-colour midground. -->
  <g style="mix-blend-mode: multiply" filter="url(#riso)">
    <ellipse cx="22" cy="22" rx="20" ry="18" fill="#FF6BA0" opacity="0.85" transform="rotate(-12 22 22)" />
    <ellipse cx="42" cy="22" rx="18" ry="20" fill="#FFC474" opacity="0.85" transform="rotate(8 42 22)" />
    <ellipse cx="22" cy="42" rx="19" ry="18" fill="#7CE8C4" opacity="0.85" transform="rotate(15 22 42)" />
    <ellipse cx="42" cy="42" rx="20" ry="19" fill="#B89AFF" opacity="0.85" transform="rotate(-8 42 42)" />
  </g>

  <!-- "MH" — Instrument Serif italic, ink colour, slight misregistration
       ghost layers (rose +1px / mint -1px) for the OverprintReveal feel. -->
  <g font-family="'Instrument Serif', 'Times New Roman', serif" font-style="italic" font-weight="400" font-size="36" text-anchor="middle">
    <text x="33" y="42" fill="#FF6BA0" opacity="0.55" style="mix-blend-mode: multiply">MH</text>
    <text x="31" y="44" fill="#7CE8C4" opacity="0.55" style="mix-blend-mode: multiply">MH</text>
    <text x="32" y="43" fill="#0A0608">MH</text>
  </g>
</svg>
```

The hex colours match `--color-spot-{rose,amber,mint,violet}` and `--color-ink` from `globals.css`. The font is Instrument Serif (we ship it via @fontsource); SVG `<text>` falls back gracefully to Times-style serif at the OS level if the font isn't loaded (relevant for Android adaptive icons that pre-render the SVG).

- [ ] **Step 3.2: Verify rendering**

Open `public/brand/icon-source.svg` in a browser at large size (e.g., view-source then drag-drop into a new tab). Confirm:
- Four overlapping ink-blobs visible, multiply-blending into mid-tones at intersections
- "MH" centred, in italic serif, with subtle rose + mint ghost offsets
- No clipping at the 64×64 viewBox edges

If positioning looks off, tweak ellipse cx/cy/rx/ry — the source SVG is the master, all PNG variants regenerate from this in Task 4.

- [ ] **Step 3.3: Commit**

```bash
git add public/brand/icon-source.svg
git commit -m "feat(brand): icon source SVG — Riso ink-splat with MH lettering"
```

---

### Task 4: Generate favicon variants from source SVG

**Files:**
- Create: `scripts/generate-favicons.mjs`
- Create (via script): `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-192.png`, `public/icon-maskable-512.png`
- Create: `src/app/icon.tsx`, `src/app/apple-icon.tsx`

- [ ] **Step 4.1: Write the favicon generator script**

Create `scripts/generate-favicons.mjs`:

```js
#!/usr/bin/env node
// Generate PNG favicon variants from public/brand/icon-source.svg.
// Run via `node scripts/generate-favicons.mjs` after editing the source SVG.
//
// Variants:
//   icon-192.png            Android Chrome standard, paper-bg, full bleed
//   icon-512.png            Android splash, paper-bg, full bleed
//   icon-maskable-192.png   Android adaptive icon, paper-bg + 80% safe-area
//   icon-maskable-512.png   Android adaptive icon, paper-bg + 80% safe-area
//
// Browser tab (icon.tsx) and iOS apple-icon (apple-icon.tsx) are generated
// at request-time by Next 16's metadata API — see src/app/icon.tsx.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const srcPath = `${root}/public/brand/icon-source.svg`;
const outDir = `${root}/public`;

const PAPER_BG = "#F0E8D7"; // matches --color-paper

async function generate({ size, masked, outName }) {
  const svg = await readFile(srcPath);
  const safeArea = masked ? 0.8 : 1.0; // 80% safe area for maskable variants
  const innerSize = Math.round(size * safeArea);
  const padding = Math.round((size - innerSize) / 2);

  const inner = await sharp(svg).resize(innerSize, innerSize).png().toBuffer();

  const final = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PAPER_BG,
    },
  })
    .composite([{ input: inner, top: padding, left: padding }])
    .png()
    .toBuffer();

  await writeFile(`${outDir}/${outName}`, final);
  console.log(`  ${outName} (${size}×${size}${masked ? ", maskable" : ""})`);
}

console.log("Generating favicon variants from icon-source.svg…");
await generate({ size: 192, masked: false, outName: "icon-192.png" });
await generate({ size: 512, masked: false, outName: "icon-512.png" });
await generate({ size: 192, masked: true, outName: "icon-maskable-192.png" });
await generate({ size: 512, masked: true, outName: "icon-maskable-512.png" });
console.log("Done.");
```

- [ ] **Step 4.2: Run the generator**

```bash
node scripts/generate-favicons.mjs
```

Expected output: 4 PNG files in `public/`, each with paper-coloured background. Maskable variants have 10% transparent-paper-bg padding around the icon for Android's mask-shape requirement.

Visual sanity check: open `public/icon-512.png` and `public/icon-maskable-512.png` — both should show the ink-splat + MH on paper background; maskable variant has a clearly larger margin around the icon.

- [ ] **Step 4.3: Write src/app/icon.tsx (browser tab — transparent)**

```tsx
import { ImageResponse } from "next/og";

// Browser tab favicon — 32×32 transparent PNG generated at request-time
// from inline SVG. Transparent background because tabs have their own
// rendering context (light/dark theme) and would clip a paper-bg poorly.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width="32"
          height="32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g style={{ mixBlendMode: "multiply" }}>
            <ellipse cx="22" cy="22" rx="20" ry="18" fill="#FF6BA0" opacity="0.85" transform="rotate(-12 22 22)" />
            <ellipse cx="42" cy="22" rx="18" ry="20" fill="#FFC474" opacity="0.85" transform="rotate(8 42 22)" />
            <ellipse cx="22" cy="42" rx="19" ry="18" fill="#7CE8C4" opacity="0.85" transform="rotate(15 22 42)" />
            <ellipse cx="42" cy="42" rx="20" ry="19" fill="#B89AFF" opacity="0.85" transform="rotate(-8 42 42)" />
          </g>
          <text
            x="32"
            y="43"
            fontFamily="serif"
            fontStyle="italic"
            fontSize="36"
            textAnchor="middle"
            fill="#0A0608"
          >
            MH
          </text>
        </svg>
      </div>
    ),
    { ...size },
  );
}
```

(Inline SVG instead of importing the source file — `next/og` doesn't support arbitrary file imports as raw strings; fastest to inline the geometry. Trade-off: source SVG and icon.tsx must stay in sync; both touched together if the brand changes.)

- [ ] **Step 4.4: Write src/app/apple-icon.tsx (iOS — paper bg)**

```tsx
import { ImageResponse } from "next/og";

// iOS home-screen icon — 180×180 with paper-coloured background.
// iOS clips icons to a rounded-rect shape (no transparency support);
// paper-bg ensures the rounded corners blend into the surrounding
// home-screen wallpaper instead of cutting to black/white.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F0E8D7", // --color-paper
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width="160"
          height="160"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g style={{ mixBlendMode: "multiply" }}>
            <ellipse cx="22" cy="22" rx="20" ry="18" fill="#FF6BA0" opacity="0.85" transform="rotate(-12 22 22)" />
            <ellipse cx="42" cy="22" rx="18" ry="20" fill="#FFC474" opacity="0.85" transform="rotate(8 42 22)" />
            <ellipse cx="22" cy="42" rx="19" ry="18" fill="#7CE8C4" opacity="0.85" transform="rotate(15 22 42)" />
            <ellipse cx="42" cy="42" rx="20" ry="19" fill="#B89AFF" opacity="0.85" transform="rotate(-8 42 42)" />
          </g>
          <text
            x="32"
            y="43"
            fontFamily="serif"
            fontStyle="italic"
            fontSize="36"
            textAnchor="middle"
            fill="#0A0608"
          >
            MH
          </text>
        </svg>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 4.5: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean. Build artifacts include the icon route output.

Run a dev server and inspect:
- `http://localhost:3000/icon` — should serve a 32×32 PNG with transparent bg
- `http://localhost:3000/apple-icon` — should serve a 180×180 PNG with paper bg

- [ ] **Step 4.6: Commit**

```bash
git add scripts/generate-favicons.mjs src/app/icon.tsx src/app/apple-icon.tsx public/icon-192.png public/icon-512.png public/icon-maskable-192.png public/icon-maskable-512.png
git commit -m "feat(seo): favicon pipeline — icon.tsx (transparent), apple-icon.tsx (paper-bg), generated Android variants"
```

---

### Task 5: Web app manifest (PWA-light)

**Files:**
- Create: `src/app/manifest.webmanifest` (or `manifest.ts` for typed Next.js generation)

- [ ] **Step 5.1: Write manifest.ts**

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Web app manifest — PWA-light. Enables Add-to-Homescreen on Android +
 * Chrome desktop. iOS uses apple-icon.tsx + meta tags rendered by the
 * App Router metadata API instead.
 *
 * The maskable icons let Android render the icon inside its theme's
 * mask shape (circle, squircle, etc.) without clipping the artwork.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F0E8D7", // --color-paper
    theme_color: "#0A0608", // --color-ink
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

- [ ] **Step 5.2: Verify**

Run: `pnpm build`
Expected: `out/manifest.webmanifest` exists with the shape above.

```bash
cat out/manifest.webmanifest
```

Expected output: JSON conforming to the W3C web app manifest spec, with all 4 icon entries.

- [ ] **Step 5.3: Commit**

```bash
git add src/app/manifest.ts
git commit -m "feat(seo): web app manifest for PWA-light add-to-homescreen support"
```

---

### Task 6: Sitemap

**Files:**
- Create: `src/app/sitemap.ts`

- [ ] **Step 6.1: Write sitemap.ts**

Create `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/**
 * Sitemap — enumerates all locale-prefixed routes for search-engine
 * discovery. Each entry includes alternates for the other 3 locales
 * via the `alternates.languages` field, signalling to Google that
 * /de/, /en/, /fr/, /it/ are translations of one another (the
 * hreflang protocol — also redundantly emitted as <link rel="alternate"
 * hreflang="..."/> via generateMetadata in Task 8 for AT/legacy crawlers).
 *
 * lastModified is set to the build time. We don't track per-route
 * content edits; for a portfolio that's fine.
 */
const STATIC_PATHS = ["", "/impressum", "/datenschutz"] as const;
const PLAYGROUND_SLUGS = ["ink-drop-studio", "type-as-fluid"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      const url = `${SITE.url}/${locale}${path}/`;
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "monthly",
        priority: path === "" ? 1.0 : 0.5,
        alternates: {
          languages: Object.fromEntries(
            routing.locales
              .filter((l) => l !== locale)
              .map((l) => [l, `${SITE.url}/${l}${path}/`]),
          ),
        },
      });
    }
    for (const slug of PLAYGROUND_SLUGS) {
      const url = `${SITE.url}/${locale}/playground/${slug}/`;
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            routing.locales
              .filter((l) => l !== locale)
              .map((l) => [l, `${SITE.url}/${l}/playground/${slug}/`]),
          ),
        },
      });
    }
  }

  return entries;
}
```

- [ ] **Step 6.2: Verify**

Run: `pnpm build`

```bash
cat out/sitemap.xml | head -40
```

Expected: valid XML sitemap with `<url>` entries for `/de/`, `/en/`, `/fr/`, `/it/` × 3 static paths × 2 playground slugs = 20 entries. Each `<url>` includes `<xhtml:link rel="alternate" hreflang="..."/>` for the other 3 locales.

- [ ] **Step 6.3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(seo): sitemap.xml with locale alternates for hreflang signalling"
```

---

### Task 7: robots.txt

**Files:**
- Create: `src/app/robots.ts`

- [ ] **Step 7.1: Write robots.ts**

Create `src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * robots.txt — production allows all crawlers, disallows the
 * playground experiments (decorative, not content) + .next internals.
 *
 * For preview deploys / local builds, set NEXT_PUBLIC_ROBOTS_DISALLOW=true
 * to disallow everything (prevents Lighthouse/preview URLs from being
 * indexed if accidentally exposed).
 */
export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.NEXT_PUBLIC_ROBOTS_DISALLOW === "true";

  if (isPreview) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${SITE.url}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/playground/*", "/_next/", "/api/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
```

- [ ] **Step 7.2: Verify**

Run: `pnpm build`

```bash
cat out/robots.txt
```

Expected:
```
User-Agent: *
Allow: /
Disallow: /playground/*
Disallow: /_next/
Disallow: /api/

Host: https://manuelheller.dev
Sitemap: https://manuelheller.dev/sitemap.xml
```

- [ ] **Step 7.3: Commit**

```bash
git add src/app/robots.ts
git commit -m "feat(seo): robots.txt with playground/internal exclusions + env-aware preview disallow"
```

---

### Task 8: Per-locale generateMetadata + hreflang alternates

**Files:**
- Create: `src/lib/seo/metadata.ts`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `messages/{de,en,fr,it}.json` (add `meta.title` + `meta.description` per locale)

- [ ] **Step 8.1: Add per-locale meta strings to DE messages**

In `messages/de.json` at the root level, add a new `meta` namespace:

```json
"meta": {
  "title": "Manuel Heller — Craft Portfolio",
  "titleTemplate": "%s · Manuel Heller",
  "description": "Portfolio von Manuel Heller, Full-Stack Developer (PHP/Vue) bei zvoove Switzerland mit künstlerischem Auge für Webdesign, Fotografie und Shader. Vibecoded mit Claude Code.",
  "keywords": [
    "Manuel Heller",
    "Portfolio",
    "Full-Stack Developer",
    "WebGL",
    "Shader",
    "Vibecoding",
    "Riso Design",
    "Schweiz",
    "Basel"
  ]
}
```

- [ ] **Step 8.2: Mirror to EN/FR/IT**

`messages/en.json`:
```json
"meta": {
  "title": "Manuel Heller — Craft Portfolio",
  "titleTemplate": "%s · Manuel Heller",
  "description": "Portfolio of Manuel Heller, full-stack developer (PHP/Vue) at zvoove Switzerland with an eye for web design, photography, and shaders. Vibecoded with Claude Code.",
  "keywords": ["Manuel Heller", "Portfolio", "Full-Stack Developer", "WebGL", "Shader", "Vibecoding", "Riso Design", "Switzerland", "Basel"]
}
```

`messages/fr.json`:
```json
"meta": {
  "title": "Manuel Heller — Portfolio",
  "titleTemplate": "%s · Manuel Heller",
  "description": "Portfolio de Manuel Heller, développeur full-stack (PHP/Vue) chez zvoove Switzerland avec un œil pour le webdesign, la photographie et les shaders. Vibecodé avec Claude Code.",
  "keywords": ["Manuel Heller", "Portfolio", "Développeur Full-Stack", "WebGL", "Shader", "Vibecoding", "Design Riso", "Suisse", "Bâle"]
}
```

`messages/it.json`:
```json
"meta": {
  "title": "Manuel Heller — Portfolio",
  "titleTemplate": "%s · Manuel Heller",
  "description": "Portfolio di Manuel Heller, full-stack developer (PHP/Vue) presso zvoove Switzerland con un occhio per il web design, la fotografia e gli shader. Vibecoded con Claude Code.",
  "keywords": ["Manuel Heller", "Portfolio", "Full-Stack Developer", "WebGL", "Shader", "Vibecoding", "Riso Design", "Svizzera", "Basilea"]
}
```

- [ ] **Step 8.3: Write src/lib/seo/metadata.ts**

```ts
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/**
 * Build per-locale metadata for a route. Includes:
 *   - title + description per locale (from messages.meta.*)
 *   - canonical URL pointing at the current locale's path
 *   - alternates.languages for hreflang signalling (4 locales)
 *   - openGraph + twitter card metadata pointing at the dynamic
 *     OG/Twitter routes generated in Task 9
 *
 * Consumed by `src/app/[locale]/layout.tsx`'s `generateMetadata`.
 */
export async function buildLocaleMetadata({
  locale,
  pathname = "",
}: {
  locale: Locale;
  pathname?: string;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  const canonical = `${SITE.url}/${locale}${pathname}/`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE.url}/${l}${pathname}/`;
  }
  // x-default points at the default locale per Google's hreflang spec.
  languages["x-default"] = `${SITE.url}/${routing.defaultLocale}${pathname}/`;

  return {
    metadataBase: new URL(SITE.url),
    title: { default: title, template: t("titleTemplate") },
    description,
    keywords: t.raw("keywords") as string[],
    authors: [{ name: SITE.author.name, url: SITE.url }],
    creator: SITE.author.name,
    publisher: SITE.author.name,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      locale: locale.replace("-", "_"),
      url: canonical,
      siteName: SITE.shortName,
      title,
      description,
      images: [
        {
          url: `${SITE.url}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE.url}/${locale}/twitter-image`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}
```

- [ ] **Step 8.4: Wire generateMetadata into [locale]/layout.tsx**

In `src/app/[locale]/layout.tsx`, ABOVE the existing `LocaleLayout` component:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return buildLocaleMetadata({ locale, pathname: "" });
}
```

Add the imports at the top of the file:

```tsx
import type { Metadata } from "next";
import { buildLocaleMetadata } from "@/lib/seo/metadata";
```

- [ ] **Step 8.5: Strip the now-redundant root-layout metadata**

In `src/app/layout.tsx`, the existing `metadata` export defines a generic title + `index: false`. With per-locale metadata in [locale]/layout.tsx, this is redundant for the locale routes. Update the root metadata to:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://manuelheller.dev"),
  title: "Manuel Heller — Craft Portfolio",
  description: "Toon Fluid — an Awwwards-grade craft portfolio by Manuel Heller.",
  // Per-locale metadata in [locale]/layout.tsx overrides this for locale routes.
  // The root index.html (locale redirect) inherits this minimal shape.
};
```

(`robots: index: false` removed — it's now controlled per-route via the per-locale metadata, which sets `index: true`. The handoff prompt in Sprint 13b includes a verification step that the deployed site is correctly indexable before announcing.)

- [ ] **Step 8.6: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean. The HTML emitted under `out/de/index.html` should contain:
- `<title>Manuel Heller — Craft Portfolio</title>` (and translated equivalents per locale)
- `<link rel="canonical" href="https://manuelheller.dev/de/" />`
- `<link rel="alternate" hreflang="de" href="https://manuelheller.dev/de/" />` (× 5 — de/en/fr/it/x-default)
- `<meta property="og:title">`, `<meta property="og:image">`, `<meta name="twitter:card">`
- `<meta name="robots" content="index, follow">`

```bash
grep -E '(canonical|hreflang|og:title|twitter:card|robots)' out/de/index.html | head -10
```

Expected: at least one match per pattern.

- [ ] **Step 8.7: Commit**

```bash
git add src/lib/seo/metadata.ts src/app/[locale]/layout.tsx src/app/layout.tsx messages/
git commit -m "feat(seo): per-locale generateMetadata with hreflang alternates + canonical URLs"
```

---

### Task 9: OG image + Twitter image

**Files:**
- Create: `src/app/[locale]/opengraph-image.tsx`
- Create: `src/app/[locale]/twitter-image.tsx`

- [ ] **Step 9.1: Write opengraph-image.tsx**

```tsx
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

// Dynamic OG image — 1200×630 paper-bg with the brand ink-splat
// upper-left and the localised title + tagline right-aligned.
// Generated at request-time by Next.js metadata API; consumed by
// social-share previews (Discord, Slack, Twitter, LinkedIn).

export const alt = "Manuel Heller — Craft Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta" });

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#F0E8D7",
          padding: 80,
          fontFamily: "serif",
          color: "#0A0608",
        }}
      >
        {/* Brand mark — left column */}
        <div style={{ width: 320, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <svg viewBox="0 0 64 64" width="280" height="280" xmlns="http://www.w3.org/2000/svg">
            <g style={{ mixBlendMode: "multiply" }}>
              <ellipse cx="22" cy="22" rx="20" ry="18" fill="#FF6BA0" opacity="0.85" transform="rotate(-12 22 22)" />
              <ellipse cx="42" cy="22" rx="18" ry="20" fill="#FFC474" opacity="0.85" transform="rotate(8 42 22)" />
              <ellipse cx="22" cy="42" rx="19" ry="18" fill="#7CE8C4" opacity="0.85" transform="rotate(15 22 42)" />
              <ellipse cx="42" cy="42" rx="20" ry="19" fill="#B89AFF" opacity="0.85" transform="rotate(-8 42 42)" />
            </g>
            <text x="32" y="43" fontFamily="serif" fontStyle="italic" fontSize="36" textAnchor="middle" fill="#0A0608">
              MH
            </text>
          </svg>
        </div>

        {/* Title + tagline — right column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 40 }}>
          <div style={{ fontSize: 72, fontStyle: "italic", lineHeight: 1, marginBottom: 24 }}>
            {t("title")}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.3, opacity: 0.7 }}>
            {t("description")}
          </div>
        </div>

        {/* Footer URL strip */}
        <div style={{
          position: "absolute",
          bottom: 40,
          left: 80,
          fontSize: 22,
          fontFamily: "monospace",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          opacity: 0.55,
        }}>
          manuelheller.dev
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 9.2: Write twitter-image.tsx**

Same as opengraph-image.tsx but with `size = { width: 1200, height: 600 }`. Twitter card aspect is slightly squarer than OG. Save as `src/app/[locale]/twitter-image.tsx` with the only diff being:

```tsx
export const size = { width: 1200, height: 600 };
```

(And updating the outer div height from 630 to 600. All other content stays.)

- [ ] **Step 9.3: Verify**

Run: `pnpm build`

```bash
ls out/de/opengraph-image.png out/de/twitter-image.png
```

Expected: both PNGs exist and are ~50-150KB each.

Open `out/de/opengraph-image.png` in an image viewer. Should show:
- Paper-coloured background
- Riso ink-splat + MH on the left, sized large
- Italic-serif "Manuel Heller — Craft Portfolio" on the right
- "manuelheller.dev" mono caption bottom-left

- [ ] **Step 9.4: Commit**

```bash
git add src/app/[locale]/opengraph-image.tsx src/app/[locale]/twitter-image.tsx
git commit -m "feat(seo): dynamic OG + Twitter card images per locale"
```

---

### Task 10: JSON-LD structured data

**Files:**
- Create: `src/lib/seo/jsonLd.ts`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 10.1: Write src/lib/seo/jsonLd.ts**

```ts
import { SITE } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

/**
 * JSON-LD structured data — Person + WebSite schema. Embedded as a
 * single <script type="application/ld+json"> tag in the locale layout.
 *
 * Person → search engines surface Manuel as the named author of the
 * site; populates the right-side knowledge panel for personal-name
 * searches.
 *
 * WebSite → declares the site's identity, sets up sitelinks search
 * box (if/when site-internal search exists), and provides locale
 * alternates as `inLanguage`.
 */
export function buildJsonLd(locale: Locale, description: string) {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.author.name,
    url: SITE.url,
    image: `${SITE.url}/icon-512.png`,
    jobTitle: "Full-Stack Developer",
    worksFor: {
      "@type": "Organization",
      name: "zvoove Switzerland AG",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Basel",
      addressRegion: "BS",
      addressCountry: "CH",
    },
    email: `mailto:${SITE.author.email}`,
    sameAs: [
      SITE.author.socials.github,
      SITE.author.socials.linkedin,
      SITE.author.socials.photos,
      SITE.author.socials.instagram,
    ],
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description,
    inLanguage: locale,
    author: {
      "@type": "Person",
      name: SITE.author.name,
      url: SITE.url,
    },
    publisher: {
      "@type": "Person",
      name: SITE.author.name,
    },
  };

  return [person, webSite];
}
```

- [ ] **Step 10.2: Inject JSON-LD in [locale]/layout.tsx**

Inside `LocaleLayout`'s rendered JSX, place the JSON-LD as the first child of `<body>`:

```tsx
import { buildJsonLd } from "@/lib/seo/jsonLd";
// ... existing imports ...

// Inside LocaleLayout, after `setRequestLocale(locale)`:
const tMeta = await getTranslations({ locale, namespace: "meta" });
const jsonLd = buildJsonLd(locale as Locale, tMeta("description"));

// Inside the <body> JSX, BEFORE NextIntlClientProvider:
<script
  type="application/ld+json"
  // biome-ignore lint/security/noDangerouslySetInnerHtml: ld+json must be raw, not text
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
```

(JSON.stringify is safe here because the input is built from `SITE` constants and one translated string — no user input in the LD payload.)

- [ ] **Step 10.3: Verify**

Run: `pnpm build`

```bash
grep -A 1 'application/ld+json' out/de/index.html | head -4
```

Expected: a `<script type="application/ld+json">` tag containing serialised `[Person, WebSite]` array. Validate by pasting the JSON into [Google Rich Results Test](https://search.google.com/test/rich-results) — should find 2 detected items, no errors.

- [ ] **Step 10.4: Commit**

```bash
git add src/lib/seo/jsonLd.ts src/app/[locale]/layout.tsx
git commit -m "feat(seo): JSON-LD Person + WebSite schema per locale"
```

---

### Task 11: Mobile hamburger menu

**Files:**
- Create: `src/components/ui/NavMobileMenu.tsx`
- Modify: `src/components/ui/Nav.tsx`

- [ ] **Step 11.1: Write NavMobileMenu.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Mobile hamburger menu — only mounts the dropdown subtree on mobile
 * viewports (<md). Animated slide-down via CSS transform/opacity, no
 * GSAP required for a simple one-shot reveal.
 *
 * Uses `<details>` semantics for native keyboard a11y (space/enter to
 * toggle, esc to close) and progressive enhancement — the menu still
 * works with JS disabled.
 */

type NavItem = { href: string; key: string };

export function NavMobileMenu({ items }: { items: readonly NavItem[] }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  // Close on viewport-resize past md breakpoint (avoids stuck-open on
  // device rotate from portrait → landscape).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close menu on anchor-click so the user lands on the section without
  // the dropdown obscuring it.
  const onItemClick = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? t("nav.mobileMenu.close") : t("nav.mobileMenu.open")}
        aria-expanded={open}
        aria-controls="mobile-nav-list"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 text-ink"
      >
        <span
          className={`h-0.5 w-5 bg-ink transition-transform duration-200 ${
            open ? "translate-y-2 rotate-45" : ""
          }`}
        />
        <span
          className={`h-0.5 w-5 bg-ink transition-opacity duration-200 ${
            open ? "opacity-0" : ""
          }`}
        />
        <span
          className={`h-0.5 w-5 bg-ink transition-transform duration-200 ${
            open ? "-translate-y-2 -rotate-45" : ""
          }`}
        />
      </button>

      {open ? (
        <ul
          id="mobile-nav-list"
          className="absolute top-full right-0 left-0 flex flex-col gap-3 border-paper-line border-b bg-paper px-6 py-6 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={onItemClick}
                className="block py-2 text-ink type-label transition-colors hover:text-ink-soft"
              >
                {t(`nav.items.${item.key}`)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 11.2: Add Mobile-Menu i18n keys**

In `messages/de.json`, locate `nav` and add:

```json
"mobileMenu": {
  "open": "Menü öffnen",
  "close": "Menü schliessen"
}
```

`messages/en.json`:
```json
"mobileMenu": {
  "open": "Open menu",
  "close": "Close menu"
}
```

`messages/fr.json`:
```json
"mobileMenu": {
  "open": "Ouvrir le menu",
  "close": "Fermer le menu"
}
```

`messages/it.json`:
```json
"mobileMenu": {
  "open": "Apri menu",
  "close": "Chiudi menu"
}
```

- [ ] **Step 11.3: Wire NavMobileMenu into Nav.tsx**

Replace the placeholder comment from Task 1.7 with:

```tsx
<NavMobileMenu items={NAV_ITEMS_MOBILE} />
```

Add the import:
```tsx
import { NavMobileMenu } from "@/components/ui/NavMobileMenu";
```

The nav layout now flows: brand-link (left) → desktop ul (`hidden md:flex`) + locale-switcher (always) + NavMobileMenu (`md:hidden`).

- [ ] **Step 11.4: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`. Clean.

Run: `pnpm dev`. Resize browser to <768px. Confirm:
- Hamburger button replaces the desktop nav links
- Click toggles the dropdown with animated bars (top + bottom rotate to X, middle fades)
- Items render: About, Skills, Work, Case Study, Photography, Playground, Contact
- Click an item closes the menu + scrolls to section
- Keyboard: Tab focuses hamburger, Enter/Space toggles, Tab through items, Enter activates, Esc closes (via `<details>` semantics if used; with current `useState` based version, Esc handler can be added if missing — verify)

- [ ] **Step 11.5: Commit**

```bash
git add src/components/ui/NavMobileMenu.tsx src/components/ui/Nav.tsx messages/
git commit -m "feat(nav): mobile hamburger menu with all sections (Skills + Photography + CaseStudy)"
```

---

### Task 12: aria-current on active section + IO observer

**Files:**
- Modify: `src/components/ui/Nav.tsx`

- [ ] **Step 12.1: Add scroll-spy effect**

In `Nav.tsx`, add a `useEffect` that watches all section anchors and sets `aria-current` on the matching nav item:

```tsx
"use client";

import { useEffect, useState } from "react";
// ... existing imports ...

const SECTION_IDS = ["about", "skills", "work", "case-study", "photography", "playground", "contact"];

export function Nav() {
  const t = useTranslations();
  const currentLocale = useLocale();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const targets = SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Track which sections are currently intersecting; pick the
        // topmost one (smallest top in viewport) as the "active" one.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ... existing return JSX, modify the nav item map:
}
```

Update the desktop nav-item rendering to set `aria-current`:

```tsx
{NAV_ITEMS_DESKTOP.map((item) => {
  const sectionId = item.href.replace("#", "");
  const isActive = activeSection === sectionId;
  return (
    <li key={item.href}>
      <a
        href={item.href}
        aria-current={isActive ? "true" : undefined}
        className={`type-label transition-colors ${
          isActive ? "text-ink" : "text-ink-soft hover:text-ink"
        }`}
      >
        {t(`nav.items.${item.key}`)}
      </a>
    </li>
  );
})}
```

(Default style swap: when active, full ink; when inactive, ink-soft. This subtly indicates the user's place on the page.)

- [ ] **Step 12.2: Verify**

Run: `pnpm dev`. Scroll through the page slowly. Confirm:
- As each section scrolls into the central viewport band, the matching nav item visually shifts (text-soft → text-ink)
- `aria-current="true"` is on exactly one nav item at a time (verify in DevTools)
- Test on mobile menu too — `NavMobileMenu` should also reflect activeSection

If the mobile menu doesn't reflect activeSection: pass `activeSection` as prop to `NavMobileMenu` and apply the same conditional class. Update Task 11 component to accept this prop.

- [ ] **Step 12.3: Commit**

```bash
git add src/components/ui/Nav.tsx src/components/ui/NavMobileMenu.tsx
git commit -m "feat(nav): aria-current + visual active state via IO scroll-spy"
```

---

### Task 13: View Transitions API for locale-switch

**Files:**
- Create: `src/components/motion/useViewTransition.ts`
- Modify: `src/components/ui/Nav.tsx`

- [ ] **Step 13.1: Write the hook**

```tsx
"use client";

import { useCallback } from "react";

/**
 * View Transitions API hook — wraps a navigation callback in
 * `document.startViewTransition()` if supported. Falls back to
 * synchronous navigation in browsers without support (Safari < 18,
 * Firefox without flag). Cross-document navigation in the App Router
 * uses the v5+ cross-document mode where supported.
 *
 * Used for locale-switching: gives a smooth crossfade between
 * de → en → fr → it instead of a hard cut.
 */
export function useViewTransition() {
  return useCallback((callback: () => void) => {
    // biome-ignore lint/suspicious/noExplicitAny: View Transitions API is partially typed in DOM lib
    const startViewTransition = (document as any).startViewTransition?.bind(document);
    if (typeof startViewTransition === "function") {
      startViewTransition(callback);
    } else {
      callback();
    }
  }, []);
}
```

- [ ] **Step 13.2: Wrap locale-switch in Nav.tsx**

Replace the locale-link `<Link href={pathname} locale={locale} ...>` with a click handler that uses the hook:

```tsx
import { useRouter } from "@/i18n/navigation";
import { useViewTransition } from "@/components/motion/useViewTransition";
// ... inside the component:
const router = useRouter();
const startTransition = useViewTransition();

// Replace the existing <Link href={pathname} locale={locale} ...> with:
<button
  type="button"
  onClick={() => startTransition(() => router.replace(pathname, { locale }))}
  hrefLang={locale}
  aria-current={isActive ? "true" : undefined}
  aria-label={label}
  className={`type-label no-underline transition-colors ${
    isActive ? "text-ink" : "text-ink-muted hover:text-ink-soft"
  }`}
>
  {locale.toUpperCase()}
</button>
```

(Switched to `<button>` because we need an event handler; `hrefLang` is technically a Link attribute but is still semantically valid on buttons + invisible to AT.)

- [ ] **Step 13.3: Add view-transition CSS**

In `src/app/globals.css`, append at the end:

```css
/* View Transitions API: crossfade between locales. Browsers without
   support fall back to no animation (synchronous swap). */
@layer base {
  @media (prefers-reduced-motion: no-preference) {
    ::view-transition-old(root) {
      animation: 200ms ease-out both fade-out;
    }
    ::view-transition-new(root) {
      animation: 200ms ease-in both fade-in;
    }
    @keyframes fade-out {
      to { opacity: 0; }
    }
    @keyframes fade-in {
      from { opacity: 0; }
    }
  }
}
```

- [ ] **Step 13.4: Verify**

Run: `pnpm dev`. In Chrome (which has View Transitions support), click DE → EN → FR → IT in the locale switcher. Confirm a smooth 200ms crossfade between the page renders.

In Firefox or older Safari, the switch should be instant (no animation, no crash).

- [ ] **Step 13.5: Commit**

```bash
git add src/components/motion/useViewTransition.ts src/components/ui/Nav.tsx src/app/globals.css
git commit -m "feat(nav): View Transitions API crossfade on locale-switch"
```

---

### Task 14: Custom 404 visual polish

**Files:**
- Modify: `src/app/not-found.tsx`

- [ ] **Step 14.1: Read current state**

Read `src/app/not-found.tsx` to understand the current layout. The Phase 11 deviation says it owns its own `<html>` shell with `<html lang="de">` hardcoded for Nginx-served any-URL fallback. Don't change the SSR shape — just enhance the visual.

- [ ] **Step 14.2: Add an ink-bloom visual**

Replace the existing 404 markup with a richer composition:

```tsx
"use client";

import "./globals.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function NotFound() {
  const inkRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const ink = inkRef.current;
    if (!ink) return;
    const tl = gsap.timeline();
    tl.from(ink.children, {
      scale: 0,
      opacity: 0,
      transformOrigin: "center",
      duration: 1.2,
      ease: "elastic.out(1, 0.5)",
      stagger: 0.08,
    });
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <html lang="de">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-paper text-ink" suppressHydrationWarning>
        <main className="container-page flex max-w-xl flex-col items-center gap-10 py-20 text-center">
          {/* Ink bloom — 4 spot-colour blobs animating in */}
          <svg viewBox="0 0 200 200" width="220" height="220" aria-hidden="true">
            <g ref={inkRef} style={{ mixBlendMode: "multiply" }}>
              <ellipse cx="80" cy="80" rx="70" ry="60" fill="#FF6BA0" opacity="0.7" />
              <ellipse cx="120" cy="80" rx="60" ry="70" fill="#FFC474" opacity="0.7" />
              <ellipse cx="80" cy="120" rx="65" ry="60" fill="#7CE8C4" opacity="0.7" />
              <ellipse cx="120" cy="120" rx="70" ry="65" fill="#B89AFF" opacity="0.7" />
            </g>
            <text
              x="100"
              y="116"
              fontFamily="serif"
              fontStyle="italic"
              fontSize="56"
              fontWeight="400"
              textAnchor="middle"
              fill="#0A0608"
            >
              404
            </text>
          </svg>

          <div className="space-y-4">
            <h1 className="font-display italic text-ink text-[clamp(2rem,5vw,3.5rem)] leading-tight">
              Diese Seite ist im Scrollen verloren gegangen.
            </h1>
            <p className="text-ink-soft text-lg">
              Vielleicht ein Tippfehler? Vielleicht eine Seite, die nie da war? In jedem Fall — kein Drama. Zurück zum Anfang:
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 font-mono text-xs uppercase tracking-[0.18em]">
            <Link href="/de/" className="border-2 border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors">
              Deutsch
            </Link>
            <Link href="/en/" className="border-2 border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors">
              English
            </Link>
            <Link href="/fr/" className="border-2 border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors">
              Français
            </Link>
            <Link href="/it/" className="border-2 border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors">
              Italiano
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
```

(`prefers-reduced-motion` users: the GSAP `from` will simply set the final state instantly when paired with reduced-motion CSS overrides. If the existing `useReducedMotion` hook should gate the timeline, follow the project's convention — re-use it.)

- [ ] **Step 14.3: Verify**

Run: `pnpm dev`. Navigate to `/some-non-existent-route`. Confirm:
- Page renders 404 with animated ink-bloom + "404" centred
- Four locale-link buttons visible, each hover-fills with ink
- Reduced-motion: ink-bloom appears statically (no entry animation)

- [ ] **Step 14.4: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat(404): branded ink-bloom visual + locale-jump links"
```

---

### Task 15: README.md Awwwards-grade rewrite

**Files:**
- Modify: `README.md`

- [ ] **Step 15.1: Read existing README**

Run: `cat README.md` — note its current shape, scripts, badge URLs (if any).

- [ ] **Step 15.2: Rewrite to launch-ready form**

Replace `README.md` with:

```markdown
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
  over ~12 phases of iterative implementation.

## License

MIT for the code; all photography © Manuel Heller, all rights reserved.
```

- [ ] **Step 15.3: Verify**

Run: `cat README.md` — confirm the rewrite landed. Open in a Markdown previewer; check links resolve.

- [ ] **Step 15.4: Commit**

```bash
git add README.md
git commit -m "docs(readme): launch-ready rewrite with stack + notable-bits highlights"
```

---

### Task 16: Final ci:local + a11y verification (no commit)

**Files:** none (verification only)

- [ ] **Step 16.1: Run pnpm ci:local**

Run: `pnpm ci:local`
Expected: lint clean, typecheck clean, build clean, Playwright 51/51 passing.

If any new failures appear (e.g., the new metadata changed page-title strings that the Playwright smoke asserts on): investigate per failure, fix, re-run.

- [ ] **Step 16.2: Run pnpm test:a11y**

Run: `pnpm build && E2E_TARGET=prod pnpm test:a11y`
Expected: 16/16 passing across DE/EN/FR/IT × default + reducedMotion.

- [ ] **Step 16.3: Manual visual verification**

Run: `pnpm dev`. Click through:
- All 4 locales — title bar, OG image, hreflang alternates inspect cleanly via DevTools
- Mobile (DevTools 375×800) — hamburger menu opens, shows 7 sections, items work
- Tab through nav — focus rings visible on all interactive elements (buttons, links)
- Reduced-motion toggle — animations disabled, content fully readable
- 404 page — `/foobar` → branded 404 visual + 4 locale-jump buttons

- [ ] **Step 16.4: Inspect SEO output**

```bash
curl -s http://localhost:3000/de/ | grep -E '(canonical|hreflang|og:|twitter:|json-ld)'
```

Expected: at least 12 lines of metadata + script tags (canonical, 5× hreflang, 6× og, 4× twitter, 1× ld+json).

- [ ] **Step 16.5: Run Lighthouse locally if practical**

Run: `pnpm lighthouse` (skip if running on Windows — broken locally per CLAUDE.md, run in CI instead).
Expected: all assertions pass per relaxed thresholds (perf ≥0.55 warn, a11y ≥0.95 error, CLS ≤0.1).

- [ ] **Step 16.6: No commit (verification only)**

---

### Task 17: Server handoff prompt — markdown file in repo

**Files:**
- Create: `docs/superpowers/server-handoff/2026-05-06-deploy-manusportfolio.md`

- [ ] **Step 17.1: Create the handoff folder**

```bash
mkdir -p docs/superpowers/server-handoff
```

- [ ] **Step 17.2: Write the handoff prompt**

Create `docs/superpowers/server-handoff/2026-05-06-deploy-manusportfolio.md`:

```markdown
# Server-side handoff: manuelheller.dev deployment

**Audience:** Claude Code instance running on Manuel's mc-host24.de root server.
**Working directory expected on server:** `/var/www/manusportfolio` (clone target).
**Companion live site:** `joggediballa.ch` already runs on this server (different vhost, MariaDB-backed).

## Context Manuel has provided

[Manuel's verbatim setup brief here, copied + integrated:]

> Aktuell habe ich eine laufende website (joggediballa.ch) im verzeichnis
> /var/www/joggediballa welche auf diesem root server läuft (zu dieser
> website gehört die datenbank joggediballa welche auf mariadb läuft).
> Der server selbst ist von mc-host24.de und von mir mit hilfe von gemini
> eingerichtet worden. Ich habe den server gerade von 4gb auf 6gb upgraded.
>
> Erste Aufgabe: durchsuche alles was es auf dem server geben könnte
> bezüglich dem thema schutzmechanismen, hinterfrage ob das so sinn macht
> wie es implementiert ist, passe wenn sinnvoll auf 6gb an. Analysiere
> alle tools, features, configs. Geh das gesamte server-setup durch
> (nginx conf etc.), review sauber, hinterfrage, bring verbesserungen
> an wenn klar besser. Joggediballa-Setup-Verbesserungen sind erlaubt.
> Setup zwischen joggediballa und manusportfolio sollte konsistent sein
> ausser ein Unterschied bringt klaren Vorteil.
>
> Zweite Aufgabe: portfolio website einrichten auf /var/www/manusportfolio.
> Domain manuelheller.dev (Ionos). Bei Fragen zuerst fragen. Wenn etwas
> manuell ausserhalb des Servers zu erledigen ist (DNS, etc.), Manuel
> Bescheid geben.
>
> Am Ende: ein markdown file mit dem gesamten Server-Aufbau (vorallem
> für zukünftige KI-Sessions damit diese sich direkt zurechtfinden).

## Specs already decided

- **Domain:** manuelheller.dev (primary). manuelheller.ch redirects 301 → manuelheller.dev. Both bought at Ionos.
- **DNS:** Cloudflare in front of Ionos (Manuel will switch the Ionos nameservers to Cloudflare's). Recommendation: do the same for joggediballa.ch — same server, same Ionos slow-DNS issue. Cloudflare is free; gives DDoS protection + CDN + faster propagation.
- **TLS:** Let's Encrypt via certbot (already installed on this server for joggediballa.ch). Cert for both `manuelheller.dev` and `manuelheller.ch` (for the redirect host).
- **Server-IP:** one IP suffices. nginx uses `server_name` directives to multiplex multiple vhosts.
- **Build pipeline:** static export. Repo is Next.js 16 with `output: "export"`. The build target is `./out/` (a folder of pre-rendered static HTML/CSS/JS/assets — no Node.js runtime needed on the server).
- **Analytics:** Plausible self-hosted (DSG/DSGVO compliant, no cookie banner needed). Install in a separate vhost like `analytics.manuelheller.dev` or `plausible.manuelheller.dev`. Daten bleiben auf dem Server. ~1KB async JS injected per page (will be wired in a follow-up after the deployment lands; not part of this handoff).
- **robots.txt indexing:** the production site at `manuelheller.dev` is initially configured to allow indexing (`index: true` in metadata). After first successful deploy + smoke test, verify externally that `manuelheller.dev/robots.txt` shows the expected content + that `manuelheller.dev/sitemap.xml` is fetchable. Only then announce launch.

## What to do, step by step

1. **Server-side audit (joggediballa setup review)**
   - Walk the entire `/var/www/joggediballa/` setup, the active nginx vhost configs (`/etc/nginx/sites-{available,enabled}/`), systemd services, fail2ban / ufw / iptables rules, MariaDB config, certbot setup, log rotation policies.
   - List protective mechanisms. Cross-check whether 4GB-tuned values (worker counts, ulimits, MariaDB buffer pools) need to be relaxed or expanded for 6GB.
   - Document findings in a temporary `/root/server-audit.md` or similar before changing anything.

2. **Deployment-pattern decision**
   - Will `manusportfolio` be deployed via `git pull` + `pnpm build` directly on the server, or via CI artifact upload? Pick whichever pattern joggediballa already uses; consistency wins. If joggediballa has no pattern, recommend git pull + build on server (simplest for a static export).
   - Set up a deploy user (non-root) for `/var/www/manusportfolio`.

3. **Repo clone + first build**
   - Clone `git@github.com:manu-brighter/manus-portfolio.git` to `/var/www/manusportfolio`.
   - Install Node.js 20+ (or whichever LTS the server already has for joggediballa) and pnpm.
   - Run `pnpm install --frozen-lockfile && pnpm build`. Output lands in `/var/www/manusportfolio/out/`.
   - Verify the `out/` folder structure and that `out/index.html` exists (root redirect to default locale).

4. **nginx vhost**
   - Create `/etc/nginx/sites-available/manuelheller.dev` with:
     - `listen 443 ssl http2;`
     - `server_name manuelheller.dev;`
     - `root /var/www/manusportfolio/out;`
     - `index index.html;`
     - **Trailing-slash handling:** The static export emits paths like `/de/index.html` and `/de/playground/ink-drop-studio/index.html`. nginx's `try_files $uri $uri/ $uri.html =404;` handles all three forms (exact, dir-style with trailing slash, and `.html`-extension fallback).
     - **Cache headers:** `/_next/static/*` → `Cache-Control: public, max-age=31536000, immutable`. HTML files → `Cache-Control: public, max-age=300, must-revalidate`. Other assets (images, fonts) → `Cache-Control: public, max-age=86400`.
     - **Brotli compression:** install `nginx-brotli` module if not present. Enable for text/* + js + css. Falls back to gzip if Brotli unavailable.
     - **Security headers:** Strict-Transport-Security with preload + includeSubDomains, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy `camera=(), microphone=(), geolocation=()`. CSP is tricky for a Next.js static export — start with `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' plausible.* manuelheller.dev` and tighten if there are violations.
   - Create `/etc/nginx/sites-available/manuelheller.ch` as a 301-redirect-only host:
     - `server_name manuelheller.ch www.manuelheller.ch;`
     - `return 301 https://manuelheller.dev$request_uri;`
   - Symlink both into `sites-enabled/`. Test with `nginx -t`. Reload.

5. **TLS certificates**
   - `certbot --nginx -d manuelheller.dev -d www.manuelheller.dev` (separate cert for the dev domain).
   - `certbot --nginx -d manuelheller.ch -d www.manuelheller.ch` (separate cert for the redirect host — needed because the redirect happens at HTTPS-level after TLS termination).
   - Verify auto-renewal cron is active.

6. **DNS hand-off back to Manuel (manual step)**
   - Output the server's IPv4 (and IPv6 if available).
   - Output the Cloudflare-side records that need to exist:
     - `manuelheller.dev` A → server IP, proxied
     - `www.manuelheller.dev` CNAME → manuelheller.dev, proxied
     - `manuelheller.ch` A → server IP, proxied (redirect-only host)
     - `www.manuelheller.ch` CNAME → manuelheller.ch, proxied
   - Manuel will switch the Ionos nameservers to Cloudflare's.

7. **Smoke test**
   - `curl -I https://manuelheller.dev/` — expect 200 + correct Cache-Control + security headers.
   - `curl -I https://manuelheller.dev/de/` — expect 200.
   - `curl -I https://manuelheller.ch/` — expect 301 → manuelheller.dev.
   - `curl -s https://manuelheller.dev/sitemap.xml | head -20` — expect XML with 20 url entries.
   - `curl -s https://manuelheller.dev/robots.txt` — expect the env-aware allow shape.
   - Open `https://manuelheller.dev/` in a browser — verify Cloudflare proxy active (check Server header), favicon visible in tab, OG image preview when shared (test via Discord paste or `https://www.opengraph.xyz/url/<encoded-url>`).

8. **Document the final setup**
   - Append findings to `/root/server-setup.md` (or whatever Manuel's existing server-doc file is). Include:
     - Site list (joggediballa, manusportfolio, plausible if installed)
     - Per-site: vhost path, doc-root, deployment trigger, last-deploy date
     - DNS provider per domain
     - TLS cert paths + renewal status
     - Backup policy
     - 6GB-RAM tuning changes from the audit step
     - Open-tickets / known-issues
   - The doc should be self-contained enough that a future Claude session can be dropped onto the server with zero context and orient itself in <5 minutes.

## Open questions for Manuel before starting

1. **Server access**: confirm SSH key + user have permission to write `/var/www/manusportfolio` and reload nginx. Sudo password handy?
2. **CI/CD preference**: deploy via git-pull-on-server + manual `pnpm build`, or set up a webhook + auto-deploy on `main` push? (Recommended: git-pull manual for now; auto-deploy can land later.)
3. **Plausible analytics**: install in this same handoff, or split into a follow-up session? (Recommended: split — get the portfolio live first, observe stability for a day, then add analytics.)
4. **Existing joggediballa-setup quirks**: anything Manuel already knows is suboptimal that you'd like Claude-on-server to address? (e.g., known too-tight worker_processes, DB query that hangs, etc.)

## Final reminder

- The portfolio is a **static export**. No Node.js runtime on the server. No PM2, no systemd unit for the app. Just nginx serving files.
- Lighthouse perf score is intentionally relaxed to ~0.55 in `.lighthouserc.json` because the hero FluidSim runs continuously. This is a **post-launch optimisation backlog item** — do not block launch on it.
- The `next-env.d.ts` is gitignored. After `pnpm install`, the file may regenerate during `pnpm build` — that's expected; never commit it.
```

- [ ] **Step 17.3: Verify**

```bash
ls docs/superpowers/server-handoff/
```

Expected: the .md file exists.

Open it in a markdown previewer or just `cat` it; verify all sections render and Manuel's verbatim brief is included unaltered.

- [ ] **Step 17.4: Commit**

```bash
git add docs/superpowers/server-handoff/2026-05-06-deploy-manusportfolio.md
git commit -m "docs: server-handoff prompt for manusportfolio deployment"
```

---

### Task 18: CLAUDE.md Phase 13 deviations

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 18.1: Append Phase-13 launch-pass deviation section**

In `.claude/CLAUDE.md`, append at the end (after the Phase 12 section):

```markdown
## Phase 13 deviations

### Phase 13 — Launch Pass (SEO + Meta + Favicon + Pre-Deployment)

Brought the site to launch-ready state with full SEO/meta layer,
branded favicon pipeline, mobile nav, View Transitions on locale-
switch, custom 404 visual, and a server-side handoff prompt
checked in for the deploy step. Plan at
`docs/superpowers/plans/2026-05-06-launch-pass.md`. Server handoff
at `docs/superpowers/server-handoff/2026-05-06-deploy-manusportfolio.md`.

- **Favicon source is one SVG, multiple variants per use case.**
  `public/brand/icon-source.svg` is the master. Browser-tab favicon
  (`src/app/icon.tsx`) ships with TRANSPARENT bg because tab chrome
  has its own theme-aware bg; iOS home-screen icon
  (`src/app/apple-icon.tsx`) ships with `--color-paper` bg because
  iOS clips icons to a rounded-rect with no transparency support.
  Android variants (`public/icon-{192,512}.png`) and maskable
  variants (`public/icon-maskable-{192,512}.png`) are pre-rendered
  PNG via `scripts/generate-favicons.mjs` (sharp pipeline). Maskable
  variants use 80% safe-area padding so Android adaptive icon
  shapes (circle/squircle/etc) don't clip the artwork.
- **OG/Twitter images live under `[locale]`, not at the root.**
  `src/app/[locale]/opengraph-image.tsx` + `twitter-image.tsx`
  generate per-locale 1200×630/1200×600 PNGs at request-time via
  `next/og`. The metadata in `src/lib/seo/metadata.ts` references
  them by absolute URL (`${SITE.url}/${locale}/opengraph-image`)
  so social-share previews respect the active locale.
- **`metadataBase` set in both root layout and per-locale.** Required
  by `next/og` for relative URL resolution; without it the build
  warns and OG images don't get absolute URLs in social previews.
- **JSON-LD inlined in body, not head.** Strictly the LD-JSON spec
  prefers `<head>`, but Next 16 App Router doesn't expose a clean
  way to inject custom `<script>` tags into `<head>` from a layout
  without using the `metadata` API (which doesn't support arbitrary
  scripts). Putting LD-JSON as the first child of `<body>` is the
  documented Next.js workaround and works for all known crawlers.
- **`next-env.d.ts` now gitignored.** Was previously tracked but
  auto-unstaged by a pre-commit hook because content varies between
  `next dev` and `next build`. Properly ignored now; the hook
  remains as belt-and-suspenders for any contributor whose Git
  client honours `.gitignore` differently.
- **Mobile hamburger menu uses `useState` + custom toggle, not
  `<details>`.** Initial sketch used `<details>`/`<summary>` for
  free keyboard-a11y; replaced with managed state for two reasons:
  (a) mq-resize-close behaviour requires JS anyway, and (b) the
  animation needs the open state to drive className transitions.
  Esc-to-close is added explicitly via keyboard event.
- **View Transitions API is used directly via `document.startView
  Transition()`, not via Next.js's experimental `unstable_view
  Transition`.** The Next.js wrapper is opinionated (App Router
  only, certain transition types) and the API is mature enough
  in Chromium to call directly. Falls back gracefully when the
  API isn't available.
- **`next/og` does not support `@fontsource/instrument-serif`
  imports.** Tried, font loads at runtime fail (the font files
  are bundle-imports, not URL-fetchable). The OG/Twitter images
  fall back to the OS default serif (`fontFamily="serif"`) which
  is close enough to Instrument Serif at preview-image scales —
  not pixel-perfect but readable. If pixel-perfect matters, host
  the .woff2 at `/fonts/instrument-serif.woff2` and reference it
  via the `fonts` field in `ImageResponse`.
- **`robots: { index: true }` shipped from sprint-13a.** The
  per-locale metadata builder hard-sets `index: true, follow: true`.
  Pre-deploy verification step in the handoff prompt is to confirm
  the deployed `/robots.txt` and the rendered `<meta name="robots">`
  match expectations before announcing the site publicly.
- **Lighthouse assertions stayed at sprint-12 relaxed levels.** Did
  not retighten — the hero FluidSim still caps perf around 0.6 in
  Lighthouse's measurement window. Tightening is a follow-up after
  the perf-optimisation sprint (memory: `project_open_todos.md`).
```

- [ ] **Step 18.2: Verify lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 18.3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: CLAUDE.md — Phase 13 launch-pass deviations"
```

---

## Self-review checklist

Run through this before declaring the plan complete.

**1. Spec coverage:**
- [ ] Pre-deployment fixes (Skills, Work, Nav) — Task 1 ✓
- [ ] next-env.d.ts cleanup — Task 2 ✓
- [ ] Favicon source SVG with Riso ink-splat + MH — Task 3 ✓
- [ ] Multiple favicon variants for different use cases — Task 4 ✓
- [ ] Web app manifest — Task 5 ✓
- [ ] Sitemap with hreflang alternates — Task 6 ✓
- [ ] Robots — Task 7 ✓
- [ ] Per-locale generateMetadata + canonical + hreflang — Task 8 ✓
- [ ] OG + Twitter images — Task 9 ✓
- [ ] JSON-LD Person + WebSite — Task 10 ✓
- [ ] Mobile hamburger with all sections — Task 11 ✓
- [ ] aria-current scroll-spy — Task 12 ✓
- [ ] View Transitions on locale-switch — Task 13 ✓
- [ ] Custom 404 visual — Task 14 ✓
- [ ] README.md launch-ready — Task 15 ✓
- [ ] Verification gate — Task 16 ✓
- [ ] Server handoff prompt — Task 17 ✓
- [ ] CLAUDE.md Phase 13 deviations — Task 18 ✓

**2. Placeholder scan:** No "TBD", "TODO", "implement later" in steps. Each step has either commands, code, or concrete instructions.

**3. Type consistency:**
- `buildLocaleMetadata` (Task 8) returns `Promise<Metadata>` — used by `generateMetadata` in [locale]/layout.tsx ✓
- `buildJsonLd(locale, description)` (Task 10) — both args provided in caller ✓
- `NavMobileMenu` accepts `items` prop (Task 11) — `NAV_ITEMS_MOBILE` const passed in Nav.tsx (Task 11.3) ✓
- `useViewTransition()` returns `(callback: () => void) => void` (Task 13) — usage in Nav.tsx matches ✓
- `SECTION_IDS` (Task 12) — values match section anchor ids in `[locale]/page.tsx` (`about`, `skills`, `work`, `case-study`, `photography`, `playground`, `contact`) ✓
- `SITE` import (multiple tasks) — defined in `src/lib/site.ts`, fields used: `url`, `name`, `shortName`, `description`, `author.{name,email,socials}` ✓

---

## Estimated time

- Tasks 1–2 (content + cleanup): 30 min
- Tasks 3–5 (favicon pipeline): 60 min
- Tasks 6–10 (SEO core): 90 min
- Tasks 11–13 (nav + transitions): 60 min
- Task 14 (404 polish): 30 min
- Task 15 (README): 15 min
- Task 16 (verify): 30 min
- Task 17 (handoff prompt): 30 min — already drafted in this plan, mostly copy
- Task 18 (CLAUDE.md): 15 min

Total: ~6h focused work. Doable in one solid session or split across two days.
