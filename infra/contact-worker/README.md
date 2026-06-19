# Contact-form endpoint — Cloudflare Worker + Resend

Replaces the `infra/contact/` PHP template. The site is a static export served
by nginx behind the Cloudflare proxy; this Worker is bound to the route
`manuelheller.dev/api/contact` and handles the form's same-origin POST **at the
Cloudflare edge** — the request never reaches nginx. No PHP, no server change,
no nginx edit, no new service on the box.

`src/components/ui/ContactForm.tsx` POSTs `{name, email, message}` as JSON and
treats only a `2xx` with `{ "ok": true }` as sent; anything else degrades to a
pre-filled `mailto:` link, so messages are never lost while this is being wired.

## Files

| File | Purpose |
| --- | --- |
| `worker.js` | The endpoint: POST-only, honeypot recheck, validation, per-IP rate limit (KV), send via Resend. |
| `wrangler.toml` | Config/bindings — for the `wrangler deploy` alternative; documents the dashboard setup too. |

## Setup (Cloudflare dashboard path)

### 1. Resend — verify the sending domain
1. Create a Resend account, **Add Domain** `manuelheller.dev`, pick a region.
2. Resend shows **3 DNS records** to add (exact values are generated per domain
   — copy them verbatim, do not invent them):
   - `TXT` at `resend._domainkey` — the DKIM public key
   - `TXT` at a sending subdomain (e.g. `send`) — `v=spf1 include:amazonses.com ~all`
   - `MX`  at that same subdomain — `feedback-smtp.<region>.amazonses.com` (prio 10)
3. Create an **API key** (Sending access). Keep it — it becomes the Worker secret.

### 2. Cloudflare DNS — add Resend's records
Add the 3 records from step 1 in the `manuelheller.dev` zone.
**Do NOT touch the existing root SPF** (`v=spf1 include:_spf-eu.ionos.com ~all`)
or the IONOS MX — those keep your mailbox working. Resend's SPF lives on the
`send` *subdomain*, so there is no conflict. (MX/TXT are DNS-only by nature —
no orange-cloud toggle applies.) DMARC already exists at `_dmarc` (`p=none`),
which is sufficient; with DKIM aligned you get a genuine DMARC pass.

Wait until Resend marks the domain **Verified** before testing.

### 3. Cloudflare Worker — create + bind
Workers & Pages -> **Create Worker** (name e.g. `manuelheller-contact`):
1. **Code:** paste the contents of `worker.js`, Deploy.
2. **KV namespace:** Workers & Pages -> KV -> Create (`contact-rl`). Then on the
   Worker: Settings -> Bindings -> add **KV** binding `CONTACT_RL` -> that namespace.
3. **Secret:** Settings -> Variables and Secrets -> add `RESEND_API_KEY`
   (type **Secret**) = the Resend API key from step 1.
4. **Vars (optional):** `FROM_ADDRESS`, `FROM_NAME`, `TO_ADDRESS`, `SUBJECT`,
   `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`. Defaults in `worker.js` already match
   the values below, so this is only needed to change them.
5. **Route:** Settings -> Domains & Routes -> Add route
   `manuelheller.dev/api/contact` (zone `manuelheller.dev`).

Defaults baked into `worker.js`:
`from kontakt@manuelheller.dev` / `to manuelheller@bluewin.ch` /
subject `Neue Nachricht über manuelheller.dev` / rate limit `5 / 3600s` per IP.

### 4. Test
```bash
curl -i -X POST https://manuelheller.dev/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","message":"Hallo, Test."}'
```
Expect `200 {"ok":true}` **and** the mail in the Bluewin inbox (check spam on
the first send). A non-200 / missing `ok` means the form will fall back to
mailto — inspect the Worker logs (dashboard -> the Worker -> Logs / `wrangler tail`).

## Behaviour / parity with the old PHP endpoint

- Method != POST -> `405 method_not_allowed`
- Bad JSON -> `400 bad_request`
- Honeypot field (`bot-trap`) non-empty -> `200 {ok:true}`, sends nothing
- Validation (name 1–200, valid email ≤320, message 10–5000) -> `422 validation` + `fields[]`
- Per-IP rate limit exceeded -> `429 rate_limited`
- Resend error -> `502 send_failed`
- Success -> `200 {ok:true}`

## Security notes

- All validation + honeypot are re-checked server-side; a direct POST can't
  bypass the client checks.
- The Resend API key lives only as an encrypted Worker secret — never in code,
  the repo, or `wrangler.toml`.
- Reply-To is the visitor, so "Reply" reaches them; From != To avoids Bluewin
  self-spam heuristics.
