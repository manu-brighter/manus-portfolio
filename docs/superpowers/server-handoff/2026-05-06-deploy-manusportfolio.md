# Server-side handoff: manuelheller.dev deployment

**Audience:** Claude Code instance running on Manuel's mc-host24.de root server.
**Working directory expected on server:** `/var/www/manus-portfolio` (clone target).
**Companion live site:** `joggediballa.ch` already runs on this server (different vhost, MariaDB-backed).

## Context Manuel has provided

> Aktuell habe ich eine laufende website (joggediballa.ch) im verzeichnis
> /var/www/joggediballa-mainpage welche auf diesem root server läuft (zu dieser
> website gehört die datenbank joggediballa welche auf mariadb läuft).
> Der server selbst ist von mc-host24.de und von mir mit hilfe von gemini
> eingerichtet worden. Ich habe den server gerade von 4gb auf 6gb upgraded.
>
> Erste Aufgabe: durchsuche alles was es auf dem server geben könnte
> bezüglich dem thema schutzmechanismen (performance, ram usw.), hinterfrage ob das so sinn macht
> wie es implementiert ist, passe wenn sinnvoll auf 6gb an. Analysiere
> alle tools, features, configs. Geh das gesamte server-setup durch
> (nginx conf etc.), review sauber, hinterfrage, bring verbesserungen
> an wenn klar besser. Joggediballa-Setup-Verbesserungen sind erlaubt.
> Setup zwischen joggediballa und manusportfolio sollte konsistent sein
> ausser ein Unterschied bringt klaren Vorteil.
>
> Zweite Aufgabe: portfolio website einrichten auf /var/www/manus-portfolio.
> Domain manuelheller.dev (Ionos). Bei Fragen zuerst fragen. Wenn etwas
> manuell ausserhalb des Servers zu erledigen ist (DNS, etc.), Manuel
> Bescheid geben.
>
> Am Ende: ein markdown file mit dem gesamten Server-Aufbau (vorallem
> für zukünftige KI-Sessions damit diese sich direkt zurechtfinden).

## Specs already decided

