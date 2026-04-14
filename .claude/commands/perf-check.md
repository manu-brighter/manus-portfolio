---
description: Run local Lighthouse + bundle analysis and compare against the §8 budget.
allowed-tools: Bash(pnpm *), Bash(ls *), Read, Grep
---

Run the local performance check:

1. `pnpm build` — capture build output (bundle sizes, route manifest).
2. `pnpm lighthouse` against `./out`.
3. Read the latest JSON report from `.lighthouseci/`.
4. Compare each metric against `docs/plan.md` §8:
   - `categories:performance` — target 0.95 / hard 0.90
   - `categories:accessibility` — target 1.00 / hard 0.95
   - LCP < 1.8s target / 2.5s hard
   - CLS < 0.05 target / 0.1 hard
   - Initial JS (gzipped) < 130kB target / 180kB hard
5. Report per-metric: pass / target-miss / hard-fail, with numeric delta
   and a one-line remediation hint on each failure
   (e.g. "LCP 2.1s — hero font blocking, add preload").

Note: on Windows `lhci` often crashes in chrome-launcher tempdir cleanup
(EPERM). If it bails, either run on WSL/Ubuntu CI, or use the CI's run as
the authoritative result.
