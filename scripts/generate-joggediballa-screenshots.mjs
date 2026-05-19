/**
 * Generate optimized screenshot variants for the Joggediballa case-study section.
 *
 * What it does:
 * - Reads master PNG files from `content-input/projects/joggediballa/`
 * - Generates AVIF + WebP variants for each master
 * - Writes optimized files to `public/projects/joggediballa/screenshots/`
 *
 * When to run:
 * - After updating any source screenshots in the content-input directory
 * - Before deploying (run manually, not in pnpm scripts — see CLAUDE.md asset-pipeline pattern)
 *
 * Usage:
 * ```
 * node scripts/generate-joggediballa-screenshots.mjs
 * ```
 *
 * Inputs:
 * - `content-input/projects/joggediballa/*.png` (master source screenshots)
 *
 * Outputs:
 * - `public/projects/joggediballa/screenshots/*.{avif,webp,png}` (optimized variants)
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = resolve(root, "content-input/joggediballa/screenshots");
const OUT = resolve(root, "public/projects/joggediballa");

const SLUGS = [
  "admin-dashboard",
  "events",
  "home",
  "overlay-stream",
  "shotcounter",
  "statistic",
  "team",
];

const WIDTHS = [480, 800, 1200];

for (const slug of SLUGS) {
  const input = `${SRC}/${slug}.jpg`;
  for (const w of WIDTHS) {
    const base = sharp(input).resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 60 }).toFile(`${OUT}/${slug}-${w}w.avif`);
    await base.clone().webp({ quality: 80 }).toFile(`${OUT}/${slug}-${w}w.webp`);
  }
  await sharp(input)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(`${OUT}/${slug}-800w.jpg`);
  // biome-ignore lint/suspicious/noConsole: one-shot CLI script
  console.log(`✓ ${slug}`);
}
