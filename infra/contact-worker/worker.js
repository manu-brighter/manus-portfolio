/**
 * Cloudflare Worker — contact-form endpoint for manuelheller.dev.
 *
 * The site is a static export (no Node runtime) served by nginx behind the
 * Cloudflare proxy. This Worker is bound to the route
 *   manuelheller.dev/api/contact
 * so it intercepts the form's same-origin POST AT THE EDGE — the request never
 * reaches nginx/origin. Same-origin keeps it inside the existing CSP
 * `connect-src 'self'` (no CSP change), and no separate server runtime exists.
 *
 * Behaviour mirrors the (now superseded) infra/contact/contact.php template:
 *   POST only -> 405 otherwise
 *   parse JSON, server-side honeypot recheck, field validation,
 *   per-IP rate limit (KV-backed), then send via the Resend HTTP API.
 * Responds with exactly { "ok": true } on success, which is what
 * src/components/ui/ContactForm.tsx checks for (else it drops to mailto).
 *
 * Deliverability: From a domain we control (manuelheller.dev), DKIM-signed by
 * Resend so DMARC aligns -> reliable Bluewin inbox placement. Reply-To is the
 * visitor, so a plain "Reply" reaches them. From != To (no self-spam heuristic).
 *
 * Required bindings / config (see wrangler.toml + README.md):
 *   - secret  RESEND_API_KEY      Resend API key (set via dashboard or
 *                                 `wrangler secret put RESEND_API_KEY`)
 *   - kv       CONTACT_RL         KV namespace for the per-IP rate limiter
 *   - vars     FROM_ADDRESS / FROM_NAME / TO_ADDRESS / SUBJECT
 *              RATE_LIMIT_MAX / RATE_LIMIT_WINDOW   (all optional; defaults below)
 */

export default {
  async fetch(request, env) {
    /** Emit a JSON response + status code (mirrors the PHP `respond()`). */
    const reply = (code, payload) =>
      new Response(JSON.stringify(payload), {
        status: code,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });

    if (request.method !== "POST") {
      return reply(405, { ok: false, error: "method_not_allowed" });
    }

    if (!env.RESEND_API_KEY) {
      console.error("[contact] missing RESEND_API_KEY secret");
      return reply(500, { ok: false, error: "server_misconfigured" });
    }

    // --- Config (env vars with the config.example.php defaults) -------------
    const FROM_ADDRESS = env.FROM_ADDRESS || "kontakt@manuelheller.dev";
    const FROM_NAME = env.FROM_NAME || "manuelheller.dev Kontakt";
    const TO_ADDRESS = env.TO_ADDRESS || "manuelheller@bluewin.ch";
    const SUBJECT = env.SUBJECT || "Neue Nachricht über manuelheller.dev";
    const RATE_MAX = Number.parseInt(env.RATE_LIMIT_MAX ?? "5", 10) || 5;
    const RATE_WINDOW = Number.parseInt(env.RATE_LIMIT_WINDOW ?? "3600", 10) || 3600;

    // --- Parse + validate input --------------------------------------------
    let data;
    try {
      data = await request.json();
    } catch {
      return reply(400, { ok: false, error: "bad_request" });
    }
    if (typeof data !== "object" || data === null) {
      return reply(400, { ok: false, error: "bad_request" });
    }

    const name = String(data.name ?? "").trim();
    const email = String(data.email ?? "").trim();
    const message = String(data.message ?? "").trim();
    const trap = String(data["bot-trap"] ?? data.botTrap ?? "").trim();

    // Honeypot: pretend success, send nothing. Mirrors the client behaviour so
    // a bot can't distinguish a swallowed submit from a real one. (The real
    // form never sends this field; this only catches direct/automated POSTs.)
    if (trap !== "") {
      return reply(200, { ok: true });
    }

    const fields = [];
    if (name === "" || name.length > 200) fields.push("name");
    if (!isEmail(email) || email.length > 320) fields.push("email");
    if (message.length < 10 || message.length > 5000) fields.push("message");
    if (fields.length > 0) {
      return reply(422, { ok: false, error: "validation", fields });
    }

    // --- Rate limit (per IP, sliding window, KV-backed) --------------------
    if (env.CONTACT_RL) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const ok = await rateOk(env.CONTACT_RL, ip, RATE_MAX, RATE_WINDOW);
      if (!ok) {
        return reply(429, { ok: false, error: "rate_limited" });
      }
    } else {
      console.warn("[contact] CONTACT_RL KV not bound — rate limiting disabled");
    }

    // --- Send via Resend ----------------------------------------------------
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_ADDRESS}>`,
          to: [TO_ADDRESS],
          reply_to: name ? `${name} <${email}>` : email,
          subject: `${SUBJECT} — ${name}`,
          html: emailHtml(name, email, message),
          text: emailText(name, email, message),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[contact] resend failed: ${res.status} ${body}`);
        return reply(502, { ok: false, error: "send_failed" });
      }
      return reply(200, { ok: true });
    } catch (err) {
      console.error(`[contact] send exception: ${err}`);
      return reply(502, { ok: false, error: "send_failed" });
    }
  },
};

