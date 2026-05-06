// Icon-asset pipeline — separate from optimize-assets.mjs because icons
// are PNG-with-alpha line art, not photographic AVIF/WebP/JPG.
//
// Source: content-input/icons/*.png (committed, can be re-edited).
// Output: public/about/objects/<slug>-{120,240}w.png (1x + 2x retina).
//
// Usage:
//   node scripts/generate-icons.mjs

import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "public/about/objects");

/** @type {Array<{ source: string, slug: string }>} */
const TASKS = [
  { source: "content-input/icons/car.png", slug: "car" },
  { source: "content-input/icons/jogge di balla.PNG", slug: "joggediballa" },
  { source: "content-input/icons/ping pong.png", slug: "pingpong" },
];

const WIDTHS = [120, 240];

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const task of TASKS) {
  const src = resolve(root, task.source);
  if (!existsSync(src)) {
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.warn(`⊘ icon · ${task.slug} — source not found, skipped (${task.source})`);
    continue;
  }
  for (const w of WIDTHS) {
    const out = resolve(outDir, `${task.slug}-${w}w.png`);
    await sharp(src)
      .resize({ width: w, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(out);
    const size = statSync(out).size;
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.log(`✓ ${task.slug}-${w}w.png  ${(size / 1024).toFixed(1)}KB`);
  }
}
