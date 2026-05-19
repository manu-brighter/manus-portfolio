#!/usr/bin/env node
/**
 * Layering-rule check — enforces the dependency-arrow conventions
 * documented in `.claude/CLAUDE.md` and codified by the Wave-D
 * architectural moves in `chore/full-rework-2026-05-13`.
 *
 * Rules:
 *   1. `src/hooks/**`  must not import from `@/components/**`
 *   2. `src/lib/**`    must not import from `@/components/**`
 *   3. `src/lib/**`    must not import from `@/hooks/**`
 *
 * Why:
 *   - Hooks are infrastructure composed by components. Importing a
 *     component into a hook inverts the dependency arrow and creates
 *     circular-import risk.
 *   - lib/ is pure utilities (palette, fluidOrchestrator, raf,
 *     loaderSession, motion/context, etc.). It must not depend on
 *     React-component shapes or hooks; otherwise it can't be unit-
 *     tested in isolation and the layering contract dissolves.
 *
 * Runs in <1s on the whole codebase via regex import-parsing — no
 * AST library dep. Exits 0 on clean, 1 on violations.
 *
 * Usage:
 *   node scripts/check-layering.mjs
 *
 * Wired into `pnpm lint` (and therefore `pnpm ci:local`) so a
 * backslide on the Wave-D moves fails CI.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "src");

/** @type {{ from: RegExp; forbidden: RegExp[]; reason: string }[]} */
const RULES = [
  {
    from: /^hooks\//,
    forbidden: [/^@\/components(\/|$)/],
    reason:
      "hooks/ must not import from components/ — hooks are infrastructure that components compose, not the other way around.",
  },
  {
    from: /^lib\//,
    forbidden: [/^@\/components(\/|$)/, /^@\/hooks(\/|$)/],
    reason:
      "lib/ must not import from components/ or hooks/ — lib is pure utilities, must stay testable in isolation.",
  },
];

/**
 * Captures the path string from `import ... from "X"`, `import "X"`,
 * and `export ... from "X"` statements. Multi-line imports work
 * because `[\s\S]*?` is non-greedy across newlines.
 */
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)(?:[\s\S]*?from)?\s*["']([^"']+)["']/g;

/** @param {string} dir */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);

/** @type {{ file: string; line: number; importPath: string; reason: string }[]} */
const violations = [];

for (const file of files) {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  const rule = RULES.find((r) => r.from.test(rel));
  if (!rule) continue;

  const src = readFileSync(file, "utf8");
  IMPORT_RE.lastIndex = 0;
  for (;;) {
    const match = IMPORT_RE.exec(src);
    if (match === null) break;
    const importPath = match[1];
    for (const forbidden of rule.forbidden) {
      if (forbidden.test(importPath)) {
        const line = src.slice(0, match.index).split("\n").length;
        violations.push({ file: rel, line, importPath, reason: rule.reason });
      }
    }
  }
}

if (violations.length > 0) {
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.error(`\n[layering] ${violations.length} violation(s) found:\n`);
  for (const v of violations) {
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.error(`  src/${v.file}:${v.line}`);
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.error(`    imports: "${v.importPath}"`);
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.error(`    rule:    ${v.reason}`);
    // biome-ignore lint/suspicious/noConsole: CLI script
    console.error("");
  }
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.error("Rules are defined in scripts/check-layering.mjs.");
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.error(
    "If a violation is intentional, move the consumed module or relax the rule with rationale.",
  );
  process.exit(1);
}

// biome-ignore lint/suspicious/noConsole: CLI script
console.log(`[layering] OK — ${files.length} files scanned, 0 violations.`);
