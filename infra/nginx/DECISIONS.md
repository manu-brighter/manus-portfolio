# SF-2 — CSP / nginx security-headers decisions

**Branch**: `chore/sf2-csp-headers`
**Status**: deliverable-only — Manuel applies the nginx config manually on `mc-host24.de`.
**Roll-out**: ship enforcing directly (the box already had a narrower enforcing CSP since initial setup — see "Server-state audit" below). Phase 2 = SHA-256 hashes replace `'unsafe-inline'`.

---

## Server-state audit

Before this PR the box already shipped an enforcing CSP via `/etc/nginx/snippets/security-headers.conf`, included from three `location` blocks in `/etc/nginx/sites-available/manuelheller.dev` (`_next/static/`, the static-asset regex, and HTML `/`). That existing policy was narrower than what F-security-5 calls for: missing `worker-src`, `media-src`, `frame-src`, `manifest-src`, `upgrade-insecure-requests`, COOP / CORP; weaker `Permissions-Policy` (4 tokens); `X-Frame-Options: SAMEORIGIN` rather than `DENY`; `font-src 'self' data:` rather than `'self'`.

Two consequences for this PR:

1. **Skip Phase 1 Report-Only.** The F-security-5 analyzer recommends a Report-Only break-in window — but that assumes no prior CSP. Going from "enforce narrow policy" to "report-only broader policy" would be a regression for the 1–2-week monitoring window. Every directive change in this PR is either strictly tighter than the prior policy or a new directive denying something the site doesn't do (worker-src, media-src, frame-src, COOP, CORP), so enforcing directly is safe. The one exception is `form-action`, which adds `mailto:` — but the Contact form uses `<a href="mailto:…">` (anchor link, not `<form action>`), so CSP `form-action` doesn't apply either way; the `mailto:` token is defensive padding for a future state.
2. **Install as a snippet replacement, not a `conf.d/` server-level include.** nginx `add_header` inheritance breaks the moment any `location` block declares its own `add_header` — and the existing vhost has 3 such locations (caching-headers per location). Putting the new headers at the `server { … }` block level would silently fail. The right move is to overwrite the existing `/etc/nginx/snippets/security-headers.conf` content; the per-location includes that already wire it in stay untouched.

`joggediballa.ch` runs a separate vhost with `snippets/security-headers-app.conf` (intentionally no CSP, see OAuth/S3 reasoning inside that file). Out of scope here; flagged as a possible follow-up if the broader Permissions-Policy / COOP / CORP additions should land there too.

## Inline-script audit

Static export (`output: "export"`), so Next's `headers()` config is inert; all enforcement happens at the Nginx layer.

Two inline `<script>` blocks ship in the static export:

1. **`src/app/page.tsx:65`** — `REDIRECT_SCRIPT` (real JavaScript). Detects `navigator.languages` and redirects to the matching `/[locale]/`. Build-time controlled, no template substitution from any input. ~600 bytes.
2. **`src/app/[locale]/layout.tsx:64`** — `type="application/ld+json"`. Structured data, not executable. CSP `script-src` still applies (browsers gate ALL `<script>` tags through `script-src`), so it needs an allowance too. ~3 KB.

Third-party / external resources currently shipped: **none**. All JS, CSS, fonts, images, video are same-origin (static export served by Nginx). The R3F/Three.js stack contains no `eval()` or `new Function()` — the `eval*` matches in `three.module.js` are GLSL shader function names embedded in JS strings, not JavaScript evaluation.

Planned future origins (not in this commit):
- **Plausible self-hosted** (per `reference_deployment.md` memory) — will need `script-src` + `connect-src` entries pointing at the analytics host (likely `analytics.manuelheller.dev` or similar — TBD).
- **Cloudflare Worker → Resend** (Contact form, deferred sprint) — `connect-src` entry for the Worker's URL.

## Inline-script enforcement strategy