- **Domain:** manuelheller.dev (primary). manuelheller.ch redirects 301 → manuelheller.dev. Both bought at Ionos.
- **DNS:** Cloudflare in front of Ionos (Manuel will switch the Ionos nameservers to Cloudflare's). Recommendation: do the same for joggediballa.ch — same server, same Ionos slow-DNS issue. Cloudflare is free; gives DDoS protection + CDN + faster propagation.
- **TLS:** Let's Encrypt via certbot (already installed on this server for joggediballa.ch). Cert for both `manuelheller.dev` and `manuelheller.ch` (for the redirect host).
- **Server-IP:** one IP suffices. nginx uses `server_name` directives to multiplex multiple vhosts.
- **Build pipeline:** static export. Repo is Next.js 16 with `output: "export"`. The build target is `./out/` (a folder of pre-rendered static HTML/CSS/JS/assets — no Node.js runtime needed on the server).
- **Analytics:** Plausible self-hosted (DSG/DSGVO compliant, no cookie banner needed). Install in a separate vhost like `analytics.manuelheller.dev` or `plausible.manuelheller.dev`. Daten bleiben auf dem Server. ~1KB async JS injected per page (will be wired in a follow-up after the deployment lands; not part of this handoff).
- **robots.txt indexing:** the production site at `manuelheller.dev` is initially configured to allow indexing (`index: true` in metadata). After first successful deploy + smoke test, verify externally that `manuelheller.dev/robots.txt` shows the expected content + that `manuelheller.dev/sitemap.xml` is fetchable. Only then announce launch.

## What to do, step by step

1. **Server-side audit (joggediballa setup review)**
   - Walk the entire `/var/www/joggediballa-mainpage/` setup, the active nginx vhost configs (`/etc/nginx/sites-{available,enabled}/`), systemd services, fail2ban / ufw / iptables rules, MariaDB config, certbot setup, log rotation policies.
   - List protective mechanisms. Cross-check whether 4GB-tuned values (worker counts, ulimits, MariaDB buffer pools) need to be relaxed or expanded for 6GB.
   - Document findings in a temporary `/root/server-audit.md` or similar before changing anything.

2. **Deployment-pattern decision**
   - Will `manusportfolio` be deployed via `git pull` + `pnpm build` directly on the server, or via CI artifact upload? Pick whichever pattern joggediballa already uses; consistency wins. If joggediballa has no pattern, recommend git pull + build on server (simplest for a static export).
   - Set up a deploy user (non-root) for `/var/www/manus-portfolio`.

3. **Repo clone + first build**
   - Clone `git@github.com:manu-brighter/manus-portfolio.git` to `/var/www/manus-portfolio`.
   - Install Node.js 20+ (or whichever LTS the server already has for joggediballa) and pnpm.
   - Run `pnpm install --frozen-lockfile && pnpm build`. Output lands in `/var/www/manus-portfolio/out/`.
   - Verify the `out/` folder structure and that `out/index.html` exists (root redirect to default locale).

4. **nginx vhost**
   - Create `/etc/nginx/sites-available/manuelheller.dev` with:
     - `listen 443 ssl http2;`
     - `server_name manuelheller.dev;`
     - `root /var/www/manus-portfolio/out;`
     - `index index.html;`
     - **Trailing-slash handling:** The static export emits paths like `/de/index.html` and `/de/playground/ink-drop-studio/index.html`. nginx's `try_files $uri $uri/ $uri.html =404;` handles all three forms (exact, dir-style with trailing slash, and `.html`-extension fallback).
     - **Cache headers:** `/_next/static/*` → `Cache-Control: public, max-age=31536000, immutable`. HTML files → `Cache-Control: public, max-age=300, must-revalidate`. Other assets (images, fonts) → `Cache-Control: public, max-age=86400`.
     - **Brotli compression:** install `nginx-brotli` module if not present. Enable for text/* + js + css. Falls back to gzip if Brotli unavailable.
     - **Security headers:** Strict-Transport-Security with preload + includeSubDomains, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy `camera=(), microphone=(), geolocation=()`. CSP is tricky for a Next.js static export — start with `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' plausible.* manuelheller.dev` and tighten if there are violations.
   - Create `/etc/nginx/sites-available/manuelheller.ch` as a 301-redirect-only host:
     - `server_name manuelheller.ch www.manuelheller.ch;`
     - `return 301 https://manuelheller.dev$request_uri;`
   - Symlink both into `sites-enabled/`. Test with `nginx -t`. Reload.

5. **TLS certificates**
   - `certbot --nginx -d manuelheller.dev -d www.manuelheller.dev` (separate cert for the dev domain).
   - `certbot --nginx -d manuelheller.ch -d www.manuelheller.ch` (separate cert for the redirect host — needed because the redirect happens at HTTPS-level after TLS termination).
   - Verify auto-renewal cron is active.

6. **DNS hand-off back to Manuel (manual step)**
   - Output the server's IPv4 (and IPv6 if available).
   - Output the Cloudflare-side records that need to exist:
     - `manuelheller.dev` A → server IP, proxied
     - `www.manuelheller.dev` CNAME → manuelheller.dev, proxied
     - `manuelheller.ch` A → server IP, proxied (redirect-only host)
     - `www.manuelheller.ch` CNAME → manuelheller.ch, proxied
   - Manuel will switch the Ionos nameservers to Cloudflare's.

7. **Smoke test**
   - `curl -I https://manuelheller.dev/` — expect 200 + correct Cache-Control + security headers.
   - `curl -I https://manuelheller.dev/de/` — expect 200.
   - `curl -I https://manuelheller.ch/` — expect 301 → manuelheller.dev.
   - `curl -s https://manuelheller.dev/sitemap.xml | head -20` — expect XML with 20 url entries.
   - `curl -s https://manuelheller.dev/robots.txt` — expect the env-aware allow shape.
   - Open `https://manuelheller.dev/` in a browser — verify Cloudflare proxy active (check Server header), favicon visible in tab, OG image preview when shared (test via Discord paste or `https://www.opengraph.xyz/url/<encoded-url>`).

8. **Document the final setup**
   - Append findings to `/root/server-setup.md` (or whatever Manuel's existing server-doc file is). Include:
     - Site list (joggediballa, manusportfolio, plausible if installed)
     - Per-site: vhost path, doc-root, deployment trigger, last-deploy date
     - DNS provider per domain
     - TLS cert paths + renewal status
     - Backup policy
     - 6GB-RAM tuning changes from the audit step
     - Open-tickets / known-issues
   - The doc should be self-contained enough that a future Claude session can be dropped onto the server with zero context and orient itself in <5 minutes.

## Open questions for Manuel before starting

1. **Server access**: confirm SSH key + user have permission to write `/var/www/manus-portfolio` and reload nginx. Sudo password handy?
2. **CI/CD preference**: deploy via git-pull-on-server + manual `pnpm build`, or set up a webhook + auto-deploy on `main` push? (Recommended: git-pull manual for now; auto-deploy can land later.)
3. **Plausible analytics**: install in this same handoff, or split into a follow-up session? (Recommended: split — get the portfolio live first, observe stability for a day, then add analytics.)
4. **Existing joggediballa-setup quirks**: anything Manuel already knows is suboptimal that you'd like Claude-on-server to address? (e.g., known too-tight worker_processes, DB query that hangs, etc.)

## Final reminder

- The portfolio is a **static export**. No Node.js runtime on the server. No PM2, no systemd unit for the app. Just nginx serving files.
- Lighthouse perf score is intentionally relaxed to ~0.55 in `.lighthouserc.json` because the hero FluidSim runs continuously. This is a **post-launch optimisation backlog item** — do not block launch on it.
- The `next-env.d.ts` is gitignored. After `pnpm install`, the file may regenerate during `pnpm build` — that's expected; never commit it.
