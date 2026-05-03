// Cross-platform installer for repo-local git hooks.
//
// Sets `core.hooksPath` to `.githooks` so the version-controlled hooks
// (currently: pre-commit auto-unstaging next-env.d.ts) are picked up.
// Runs via `pnpm install` -> package.json `prepare` script.
//
// Failures are silenced because this also runs in tarball/CI contexts
// where there is no `.git` directory at all.

import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  if (process.platform !== "win32") {
    execSync("chmod +x .githooks/pre-commit", { stdio: "ignore" });
  }
} catch {
  // No .git here — nothing to wire up. CI / consumer install / docker build.
}