/** Pragmatic email check (matches the form's HTML5 type=email expectation). */
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Per-IP sliding-window rate limit, KV-backed. Returns false when the IP has
 * hit `max` submissions inside `window` seconds. KV is eventually consistent —
 * fine for an abuse guard at single-digit-per-month volume.
 */
async function rateOk(kv, ip, max, window) {
  const key = `rl:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  let hits = [];
  const stored = await kv.get(key);
  if (stored) {
    try {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) {
        hits = arr.filter((ts) => typeof ts === "number" && now - ts < window);
      }
    } catch {
      /* corrupt entry — treat as empty */
    }
  }
  if (hits.length >= max) return false;
  hits.push(now);
  // TTL >= 60s (KV minimum); the window self-expires the key when idle.
  await kv.put(key, JSON.stringify(hits), { expirationTtl: Math.max(window, 60) });
  return true;
}

/** HTML-escape for interpolation into the email body. */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Riso-flavoured HTML email (inline styles + table layout for client compat). */
function emailHtml(name, email, message) {
  const paper = "#f0e8dc";
  const paperTint = "#fef2e2";
  const ink = "#0a0608";
  const inkSoft = "#4a4044";
  const rose = "#ff6ba0";
  const line = "#d6cbb8";

  const eName = escapeHtml(name);
  const eEmail = escapeHtml(email);
  const eMessage = escapeHtml(message).replace(/\r\n|\r|\n/g, "<br>\n");

  return `<body style="margin:0;padding:0;background:${paper};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${paperTint};border:1.5px solid ${ink};">
        <tr><td style="height:6px;background:${rose};"></td></tr>
        <tr><td style="padding:28px 28px 8px 28px;">
          <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${inkSoft};">
            manuelheller.dev &middot; Kontaktformular
          </div>
          <h1 style="margin:10px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:26px;color:${ink};">
            Neue Nachricht
          </h1>
        </td></tr>
        <tr><td style="padding:18px 28px 4px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${inkSoft};width:90px;vertical-align:top;">Name</td>
              <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:15px;color:${ink};">${eName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${inkSoft};vertical-align:top;">E-Mail</td>
              <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:15px;color:${ink};">
                <a href="mailto:${eEmail}" style="color:${ink};text-decoration:underline;text-decoration-color:${rose};">${eEmail}</a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 28px 0 28px;"><div style="border-top:1px solid ${line};"></div></td></tr>
        <tr><td style="padding:18px 28px 28px 28px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ink};">
          ${eMessage}
        </td></tr>
      </table>
      <div style="max-width:560px;margin-top:12px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;color:${inkSoft};">
        Antworten geht direkt — Reply-To ist auf den Absender gesetzt.
      </div>
    </td></tr>
  </table>
</body>`;
}

/** Plaintext alternative for clients that strip HTML. */
function emailText(name, email, message) {
  return (
    "Neue Nachricht über manuelheller.dev\n\n" +
    `Name:   ${name}\n` +
    `E-Mail: ${email}\n\n` +
    "----------------------------------------\n\n" +
    `${message}\n`
  );
}
