#!/usr/bin/env node
// Generate PNG favicon variants from public/brand/icon-source.png.
// Manuel's source is a raster PNG (1021x864), not SVG. We center-crop
// to a square first since the drop-blob logo is centred in the source.
//
// Run via `node scripts/generate-favicons.mjs` after replacing the
// source PNG.
//
// Variants generated:
//   icon-192.png            Android Chrome standard, paper-bg, full bleed
//   icon-512.png            Android splash, paper-bg, full bleed
//   icon-maskable-192.png   Android adaptive icon, paper-bg + 80% safe area
//   icon-maskable-512.png   Android adaptive icon, paper-bg + 80% safe area
//   src/app/icon.png        Browser tab favicon, 32x32 transparent
//   src/app/apple-icon.png  iOS home-screen icon, 180x180 paper-bg
//
// Next 16 file-based metadata picks up src/app/icon.png and
// src/app/apple-icon.png automatically — no .tsx route needed since
// we ship pre-generated static PNGs.
//
// sharp resolved via the pnpm store path (same pattern as
// scripts/optimize-assets.mjs) — sharp is intentionally not a project dep.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcPath = resolve(root, "public/brand/icon-source.png");
const publicDir = resolve(root, "public");
const appDir = resolve(root, "src/app");

const PAPER_BG = "#F0E8D7"; // matches --color-paper

// Load source PNG, center-crop to a square. Source is 1021x864, drop-blob
// is centred — take the largest centred square (864x864 here).
async function getSquareSource() {
  const buf = await readFile(srcPath);
  const meta = await sharp(buf).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const side = Math.min(width, height);
  const left = Math.round((width - side) / 2);
  const top = Math.round((height - side) / 2);
  return sharp(buf).extract({ left, top, width: side, height: side }).png().toBuffer();
}

async function generate({ size, masked, outName, outDir, bg }) {
  const square = await getSquareSource();
  const safeArea = masked ? 0.8 : 1.0;
  const innerSize = Math.round(size * safeArea);
  const padding = Math.round((size - innerSize) / 2);

  const inner = await sharp(square).resize(innerSize, innerSize).png().toBuffer();

  const background = bg === "transparent" ? { r: 0, g: 0, b: 0, alpha: 0 } : bg;

  const final = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: inner, top: padding, left: padding }])
    .png()
    .toBuffer();

  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/${outName}`, final);
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log(
    `  ${outName} (${size}x${size}${masked ? ", maskable" : ""}, ${bg === "transparent" ? "transparent" : "paper-bg"})`,
  );
}

// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Generating favicon variants from icon-source.png...");

// Android Chrome / PWA manifest icons (paper-bg, public/)
await generate({
  size: 192,
  masked: false,
  outName: "icon-192.png",
  outDir: publicDir,
  bg: PAPER_BG,
});
await generate({
  size: 512,
  masked: false,
  outName: "icon-512.png",
  outDir: publicDir,
  bg: PAPER_BG,
});
await generate({
  size: 192,
  masked: true,
  outName: "icon-maskable-192.png",
  outDir: publicDir,
  bg: PAPER_BG,
});
await generate({
  size: 512,
  masked: true,
  outName: "icon-maskable-512.png",
  outDir: publicDir,
  bg: PAPER_BG,
});

// Browser-tab favicon (transparent, src/app/icon.png — Next 16 file-based metadata)
await generate({ size: 32, masked: false, outName: "icon.png", outDir: appDir, bg: "transparent" });

// iOS home-screen icon (paper-bg, src/app/apple-icon.png)
await generate({
  size: 180,
  masked: false,
  outName: "apple-icon.png",
  outDir: appDir,
  bg: PAPER_BG,
});

// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Done.");