Three options for the two inline scripts:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| `'unsafe-inline'` on `script-src` | Trivial; no build pipeline change. | Weakens CSP — any future stored-content XSS gains script execution. | **Phase 1 baseline (this PR).** Inherited from the prior enforcing policy. |
| Per-request nonce | Strongest hardening; browsers reject `'unsafe-inline'` if `'nonce-...'` is also present. | Static export emits one HTML per build — a fixed-at-build nonce is reusable across visitors, which CSP3 still accepts but reduces nonce hygiene. To get per-request nonces we'd need to inject them at the Nginx layer with `sub_filter` (fragile + extra worker CPU). | **Skip.** |
| SHA-256 hash | Strong; static, build-time computable. | Hash changes whenever either script's bytes change, which (for `jsonLd`) happens whenever site metadata or locale strings change. Hash list must be regenerated and committed alongside the nginx conf. | **Phase 2 target.** Requires a build-time helper (see step 5). |

**Decision**: Phase 1 keeps `script-src 'self' 'unsafe-inline'` (status quo on the box). Phase 2 swaps `'unsafe-inline'` for two `'sha256-...'` entries once a deploy-pipeline helper extracts them. Add Plausible self-hosted entries to `script-src` + `connect-src` once Plausible is deployed; add the Worker URL to `connect-src` + `form-action` once the Contact form bridge lands.

