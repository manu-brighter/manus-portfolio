// Generalised asset pipeline for photography, screenshots, and portraits.
// Replaces the per-phase one-offs (Phase 6 portrait, Phase 7/8 screenshot
// scripts) with a single data-driven runner. Each task in TASKS describes a
// source file, the output naming, the widths to emit, and the codecs.
//
// Usage:
//   node scripts/optimize-assets.mjs              -> runs all tasks
//   node scripts/optimize-assets.mjs photography  -> filter by group key
//
// Filename is .mjs (not .ts as docs/content-briefing.md §10.2 nominally
// suggests) because the project ships no ts-runner; ESM JS keeps the
// pipeline a single `node` invocation away.

import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// CI assertion: source/unused asset directories must never live inside public/.
// Masters belong in content-input/ (gitignored) so they are not served to the web.
(function assertNoSourceInPublic() {
  const publicDir = join(root, "public");
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "source" || entry === "_unused") {
          throw new Error(
            `Source/unused asset dir found inside public/: ${full}\n` +
              "Move it to content-input/ so it is not served to the web.",
          );
        }
        walk(full);
      }
    }
  }
  walk(publicDir);
})();

const QUALITY = { avif: 60, webp: 80, jpg: 82 };

const COPYRIGHT_YEAR = new Date().getFullYear();
const COPYRIGHT_EXIF = {
  exif: {
    IFD0: {
      Copyright: `© ${COPYRIGHT_YEAR} Manuel Heller`,
      Artist: "Manuel Heller",
    },
  },
};

/** @typedef {{
 *   group: string,
 *   source: string,
 *   outDir: string,
 *   outName: string,
 *   widths: number[],
 *   codecs?: ("avif" | "webp" | "jpg")[],
 *   jpgFallbackWidth?: number | number[],
 *   resize?: { width?: number, height?: number, fit?: "cover" | "inside", position?: string },
 *   quality?: { avif?: number, webp?: number, jpg?: number },
 *   copyright?: boolean,
 * }} Task */

