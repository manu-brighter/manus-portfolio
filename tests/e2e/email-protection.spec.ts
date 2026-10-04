// tests/e2e/email-protection.spec.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * The contact address must never ship as plaintext (mail harvesters
 * regex the raw HTML). It is joined in the browser after hydration, so
 * the raw response carries only the "[at]" placeholder while the live
 * page still shows a working mailto link.
 */

const ADDRESS_RE = /[a-z0-9._%+-]+@bluewin\.ch/i;

const PATHS = [
  "/de/",
  "/de/cv/",
  ...["de", "en", "fr", "it"].flatMap((l) => [`/${l}/impressum/`, `/${l}/datenschutz/`]),
  "/maintenance.html",
];

for (const path of PATHS) {
  test(`${path} ships no plaintext address but renders a mailto after load`, async ({
    page,
    request,
  }) => {
    const raw = await (await request.get(path)).text();
    expect(raw).not.toMatch(ADDRESS_RE);

    await page.goto(path);
    await expect(page.locator('a[href^="mailto:"]').first()).toHaveAttribute("href", ADDRESS_RE);
  });
}

// The document check above can't see JS chunks or RSC payloads, which is
// where a minifier could constant-fold the parts back together. Scan the
// whole export instead (only meaningful against the static build).
test("no file in the static export contains the joined address", () => {
  test.skip(process.env.E2E_TARGET !== "prod", "Needs the static export in ./out");
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(html|txt|js|json|xml|webmanifest)$/.test(name)) {
        if (ADDRESS_RE.test(readFileSync(file, "utf8"))) hits.push(file);
      }
    }
  };
  walk(join(process.cwd(), "out"));
  expect(hits).toEqual([]);
});
