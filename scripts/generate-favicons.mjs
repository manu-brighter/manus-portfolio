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
//
// sharp resolved via the pnpm store path (same pattern as
// scripts/optimize-assets.mjs) — sharp is intentionally not a project dep.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcPath = resolve(root, "public/brand/icon-source.svg");
const outDir = resolve(root, "public");

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
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log(`  ${outName} (${size}x${size}${masked ? ", maskable" : ""})`);
}

// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Generating favicon variants from icon-source.svg...");
await generate({ size: 192, masked: false, outName: "icon-192.png" });
await generate({ size: 512, masked: false, outName: "icon-512.png" });
await generate({ size: 192, masked: true, outName: "icon-maskable-192.png" });
await generate({ size: 512, masked: true, outName: "icon-maskable-512.png" });
// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Done.");