/** @type {Task[]} */
const TASKS = [
  // — Phase 9 · Photography — (copyright: true → embeds EXIF Copyright + Artist)
  // Quality floor is avif 60 / webp 82 site-wide for pro photos: the
  // earlier q38-50 range showed visible compression at display size
  // (explicit user feedback — this section exists to show photography
  // skills). Full-bleed layouts (sizes=100vw) additionally carry a
  // 2560w rung so large/high-DPR screens don't upscale 1600w.
  // NOTE: the 01-pelican master (DSC05426) is currently missing from
  // content-input/photography/source — the task skips with a warning
  // and public/ keeps the older 800/1200/1600 q42 set. Drop the master
  // back in, re-run, and add the 2560w rung to Photography.tsx's
  // widths for slide 01.
  {
    group: "photography",
    source: "content-input/photography/source/DSC05426-Verbessert-RR.jpg",
    outDir: "public/photography",
    outName: "01-pelican",
    widths: [800, 1200, 1600, 2560],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    quality: { avif: 60, webp: 82 },
    copyright: true,
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC00947.jpg",
    outDir: "public/photography",
    outName: "02-koenigsegg",
    widths: [800, 1200, 1600, 2200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    quality: { avif: 60, webp: 82 },
    copyright: true,
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC06968-Verbessert-SR.jpg",
    outDir: "public/photography",
    outName: "03-panorama",
    widths: [1200, 1920, 2880],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1920,
    quality: { avif: 60, webp: 82 },
    copyright: true,
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC07960.jpg",
    outDir: "public/photography",
    outName: "04-tree-lake",
    widths: [800, 1200, 1600, 2200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    quality: { avif: 60, webp: 82 },
    copyright: true,
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC06599-Verbessert-RR.jpg",
    outDir: "public/photography",
    outName: "05-crocodile",
    widths: [800, 1200, 1600, 2560],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    // 16:9 aspect crop. Source frames the croc head with the butterfly
    // off-centre; sharp's `fit: cover` centres + crops to the target
    // ratio without distortion.
    resize: { width: 1920, height: 1080, fit: "cover" },
    quality: { avif: 60, webp: 82 },
    copyright: true,
  },
  // — Phase 6 · Profile portrait —
  // Drop the original portrait at `content-input/profile/profile-picture.jpg`
  // (gitignored), then run:
  //   node scripts/optimize-assets.mjs profile
  // Emits the same 480/800/1200w AVIF + WebP set plus JPG fallbacks
  // at both 800w (display srcset fallback) and 1200w (canonical URL
  // referenced by JSON-LD Person.image and the home-page image-sitemap).
  // The 1200w JPG carries EXIF Copyright + Artist via `copyright: true`.
  // Naming uses the manuel-heller- prefix so the canonical filename
  // carries the primary SEO keyword for image search.
  {
    group: "profile",
    source: "content-input/profile/profile-picture.jpg",
    outDir: "public/profile",
    outName: "manuel-heller-portrait",
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    // Two JPG fallbacks: 800w as the Portrait.tsx <img> srcset
    // fallback (rare clients without AVIF/WebP support) and 1200w as
    // the canonical URL referenced by JSON-LD Person.image.contentUrl
    // and the home-page <image:image> sitemap entry.
    jpgFallbackWidth: [800, 1200],
    quality: { avif: 60, webp: 80, jpg: 90 },
    copyright: true,
  },
  // — Phase 12 · Work-Section Portfolio + Case Study Joggediballa screenshots —
  {
    group: "portfolio",
    source: "content-input/projects/portfolio/source/homepage-landscape.png",
    outDir: "public/projects/portfolio",
    outName: "homepage",
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 800,
    resize: { width: 2400, height: 1350, fit: "cover" },
  },
  // Five-theme split (theme-differentiation pass): one hero, five
  // vertical slices in switcher order (riso/wave/turbulenz/aquarell/
  // nachtdruck) with ink seams. Master composed from per-preset
  // Playwright hero shots; the Work-section portfolio card shows this
  // instead of the single-theme shot. The single-theme "homepage"
  // master above stays for the sitemap image entry.
  {
    group: "portfolio",
    source: "content-input/projects/portfolio/source/homepage-five-themes.png",
    outDir: "public/projects/portfolio",
    outName: "homepage-themes",
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 800,
    resize: { width: 2400, height: 1350, fit: "cover" },
  },
  // Joggediballa landscape screenshots — all 16:9. The darkmode
  // homepage shot feeds the Work-card's Nachtdruck swap
  // (JoggediballaScreenshot) — outName "homepage-dark".
  ...[
    "admin-lightmode-landscape",
    "goennerverwaltung-lightmode-landscape",
    "homepage-lightmode-landscape",
    "homepage-darkmode-landscape",
    "statistics-lightmode-landscape",
    "twitchoverlay-lightmode-landscape",
  ].map((slug) => ({
    group: "joggediballa",
    source: `content-input/projects/joggediballa/source/${slug}.png`,
    outDir: "public/projects/joggediballa",
    outName: slug.replace("-lightmode-landscape", "").replace("-darkmode-landscape", "-dark"),
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 800,
    resize: { width: 2400, height: 1350, fit: "cover" },
  })),
  // Joggediballa phone screenshots — 9:16 portrait
  ...["formular-lightmode-phone", "homepage-lightmode-phone"].map((slug) => ({
    group: "joggediballa",
    source: `content-input/projects/joggediballa/source/${slug}.png`,
    outDir: "public/projects/joggediballa",
    outName: slug.replace("-lightmode-phone", "-phone"),
    widths: [360, 540, 720],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 540,
    resize: { width: 1440, height: 2560, fit: "cover" },
    quality: { avif: 55, webp: 78 },
  })),
  // — Creative pass · Off-the-screen tile reveals —
  // Manuel provides BOTH crops per tile at
  // content-input/about/tiles/{key}-{landscape|portrait}.{jpg|png} —
  // uniformly 16:9 landscape / 2:3 portrait since the second image
  // drop. The pipeline only scales, it never re-crops (the author's
  // framing IS the framing). TileRevealOverlay picks the orientation
  // via <source media>. Missing masters skip with a warning, so tiles
  // go live one at a time as photos land; mirror the live set in
  // src/components/about/tileReveals.ts (TILE_REVEAL_KEYS + width
  // tables). pingpong has no master yet. tauchen masters are video
  // stills (PNG, 1363w/843w) — widths capped so the srcset never
  // advertises upscales. Quality sits deliberately high (avif 60 /
  // webp 82): the overlay is a photography showcase, loads on click
  // only, and visible compression here was explicit user feedback.
  ...["camera", "audi", "joggediballa", "schnee", "tauchen", "pingpong"].flatMap((key) => [
    {
      group: "about-tiles",
      source: `content-input/about/tiles/${key}-landscape.jpg`,
      outDir: "public/about/tiles",
      outName: `${key}-landscape`,
      widths: key === "tauchen" ? [800, 1200] : [1200, 1920, 2560],
      codecs: ["avif", "webp"],
      jpgFallbackWidth: key === "tauchen" ? 1200 : 1920,
      quality: { avif: 60, webp: 82, jpg: 85 },
      copyright: true,
    },
    {
      group: "about-tiles",
      source: `content-input/about/tiles/${key}-portrait.jpg`,
      outDir: "public/about/tiles",
      outName: `${key}-portrait`,
      widths: key === "tauchen" ? [540, 810] : [720, 1080, 1440],
      codecs: ["avif", "webp"],
      jpgFallbackWidth: key === "tauchen" ? 540 : 1080,
      quality: { avif: 60, webp: 82, jpg: 85 },
      copyright: true,
    },
  ]),
];

const groupFilter = process.argv[2];
const ensureDir = (p) => existsSync(p) || mkdirSync(p, { recursive: true });

const tasks = groupFilter ? TASKS.filter((t) => t.group === groupFilter) : TASKS;

if (tasks.length === 0) {
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.error(`no tasks match group "${groupFilter}"`);
  process.exit(1);
}

for (const task of tasks) {
  let src = resolve(root, task.source);
  // Some masters arrive as PNG (e.g. the tauchen video stills) — try
  // the .png sibling before declaring the source missing.
  if (!existsSync(src) && task.source.endsWith(".jpg")) {
    const pngAlt = resolve(root, task.source.replace(/\.jpg$/, ".png"));
    if (existsSync(pngAlt)) src = pngAlt;
  }
  if (!existsSync(src)) {
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.warn(`⊘ ${task.group} · ${task.outName} — source not found, skipped (${task.source})`);
    continue;
  }
  const outDir = resolve(root, task.outDir);
  ensureDir(outDir);

  const codecs = task.codecs ?? ["avif", "webp"];
  // Accept either a single fallback width or an array of widths (e.g.
  // portrait wants both 800w for the <img> srcset fallback and 1200w
  // for the JSON-LD canonical URL).
  const fallbackWidths = Array.isArray(task.jpgFallbackWidth)
    ? task.jpgFallbackWidth
    : [task.jpgFallbackWidth ?? task.widths[0]];
  const q = { ...QUALITY, ...(task.quality ?? {}) };

  for (const w of task.widths) {
    let base = sharp(src);
    if (task.resize?.width && task.resize?.height) {
      // Aspect-crop and width-scale in ONE resize call — sharp only
      // honours the last resize() in a pipeline, so the previous
      // two-step (crop, then scale) silently dropped the crop and
      // outputs kept the source aspect. Unnoticed until the
      // about-tiles portrait crops because every earlier master was
      // already pre-cropped to the task's target aspect.
      const h = Math.round((w * task.resize.height) / task.resize.width);
      base = base.resize({
        width: w,
        height: h,
        fit: task.resize.fit ?? "cover",
        position: task.resize.position,
      });
    } else {
      base = base.resize({ width: w, withoutEnlargement: true });
    }
    if (task.copyright) {
      base = base.withMetadata(COPYRIGHT_EXIF);
    }

    if (codecs.includes("avif")) {
      await base.clone().avif({ quality: q.avif }).toFile(`${outDir}/${task.outName}-${w}w.avif`);
    }
    if (codecs.includes("webp")) {
      await base.clone().webp({ quality: q.webp }).toFile(`${outDir}/${task.outName}-${w}w.webp`);
    }
  }

  for (const fallbackW of fallbackWidths) {
    let jpgBase = sharp(src);
    if (task.resize?.width && task.resize?.height) {
      // Same single-resize rule as the AVIF/WebP loop above.
      const h = Math.round((fallbackW * task.resize.height) / task.resize.width);
      jpgBase = jpgBase.resize({
        width: fallbackW,
        height: h,
        fit: task.resize.fit ?? "cover",
        position: task.resize.position,
      });
    } else {
      jpgBase = jpgBase.resize({ width: fallbackW, withoutEnlargement: true });
    }
    if (task.copyright) {
      jpgBase = jpgBase.withMetadata(COPYRIGHT_EXIF);
    }
    await jpgBase
      .jpeg({ quality: q.jpg, mozjpeg: true })
      .toFile(`${outDir}/${task.outName}-${fallbackW}w.jpg`);
  }

  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log(`✓ ${task.group} · ${task.outName}`);
}
