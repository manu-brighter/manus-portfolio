---
description: Simulate a production deploy via rsync --dry-run. Shows what would change on the server without touching it.
allowed-tools: Bash(pnpm *), Bash(rsync --dry-run *), Read
---

Simulate the production deploy without side effects:

1. `pnpm build` to refresh `./out`.
2. Run `rsync -avz --delete --dry-run ./out/ deploy@<host>:<remote-path>/` —
   substitute `<host>` and `<remote-path>` from the deploy config
   (see `docs/plan.md` §11 and `server/` once it exists).
3. Summarise the diff: files **added** / **changed** / **deleted** / **unchanged**.
   Flag anything surprising (e.g. deletion of assets that should persist).
4. Do **not** run the real rsync. The `deny` permission in
   `.claude/settings.json` blocks it — deploy stays a manual step.
