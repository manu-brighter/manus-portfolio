// One-shot variant generator for Joggediballa case-study screenshots.
// Pattern matches Phase 6 (portrait) and Phase 7 (joggediballa-home):
// keep originals visually intact, only resize + recompress.
// Phase 9's photo-duotone shader is the place where color treatment lives;
// pro screenshots stay in their actual colors so the UI reads.

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
