#!/usr/bin/env node
// Generate PNG favicon variants from public/brand/icon-source.png.
//
// Pipeline:
//   1. Read Manuel's master PNG (drop-blob centred on paper-bg).
//   2. Walk RGBA pixels, key paper-coloured pixels (#F0E8D7) to alpha=0
//      with a soft-edge band so the trim is anti-aliased rather than
//      a hard 1-bit mask.
//   3. sharp.trim() autocrops the resulting transparent borders, giving
//      a tightly-cropped, square-aspect transparent source.
//   4. Cache that as public/brand/icon-source-transparent.png so the
//      OG/Twitter routes can reuse it.
//   5. Generate two flavours of variants:
//      - TRANSPARENT: just resize the trimmed source.
//      - PAPER-BG: composite the trimmed source over a paper canvas.
//
// Run via `node scripts/generate-favicons.mjs` after replacing the
// source PNG.
//
// Variants generated:
//   src/app/icon.png            32x32 TRANSPARENT (browser tab favicon)
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
const srcPath = resolve(root, "public/brand/icon-source.png");
const transparentSrcPath = resolve(root, "public/brand/icon-source-transparent.png");
const publicDir = resolve(root, "public");
const appDir = resolve(root, "src/app");

const PAPER_BG = "#F0E8D7"; // matches --color-paper
const PAPER_RGB = { r: 240, g: 232, b: 215 };

// Background-removal thresholds. Pixels within INNER are fully keyed
// out; pixels between INNER and OUTER fade to opaque on a linear
// gradient, anti-aliasing the trimmed edge. Bumped INNER from 30 to 40
// after first pass left a faint paper halo around the drop.
const INNER_THRESHOLD = 40;
const OUTER_THRESHOLD = 70;

// Walk the source PNG's RGBA pixels and write alpha based on distance
// to paper-bg colour. Returns the processed, trimmed, square-padded
// transparent buffer.
async function buildTransparentSource() {
  const srcBuf = await readFile(srcPath);
  const { data, info } = await sharp(srcBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error(`Expected RGBA source, got ${channels} channels`);
  }

  const out = Buffer.from(data); // copy so we can mutate alpha safely
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const dr = r - PAPER_RGB.r;
    const dg = g - PAPER_RGB.g;
    const db = b - PAPER_RGB.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < INNER_THRESHOLD) {
      out[i + 3] = 0;
    } else if (dist < OUTER_THRESHOLD) {
      const t = (dist - INNER_THRESHOLD) / (OUTER_THRESHOLD - INNER_THRESHOLD);
      out[i + 3] = Math.round(t * 255);
    }
    // else: keep original alpha (255 for fully-opaque drop pixels)
  }

  // Reconstruct from raw buffer, then trim transparent borders.
  const trimmedBuf = await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .trim() // autocrops fully-transparent borders
    .toBuffer();

  // Pad to square aspect so subsequent resizes don't squash the drop.
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

  // Cache to disk for the OG/Twitter image routes.
  await mkdir(dirname(transparentSrcPath), { recursive: true });
  await writeFile(transparentSrcPath, squareBuf);

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
console.log("Building trimmed transparent source from icon-source.png...");
const transparentSquareBuf = await buildTransparentSource();
// biome-ignore lint/suspicious/noConsole: CLI script
console.log(`  cached -> public/brand/icon-source-transparent.png\n`);

// biome-ignore lint/suspicious/noConsole: CLI script
console.log("Generating favicon variants...");

// Browser-tab favicon (transparent, src/app/icon.png — Next 16 file-based metadata)
await generate(
  { size: 32, masked: false, outName: "icon.png", outDir: appDir, bg: "transparent" },
  transparentSquareBuf,
);

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
