// Retroactively embeds Copyright + Artist EXIF metadata into existing
// optimized photography and portrait output files under public/.
//
// This is necessary because most source files are not in the repo, so
// re-running optimize-assets.mjs would skip them (source not found).
// This script reads each already-optimized file, re-encodes it in place
// at the same quality settings used during the original optimization run,
// and appends the EXIF IFD0 Copyright + Artist tags.
//
// Usage:
//   node scripts/embed-copyright.mjs            -> process all files
//   node scripts/embed-copyright.mjs --dry-run  -> log what would be processed, no writes
//
// Quality settings mirror scripts/optimize-assets.mjs exactly.
// AVIF EXIF support depends on the libheif/libavif encoder version;
// if a specific AVIF write returns no exif buffer that is a known
// encoder limitation — the script logs it but does not abort.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DRY_RUN = process.argv.includes("--dry-run");

const COPYRIGHT_YEAR = new Date().getFullYear();
const COPYRIGHT_EXIF = {
  exif: {
    IFD0: {
      Copyright: `© ${COPYRIGHT_YEAR} Manuel Heller`,
      Artist: "Manuel Heller",
    },
  },
};

// Quality settings per filename pattern, mirroring optimize-assets.mjs.
// The photography group uses per-photo overrides; portrait uses defaults.
const DEFAULT_QUALITY = { avif: 60, webp: 80, jpg: 82 };

/** Return quality settings for a given file path based on its basename. */
function qualityFor(filePath) {
  const name = filePath.split(/[\\/]/).pop() ?? "";
  if (name.startsWith("03-panorama")) return { avif: 50, webp: 75, jpg: 82 };
  if (name.startsWith("04-tree-lake")) return { avif: 38, webp: 65, jpg: 82 };
  // All other photography slots + portrait use these values
  if (name.startsWith("01-") || name.startsWith("02-") || name.startsWith("05-"))
    return { avif: 42, webp: 70, jpg: 82 };
  // portrait-* → defaults
  return DEFAULT_QUALITY;
}

/** Directories to walk — only photography + portrait. */
const TARGET_DIRS = [resolve(root, "public/photography"), resolve(root, "public/profile")];

// ── file collection ──────────────────────────────────────────────────────────

function collectFilesSync(dirs) {
  const files = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const ext = extname(entry).toLowerCase();
      if (ext === ".avif" || ext === ".webp" || ext === ".jpg") {
        files.push(join(dir, entry));
      }
    }
  }
  return files;
}

/** Re-encode a single file in place with EXIF metadata. Returns size delta in bytes. */
async function processFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  const q = qualityFor(filePath);
  const sizeBefore = statSync(filePath).size;

  // Read file into a buffer first. On Windows, libvips' native file-open path
  // can conflict with Defender real-time scans on recently-written files,
  // producing UNKNOWN/EBUSY errors. Passing a Buffer directly to sharp bypasses
  // the native open() call and avoids the lock.
  const inputBuf = readFileSync(filePath);

  let buf;
  if (ext === ".avif") {
    buf = await sharp(inputBuf).withMetadata(COPYRIGHT_EXIF).avif({ quality: q.avif }).toBuffer();
  } else if (ext === ".webp") {
    buf = await sharp(inputBuf).withMetadata(COPYRIGHT_EXIF).webp({ quality: q.webp }).toBuffer();
  } else if (ext === ".jpg") {
    buf = await sharp(inputBuf).withMetadata(COPYRIGHT_EXIF).jpeg({ quality: q.jpg }).toBuffer();
  } else {
    return { skipped: true };
  }

  // Overwrite the original file with the newly encoded buffer.
  writeFileSync(filePath, buf);
  const sizeAfter = buf.byteLength;
  return { sizeBefore, sizeAfter, delta: sizeAfter - sizeBefore };
}

// ── main ─────────────────────────────────────────────────────────────────────

const files = collectFilesSync(TARGET_DIRS);

if (files.length === 0) {
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.warn("No files found to process.");
  process.exit(0);
}

if (DRY_RUN) {
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log(`[dry-run] Would process ${files.length} file(s):`);
  for (const f of files) {
    const rel = f.replace(`${root}/`, "").replace(`${root}\\`, "");
    const q = qualityFor(f);
    const ext = extname(f).toLowerCase().slice(1);
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.log(`  ${rel}  (q=${q[ext] ?? "?"}, +EXIF Copyright+Artist)`);
  }
  process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;
let processed = 0;
let failed = 0;

for (const filePath of files) {
  const rel = filePath.replace(`${root}\\`, "").replace(`${root}/`, "");
  try {
    const result = await processFile(filePath);
    if (result.skipped) {
      // biome-ignore lint/suspicious/noConsole: CLI script
      console.warn(`⊘ skipped  ${rel}`);
      continue;
    }
    totalBefore += result.sizeBefore;
    totalAfter += result.sizeAfter;
    processed++;
    const deltaStr =
      result.delta >= 0
        ? `+${(result.delta / 1024).toFixed(1)} kB`
        : `${(result.delta / 1024).toFixed(1)} kB`;
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.log(`✓ ${rel}  (${deltaStr})`);
  } catch (err) {
    failed++;
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.error(`✗ ${rel}  ERROR: ${err.message}`);
  }
}

// ── summary ───────────────────────────────────────────────────────────────────
const totalDelta = totalAfter - totalBefore;
const deltaStr =
  totalDelta >= 0
    ? `+${(totalDelta / 1024).toFixed(1)} kB`
    : `${(totalDelta / 1024).toFixed(1)} kB`;

// biome-ignore lint/suspicious/noConsole: CLI script
console.log(
  `\nDone: ${processed} file(s) processed, ${failed} failed.` +
    `  Size: ${(totalBefore / 1024).toFixed(0)} kB → ${(totalAfter / 1024).toFixed(0)} kB  (${deltaStr})`,
);

if (failed > 0) process.exit(1);
