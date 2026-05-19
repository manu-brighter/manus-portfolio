# SF-2 — CSP / nginx security-headers decisions

**Branch**: `chore/sf2-csp-headers`
**Status**: deliverable-only — Manuel applies the nginx config manually on `mc-host24.de`.
**Roll-out**: Report-Only first (1–2 weeks), then enforce.

---

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
| `'unsafe-inline'` on `script-src` | Trivial; no build pipeline change. | Weakens CSP — any future stored-content XSS gains script execution. | **Phase 1 baseline.** |
| Per-request nonce | Strongest hardening; browsers reject `'unsafe-inline'` if `'nonce-...'` is also present. | Static export emits one HTML per build — a fixed-at-build nonce is reusable across visitors, which CSP3 still accepts but reduces nonce hygiene. To get per-request nonces we'd need to inject them at the Nginx layer with `sub_filter` (fragile + extra worker CPU). | **Skip.** |
| SHA-256 hash | Strong; static, build-time computable. | Hash changes whenever either script's bytes change, which (for `jsonLd`) happens whenever site metadata or locale strings change. Hash list must be regenerated and committed alongside the nginx conf. | **Phase 2 target.** Defer until the report-only window proves nothing else needs allow-listing first. |

**Decision**: Phase 1 ships `script-src 'self' 'unsafe-inline'` in **Report-Only** mode. After Manuel collects 1–2 weeks of violation reports and we know the full set of resources the site actually loads (especially once Plausible lands), Phase 2 tightens to enforcement with SHA-256 hashes for the two inline scripts and drops `'unsafe-inline'`.

This matches the analyzer's recommendation in F-security-5: "CSP rollout traditionally breaks something the first time; mitigate with `Content-Security-Policy-Report-Only` for a week before flipping to enforcing."

## Per-directive reasoning