## Per-directive reasoning

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'self'` | Catch-all baseline; tighter per-type directives below. |
| `script-src` | `'self' 'unsafe-inline'` | Inline scripts (REDIRECT_SCRIPT + JSON-LD). Phase 2 → hashes. |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind v4 emits some inline `style` attributes; Next.js injects critical CSS inline. Removing `'unsafe-inline'` here breaks the build. No realistic XSS lever via style alone (older browsers + IE only). |
| `img-src` | `'self' data: blob:` | `data:` for inline favicon SVGs + OG image hash URLs; `blob:` for any future canvas exports. |
| `font-src` | `'self'` | `@fontsource-variable/*` ships fonts under `/_next/static/media/`. No `data:` URIs in font payloads — verified before flipping the prior policy's `'self' data:` to `'self'`. |
| `connect-src` | `'self'` | No external fetches today. Sprint 6 adds Worker URL (TBD); analytics adds Plausible host. |
| `media-src` | `'self'` | `AmbientVideo` ships from same origin. |
| `worker-src` | `'self'` | No Workers today. Explicit because CSP3 falls back through `child-src` → `default-src`, which works but obscures intent — and a future Plausible self-hosted script (or any tracker) could pull in a Worker without our noticing. |
| `frame-src` | `'none'` | Site embeds no iframes. |
| `frame-ancestors` | `'none'` | Site refuses to be iframed (legacy X-Frame-Options DENY shim kept too). |
| `base-uri` | `'self'` | Pins `<base href>` injection vector. |
| `object-src` | `'none'` | No `<object>` / `<embed>` / `<applet>`. |
| `form-action` | `'self' mailto:` | Defensive padding — the Contact form currently uses `<a href="mailto:…">` (anchor), not `<form action="mailto:…">`, so this directive doesn't apply yet. Kept for the case the form is rewired to a mailto submit, and the future Worker URL lands here too. |
| `manifest-src` | `'self'` | `manifest.webmanifest` is same-origin. |
| `upgrade-insecure-requests` | (present, no value) | Belt-and-suspenders for any future http:// asset that sneaks in. |
| `report-to` / `report-uri` | (deferred) | Without a report-collector endpoint set up (Cloudflare's CSP reports or a Worker), violations only land in browser DevTools. Add once Plausible / a Worker is in place. |

## Other security headers

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 2-year max-age + preload-eligible. ⚠️ Preload step needs a separate submission to https://hstspreload.org once Manuel is comfortable with the value — preload is quasi-permanent, so confirm every `*.manuelheller.dev` subdomain (incl. future analytics + mail/MX) is HTTPS-ready before submitting. The certbot installer on this box did NOT use `--hsts`, so there's no duplicate-HSTS hazard to clean up; the prior enforcing snippet already carried HSTS at the same `max-age`. |
| `X-Content-Type-Options` | `nosniff` | Forces browsers to respect the `Content-Type` header. |
| `X-Frame-Options` | `DENY` | Legacy clickjacking shim. Tightened from the prior `SAMEORIGIN` so it matches `frame-ancestors 'none'`. Site never iframes itself, so DENY is safe. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Browser default for modern browsers; pinning here for safety. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()` | Site uses none of these APIs; deny everything. Both Google behavioural-ad opt-outs: `interest-cohort=()` covers the retired FLoC (still respected by older Chromium); `browsing-topics=()` is the active Topics API opt-out. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the site's browsing context group. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Pairs with COOP for Spectre mitigations. |
| `Cross-Origin-Embedder-Policy` | (omitted) | Would require all cross-origin resources to send CORP. Site is fully same-origin, so this works in principle — but enabling COEP breaks `SharedArrayBuffer`-incompatible features in some browsers and risks future-Plausible/Worker complications. Skip for now. |

## Manuel's deploy steps

The new directive set has been applied on the box on 2026-05-19; the steps below document the procedure for re-applying / rolling back / future Phase 2 work.

1. **Backup the existing snippet** before replacing it:
   `sudo cp /etc/nginx/snippets/security-headers.conf /etc/nginx/snippets/security-headers.conf.bak-$(date +%Y%m%d)`
2. **Replace the snippet content** with `infra/nginx/security-headers.conf` from this PR:
   `sudo install -m 0644 infra/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf`
   (No vhost edit required — the existing three per-location `include snippets/security-headers.conf;` lines pick up the new content as-is.)
3. **Validate + reload:** `sudo nginx -t && sudo systemctl reload nginx`.
4. **Verify:** `curl -sI https://manuelheller.dev/` — every header in the table above present exactly once. Spot-check an asset path (e.g. `_next/static/chunks/<some>.js`) and a 404 to confirm the `always` flag attaches headers everywhere.
5. **Phase 2 (later)** — replace `script-src 'self' 'unsafe-inline'` with two SHA-256 hashes covering the two inline scripts shipped today:
   - `/index.html` (the locale-detect REDIRECT_SCRIPT from `src/app/page.tsx`).
   - `/[locale]/index.html` (the `<script type="application/ld+json">` JSON-LD from `src/app/[locale]/layout.tsx`).

   The Python one-liner below is **example-only, not copy-paste-ready** — it matches every `<script>` tag in the served HTML, including Next.js's runtime chunk-loader inline scripts. Phase 2 needs a hardened build-time helper (e.g. a post-build node script that reads `out/index.html` + `out/de/index.html`, extracts the two known inline scripts by stable marker — `location.replace` for REDIRECT_SCRIPT, `type="application/ld+json"` for the JSON-LD — and writes the two CSP hashes to a small file Nginx can `include`).

   ```bash
   # Example, not production: prints SHA-256 for EVERY inline <script>
   # in the page — useful to enumerate candidates, NOT to derive the
   # final CSP directive. Replace with a build-time helper that
   # targets the two known scripts by marker.
   curl -s https://manuelheller.dev/ \
     | python3 -c "import sys, re, hashlib, base64; \
       html = sys.stdin.read(); \
       [print('sha256-' + base64.b64encode(hashlib.sha256(m.group(1).encode('utf-8')).digest()).decode()) \
        for m in re.finditer(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html, re.S)]"
   ```

   Hashes change whenever either script's bytes change, so the helper should run as part of the deploy pipeline — not on demand. Track Phase 2 as a follow-up issue at deploy time so `'unsafe-inline'` doesn't become permanent by inertia.

## Test plan

Local verification before push:
- Build the static export (`pnpm build`) — confirms no new inline scripts emerged.
- (Optional) Spin up a Docker nginx with the conf to validate the syntax. Skipped here because the conf is plain-text and `nginx -t` on the server is the authoritative check.

Live verification after deploy (done on 2026-05-19 against `https://manuelheller.dev/`):
- ✅ `curl -sI` — every header present.
- ✅ Asset path (`/_next/static/chunks/…`) — headers attach (per-location `include` covers it).
- ✅ 404 path (`/nope-404`) — `always` flag attaches headers to error responses.
- ✅ HSTS appears exactly once (no duplicate).
- ⏳ Browser DevTools Console smoke (locale switch, Tweakpane on `/playground/ink-drop-studio`, JSON-LD via Google Rich Results test) — owned by Manuel post-merge.
