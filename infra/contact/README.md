# Contact form endpoint (self-hosted PHP → SMTP)

> ## ⚠️ SUPERSEDED. DO NOT DEPLOY.
>
> This PHP template is **unused**. The live `/api/contact` endpoint is a
> **Cloudflare Worker → Resend** bridge, in production since 2026-06-19 and
> documented in [`../contact-worker/README.md`](../contact-worker/README.md).
> The Worker is bound to the route `manuelheller.dev/api/contact` and answers
> **at the Cloudflare edge, before nginx**, so the request never reaches the
> box at all.
>
> The box has **no PHP and no PHP-FPM installed**, so nothing in this
> directory runs. The sibling nginx snippet
> [`../nginx/contact-endpoint.conf`](../nginx/contact-endpoint.conf) is dead
> for the same reason: do not include it in the vhost.
>
> Kept as a reference implementation only. The Worker mirrors its contract
> (status codes, honeypot, validation bounds, per-IP rate limit), so this file
> stays useful as the fallback design if the endpoint ever moves back onto the
> origin. Everything below describes that hypothetical setup, not reality.

The site is a static export (no Node runtime). The contact form
(`src/components/ui/ContactForm.tsx`) POSTs JSON to the **same-origin**
path `/api/contact`. In this design nginx would map that path to `contact.php`
here. Same-origin keeps it inside the existing CSP `connect-src 'self'` (no CSP
change) and means no third party ever sees a submission. The live Worker keeps
exactly the same property, since its route sits on the site's own origin.

If the request fails for any reason, the form degrades gracefully to a
pre-filled `mailto:` link, so messages are never lost while you wire this up.

## Files

| File | Purpose |
| --- | --- |
| `contact.php` | The endpoint: validate → honeypot → rate-limit → mail via SMTP. |
| `config.example.php` | Template for SMTP credentials. Copy to `config.php`. |
| `../nginx/contact-endpoint.conf` | nginx `location = /api/contact` → PHP-FPM. Not included by the vhost. |

## Setup on the server

*Reference only. Do not run these steps: the live endpoint is the Cloudflare
Worker, and deploying this in parallel would put a second handler on the same
path.*

1. **PHP-FPM** — ensure it's installed and running for the box
   (e.g. `apt install php-fpm`; note the socket, e.g. `/run/php/php-fpm.sock`).

2. **Drop the endpoint outside the static doc-root**, e.g.
   `/var/www/manus-portfolio/contact/` (the doc-root that serves the export
   is `…/out/`). Copy `contact.php` there.

3. **PHPMailer** — from that `contact/` dir:
   ```bash
   composer require phpmailer/phpmailer
   ```
   (creates `vendor/` next to `contact.php`).

4. **Config** — copy and fill in real credentials, keep it un-servable:
   ```bash
   cp config.example.php config.php
   # edit config.php — SMTP host/user/pass, from/to addresses
   chmod 600 config.php
   ```
   `config.php` is gitignored; **never commit real credentials.**

5. **nginx** — `include` `contact-endpoint.conf` inside the
   `manuelheller.dev` server block, fix the three paths + the PHP-FPM socket,
   then `nginx -t && systemctl reload nginx`.

6. **Test**:
   ```bash
   curl -i -X POST https://manuelheller.dev/api/contact \
     -H 'Content-Type: application/json' \
     -d '{"name":"Test","email":"you@example.com","message":"Hallo, Test."}'
   ```
   Expect `200 {"ok":true}` and a mail in the Bluewin inbox.

## Deliverability to Bluewin (important)

Bluewin/Swisscom filters hard. For reliable inbox placement:

- **Send via authenticated SMTP** (this endpoint does — not PHP `mail()`).
- **`from_address` on a domain you control with SPF + DKIM + DMARC**
  (e.g. `kontakt@manuelheller.dev`). Sending `From:` the bluewin address
  itself (From == To) can trip self-spam heuristics — avoid it.
- `Reply-To` is set to the visitor, so hitting "Reply" reaches them directly.

## Security notes

- The honeypot and all field validation are **re-checked server-side** — a
  direct POST can't bypass the client checks.
- Per-IP rate limiting (default 5 / hour) lives in `contact.php`; tune via
  `rate_limit_max` / `rate_limit_window` in `config.php`.
- Keep `config.php` out of the web root (or denied in nginx) and `chmod 600`.
