#!/usr/bin/env node
// Generate PNG favicon variants from Manuel's brand sources.
//
// Sources (both hand-crafted, kept in `public/brand/`):
//   - icon-source-transparent.png — drop on transparent background.
//     The single source of truth for all generated variants. The
//     OG / Twitter image routes read this directly to composite over
//     their own paper-bg cards.
//   - icon-source.png — same drop on paper-bg. Reference / archival
//     copy of the artist's intended look on paper. Not consumed by
//     the script after the hand-crafted transparent landed.
//
// Earlier versions of this script colour-keyed the paper-bg source
// to derive a transparent copy; that was lossy (faint halo at high
// zoom) and is unnecessary now that Manuel ships both variants.
//
// Pipeline:
//   1. Read icon-source-transparent.png.
//   2. Trim any extra transparent border + pad to square so resizes
//      don't squash the drop.
//   3. Generate variants:
//      - TRANSPARENT: just resize the square buffer.
//      - PAPER-BG: composite over a paper canvas.
//
// Run via `node scripts/generate-favicons.mjs` after replacing the
// source PNGs.
//
// Variants generated:
//   src/app/icon.png            32x32 TRANSPARENT (browser tab favicon)
//   src/app/favicon.ico         32x32 TRANSPARENT, served as /favicon.ico
//                               for legacy direct-requests (bots / very
//                               old browsers). Modern browsers use the
//                               linked /icon endpoint via <link rel="icon">.
//                               Stored as PNG bytes with .ico extension —
//                               browsers mime-sniff and render correctly.
//   src/app/apple-icon.png      180x180 paper-bg (iOS clipped icon)
//   public/icon-192.png         192x192 paper-bg (Android Chrome)
//   public/icon-512.png         512x512 paper-bg (Android splash)
//   public/icon-maskable-192.png  192x192 paper-bg + 80% safe area
//   public/icon-maskable-512.png  512x512 paper-bg + 80% safe area
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
const transparentSrcPath = resolve(root, "public/brand/icon-source-transparent.png");
const publicDir = resolve(root, "public");
const appDir = resolve(root, "src/app");

const PAPER_BG = "#F0E8D7"; // matches --color-paper

// Trim any extra transparent border on the hand-supplied transparent
// source + pad to a square so the drop isn't squashed by subsequent
// resizes. Returns the square-aspect transparent buffer.
async function buildTransparentSource() {
  const srcBuf = await readFile(transparentSrcPath);

  // Trim transparent borders.
  const trimmedBuf = await sharp(srcBuf).ensureAlpha().trim().png().toBuffer();

  // Pad to square aspect.
  const trimmedMeta = await sharp(trimmedBuf).metadata();
  const tw = trimmedMeta.width ?? 0;
  const th = trimmedMeta.height ?? 0;
  const side = Math.max(tw, th);
  const padX = Math.round((side - tw) / 2);
  const padY = Math.round((side - th) / 2);

  const squareBuf = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmedBuf, top: padY, left: padX }])
    .png()
    .toBuffer();

  return squareBuf;
}

async function generate({ size, masked, outName, outDir, bg }, transparentSquareBuf) {
  const safeArea = masked ? 0.8 : 1.0;
  const innerSize = Math.round(size * safeArea);
  const padding = Math.round((size - innerSize) / 2);

  const inner = await sharp(transparentSquareBuf).resize(innerSize, innerSize).png().toBuffer();

  if (bg === "transparent") {
    // No composite — just centred resize on a transparent canvas.
    const final = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: inner, top: padding, left: padding }])
      .png()
      .toBuffer();

    await mkdir(outDir, { recursive: true });
    await writeFile(`${outDir}/${outName}`, final);
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.log(`  ${outName} (${size}x${size}, transparent)`);
    return;
  }

  // Paper-bg composite.
  const final = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: inner, top: padding, left: padding }])
    .png()
    .toBuffer();

  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/${outName}`, final);
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log(`  ${outName} (${size}x${size}${masked ? ", maskable" : ""}, paper-bg)`);
}

// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Reading hand-supplied transparent source + padding to square...");
const transparentSquareBuf = await buildTransparentSource();
// biome-ignore lint/suspicious/noConsole: CLI script
console.log("");

// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Generating favicon variants...");

// Browser-tab favicon (transparent, src/app/icon.png — Next 16 file-based metadata)
await generate(
  { size: 32, masked: false, outName: "icon.png", outDir: appDir, bg: "transparent" },
  transparentSquareBuf,
);

// Legacy /favicon.ico — same 32x32 transparent PNG bytes, served with
// .ico extension for browsers / bots that request it directly. Next 16
// recognises src/app/favicon.ico as a file convention.
await writeFile(
  resolve(appDir, "favicon.ico"),
  await readFile(resolve(appDir, "icon.png")),
);
// biome-ignore lint/suspicious/noConsole: CLI script
console.log("  favicon.ico (32x32, transparent — copied from icon.png)");

// iOS home-screen icon (paper-bg, src/app/apple-icon.png)
await generate(
  { size: 180, masked: false, outName: "apple-icon.png", outDir: appDir, bg: PAPER_BG },
  transparentSquareBuf,
);

// Android Chrome / PWA manifest icons (paper-bg, public/)
await generate(
  { size: 192, masked: false, outName: "icon-192.png", outDir: publicDir, bg: PAPER_BG },
  transparentSquareBuf,
);
await generate(
  { size: 512, masked: false, outName: "icon-512.png", outDir: publicDir, bg: PAPER_BG },
  transparentSquareBuf,
);
await generate(
  { size: 192, masked: true, outName: "icon-maskable-192.png", outDir: publicDir, bg: PAPER_BG },
  transparentSquareBuf,
);
await generate(
  { size: 512, masked: true, outName: "icon-maskable-512.png", outDir: publicDir, bg: PAPER_BG },
  transparentSquareBuf,
);

// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Done.");
