// tests/i18n/key-parity.spec.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Asserts all 4 locale message catalogs share the EXACT same key
 * structure. Catches missed/typo'd keys before next-intl throws at
 * runtime ("MISSING_TRANSLATION: …"). Only compares paths, never
 * values — the project intentionally mirrors DE content across
 * locales until the proper translation pass.
 *
 * Runs as a node-only Playwright test (no browser; testInfo + page
 * fixtures unused). Playwright can run pure-node assertions just
 * fine via `test.describe` + `expect`.
 */

const LOCALES = ["de", "en", "fr", "it"] as const;
const ROOT = resolve(__dirname, "..", "..");

function flatten(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [prefix];
    // Union the shapes of ALL elements, not just the first. Homogeneous
    // arrays produce the same result; heterogeneous arrays (e.g.
    // work.projects where [1] may be missing fields [0] has) are caught
    // rather than silently skipped.
    return [...new Set(obj.flatMap((el) => flatten(el, `${prefix}[]`)))].sort();
  }
  return Object.keys(obj as Record<string, unknown>)
    .flatMap((k) => flatten((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k))
    .sort();
}

function loadFlatKeys(locale: string): Set<string> {
  const path = resolve(ROOT, "messages", `${locale}.json`);
  const json = JSON.parse(readFileSync(path, "utf-8"));
  return new Set(flatten(json));
}

test.describe("@i18n key parity across locales", () => {
  test("DE / EN / FR / IT have identical key sets", () => {
    const sets = LOCALES.map((l) => ({ locale: l, keys: loadFlatKeys(l) }));
    const reference = sets[0];
    if (!reference) throw new Error("no locales loaded");
    for (const { locale, keys } of sets.slice(1)) {
      const missingInTarget = [...reference.keys].filter((k) => !keys.has(k));
      const extraInTarget = [...keys].filter((k) => !reference.keys.has(k));
      expect(
        { locale, missingInTarget, extraInTarget },
        `${locale} key drift vs ${reference.locale}`,
      ).toEqual({ locale, missingInTarget: [], extraInTarget: [] });
    }
  });
});