| Directive | Phase 1 value | Why |
|---|---|---|
| `default-src` | `'self'` | Catch-all baseline; tighter per-type directives below. |
| `script-src` | `'self' 'unsafe-inline'` | Inline scripts (REDIRECT_SCRIPT + JSON-LD). Phase 2 → hashes. |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind v4 emits some inline `style` attributes; Next.js injects critical CSS inline. Removing `'unsafe-inline'` here breaks the build. No realistic XSS lever via style alone (older browsers + IE only). |
| `img-src` | `'self' data: blob:` | `data:` for inline favicon SVGs + OG image hash URLs; `blob:` for any future canvas exports. |
| `font-src` | `'self'` | `@fontsource-variable/*` ships fonts under `/_next/static/media/`. No `data:` URIs in font payloads. |
| `connect-src` | `'self'` | No external fetches today. Sprint 6 adds Worker URL (TBD); analytics adds Plausible host. |
| `media-src` | `'self'` | `AmbientVideo` ships from same origin. |
| `worker-src` | `'self'` | No Workers today. Explicit because CSP3 falls back through `child-src` → `default-src`, which works but obscures intent — and a future Plausible self-hosted script (or any tracker) could pull in a Worker without our noticing. |
| `frame-src` | `'none'` | Site embeds no iframes. |
| `frame-ancestors` | `'none'` | Site refuses to be iframed (legacy X-Frame-Options DENY shim kept too). |
| `base-uri` | `'self'` | Pins `<base href>` injection vector. |
| `object-src` | `'none'` | No `<object>` / `<embed>` / `<applet>`. |
| `form-action` | `'self' mailto:` | Contact form currently falls back to `mailto:` link; allow the protocol. Future Worker URL added here too. |
| `manifest-src` | `'self'` | `manifest.webmanifest` is same-origin. |
| `upgrade-insecure-requests` | (present, no value) | Belt-and-suspenders for any future http:// asset that sneaks in. |
| `report-to` / `report-uri` | (deferred to Phase 2) | Without a report-collector endpoint set up (Cloudflare's CSP reports or a Worker), violations only land in browser DevTools. Acceptable for the 1–2 week monitoring window if Manuel watches Chrome/Firefox console while smoke-testing. |

## Other security headers

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 2-year max-age + preload-eligible. ⚠️ **certbot's default `--hsts` flag adds its own `add_header Strict-Transport-Security ...` line into the cert-managed config block. If left in place, Nginx emits HSTS twice (different `max-age` values). Deploy step 2 below removes the certbot line before reloading.** Preload step needs a separate submission to https://hstspreload.org once Manuel is comfortable with the value — preload is quasi-permanent, so confirm every `*.manuelheller.dev` subdomain (incl. future analytics + mail/MX) is HTTPS-ready before submitting. |
| `X-Content-Type-Options` | `nosniff` | Forces browsers to respect the `Content-Type` header. |
| `X-Frame-Options` | `DENY` | Legacy clickjacking shim. Redundant with `frame-ancestors 'none'` but cheap and supported by older browsers. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Browser default for modern browsers; pinning here for safety. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()` | Site uses none of these APIs; deny everything. Both Google behavioural-ad opt-outs: `interest-cohort=()` covers the retired FLoC (still respected by older Chromium); `browsing-topics=()` is the active Topics API opt-out. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the site's browsing context group. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Pairs with COOP for Spectre mitigations. |
| `Cross-Origin-Embedder-Policy` | (omitted) | Would require all cross-origin resources to send CORP. Site is fully same-origin, so this works in principle — but enabling COEP breaks `SharedArrayBuffer`-incompatible features in some browsers and risks future-Plausible/Worker complications. Skip for now. |

## Manuel's deploy steps

1. `scp infra/nginx/security-headers.conf manuel@mc-host24.de:/etc/nginx/conf.d/`
2. **Remove the certbot HSTS line** from `/etc/nginx/sites-available/manuelheller.dev` (or wherever certbot wrote it — usually inside the `server { … }` block immediately after the `ssl_certificate*` lines). It looks like
   `add_header Strict-Transport-Security "max-age=...";` — delete that single line so the include below is the sole HSTS source. Without this step Nginx emits HSTS twice with conflicting `max-age` values.
3. Inside `/etc/nginx/sites-available/manuelheller.dev`, inside the `server { … }` block, add:
   ```nginx
   include /etc/nginx/conf.d/security-headers.conf;
   ```
4. `sudo nginx -t && sudo systemctl reload nginx`.
5. Verify via `curl -sI https://manuelheller.dev/` — every header from the table above should appear in the response exactly once.
6. Open Chrome DevTools → Network → click `/` → Response Headers — `Content-Security-Policy-Report-Only` should be present. Browse the site normally for 1–2 weeks; watch the Console for `Refused to load … because it violates the following Content Security Policy directive` warnings. Capture screenshots / forward DevTools output to a notes doc.
7. Once the violation list is stable (ideally empty), swap `Content-Security-Policy-Report-Only` → `Content-Security-Policy` (just rename the directive in the conf), reload nginx. ⚠️ Add a TODO with a hard date in `MEMORY.md` (or as a GitHub issue) at deploy time — `'unsafe-inline'` stays in script-src/style-src until step 8 lands and otherwise becomes a permanent weakening of the policy.
8. Phase 2 (later) — replace `script-src 'self' 'unsafe-inline'` with two SHA-256 hashes covering the two inline scripts shipped today:
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

   Hashes change whenever either script's bytes change, so the helper should run as part of the deploy pipeline — not on demand. Tracking issue: see step 7's TODO.

## Test plan

Local verification before push:
- Build the static export (`pnpm build`) — confirms no new inline scripts emerged.
- (Optional) Spin up a Docker nginx with the conf to validate the syntax. Skipped here because the conf is plain-text and `nginx -t` on the server is the authoritative check.

Live verification after Manuel deploys:
- `curl -sI https://manuelheller.dev/` — verify every header is present.
- Browse the site in Chrome with DevTools open; check Console for CSP violations.
- Test the Contact form's mailto fallback path (already shipped).
- Test the locale switcher (View Transitions API).
- Test the Tweakpane panel on `/playground/ink-drop-studio` — no inline-style violations expected.
- Test the JSON-LD inline script via `https://search.google.com/test/rich-results?url=https://manuelheller.dev/de/`.
