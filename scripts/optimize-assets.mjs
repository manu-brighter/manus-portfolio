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

import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const QUALITY = { avif: 60, webp: 80, jpg: 82 };

/** @typedef {{
 *   group: string,
 *   source: string,
 *   outDir: string,
 *   outName: string,
 *   widths: number[],
 *   codecs?: ("avif" | "webp" | "jpg")[],
 *   jpgFallbackWidth?: number,
 *   resize?: { width?: number, height?: number, fit?: "cover" | "inside" },
 *   quality?: { avif?: number, webp?: number, jpg?: number },
 * }} Task */

/** @type {Task[]} */
const TASKS = [
  // — Phase 9 · Photography —
  {
    group: "photography",
    source: "content-input/photography/source/DSC05426-Verbessert-RR.jpg",
    outDir: "public/photography",
    outName: "01-pelican",
    widths: [800, 1200, 1600],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    quality: { avif: 42, webp: 70 },
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC00947.jpg",
    outDir: "public/photography",
    outName: "02-koenigsegg",
    widths: [800, 1200, 1600],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    quality: { avif: 42, webp: 70 },
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC06968-Verbessert-SR.jpg",
    outDir: "public/photography",
    outName: "03-panorama",
    widths: [1200, 1920, 2880],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1920,
    quality: { avif: 50, webp: 75 },
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC07960.jpg",
    outDir: "public/photography",
    outName: "04-tree-lake",
    widths: [800, 1200, 1600],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    quality: { avif: 38, webp: 65 },
  },
  {
    group: "photography",
    source: "content-input/photography/source/DSC06599-Verbessert-RR.jpg",
    outDir: "public/photography",
    outName: "05-crocodile",
    widths: [800, 1200, 1600],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 1200,
    // 16:9 aspect crop. Source frames the croc head with the butterfly
    // off-centre; sharp's `fit: cover` centres + crops to the target
    // ratio without distortion.
    resize: { width: 1920, height: 1080, fit: "cover" },
    quality: { avif: 42, webp: 70 },
  },
  // — Phase 12 · Work-Section Portfolio + Case Study Joggediballa screenshots —
  {
    group: "portfolio",
    source: "public/projects/portfolio/source/homepage-landscape.png",
    outDir: "public/projects/portfolio",
    outName: "homepage",
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 800,
    resize: { width: 2400, height: 1350, fit: "cover" },
  },
  // Joggediballa landscape screenshots — all 16:9
  ...[
    "admin-lightmode-landscape",
    "goennerverwaltung-lightmode-landscape",
    "homepage-lightmode-landscape",
    "statistics-lightmode-landscape",
    "twitchoverlay-lightmode-landscape",
  ].map((slug) => ({
    group: "joggediballa",
    source: `public/projects/joggediballa/source/${slug}.png`,
    outDir: "public/projects/joggediballa",
    outName: slug.replace("-lightmode-landscape", ""),
    widths: [480, 800, 1200],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 800,
    resize: { width: 2400, height: 1350, fit: "cover" },
  })),
  // Joggediballa phone screenshots — 9:16 portrait
  ...["formular-lightmode-phone", "homepage-lightmode-phone"].map((slug) => ({
    group: "joggediballa",
    source: `public/projects/joggediballa/source/${slug}.png`,
    outDir: "public/projects/joggediballa",
    outName: slug.replace("-lightmode-phone", "-phone"),
    widths: [360, 540, 720],
    codecs: ["avif", "webp"],
    jpgFallbackWidth: 540,
    resize: { width: 1440, height: 2560, fit: "cover" },
    quality: { avif: 55, webp: 78 },
  })),
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
  const src = resolve(root, task.source);
  if (!existsSync(src)) {
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.warn(`⊘ ${task.group} · ${task.outName} — source not found, skipped (${task.source})`);
    continue;
  }
  const outDir = resolve(root, task.outDir);
  ensureDir(outDir);

  const codecs = task.codecs ?? ["avif", "webp"];
  const fallbackW = task.jpgFallbackWidth ?? task.widths[0];
  const q = { ...QUALITY, ...(task.quality ?? {}) };

  for (const w of task.widths) {
    let base = sharp(src);
    if (task.resize) {
      base = base.resize(task.resize);
    }
    base = base.resize({ width: w, withoutEnlargement: true });

    if (codecs.includes("avif")) {
      await base.clone().avif({ quality: q.avif }).toFile(`${outDir}/${task.outName}-${w}w.avif`);
    }
    if (codecs.includes("webp")) {
      await base.clone().webp({ quality: q.webp }).toFile(`${outDir}/${task.outName}-${w}w.webp`);
    }
  }

  let jpgBase = sharp(src);
  if (task.resize) {
    jpgBase = jpgBase.resize(task.resize);
  }
  await jpgBase
    .resize({ width: fallbackW, withoutEnlargement: true })
    .jpeg({ quality: q.jpg })
    .toFile(`${outDir}/${task.outName}-${fallbackW}w.jpg`);

  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log(`✓ ${task.group} · ${task.outName}`);
}
