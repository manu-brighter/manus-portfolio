<?php

declare(strict_types=1);

/**
 * Contact-form endpoint for manuelheller.dev.
 *
 * The site itself is a static export (no Node runtime) served by nginx.
 * This PHP file is the sibling server-side endpoint the contact form POSTs
 * to (same-origin `/api/contact`, mapped via infra/nginx/contact-endpoint.conf).
 * It validates the payload, re-checks the honeypot, rate-limits per IP, and
 * mails the message to Manuel via authenticated SMTP (PHPMailer).
 *
 * Setup: see infra/contact/README.md.
 *   - `composer require phpmailer/phpmailer` next to this file (-> vendor/)
 *   - copy config.example.php to config.php (OUTSIDE the web root) and fill
 *     in real SMTP credentials; never commit config.php.
 *
 * Why SMTP and not PHP mail(): Bluewin/Swisscom filters aggressively, and
 * raw sendmail from a VPS IP lands in spam. Authenticated SMTP through a
 * mailbox on a domain with SPF/DKIM gets reliable inbox placement.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

/** Emit a JSON response + status code and stop. */
function respond(int $code, array $payload): never
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

// --- Load config (kept outside the web root; path can be overridden by the
//     CONTACT_CONFIG fastcgi_param, see the nginx snippet). ----------------
$configPath = getenv('CONTACT_CONFIG') ?: __DIR__ . '/config.php';
if (!is_file($configPath)) {
    error_log('[contact] missing config: ' . $configPath);
    respond(500, ['ok' => false, 'error' => 'server_misconfigured']);
}
/** @var array<string,mixed> $config */
$config = require $configPath;

$autoload = __DIR__ . '/vendor/autoload.php';
if (!is_file($autoload)) {
    error_log('[contact] missing vendor/autoload.php — run composer require phpmailer/phpmailer');
    respond(500, ['ok' => false, 'error' => 'server_misconfigured']);
}
require $autoload;

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

// --- Parse + validate input ------------------------------------------------
$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    respond(400, ['ok' => false, 'error' => 'bad_request']);
}

$name = trim((string) ($data['name'] ?? ''));
$email = trim((string) ($data['email'] ?? ''));
$message = trim((string) ($data['message'] ?? ''));
$trap = trim((string) ($data['bot-trap'] ?? $data['botTrap'] ?? ''));

// Honeypot: pretend success, mail nothing. Mirrors the client behaviour so a
// bot can't distinguish a swallowed submit from a real one.
if ($trap !== '') {
    respond(200, ['ok' => true]);
}

$fields = [];
if ($name === '' || mb_strlen($name) > 200) {
    $fields[] = 'name';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 320) {
    $fields[] = 'email';
}
if (mb_strlen($message) < 10 || mb_strlen($message) > 5000) {
    $fields[] = 'message';
}
if ($fields !== []) {
    respond(422, ['ok' => false, 'error' => 'validation', 'fields' => $fields]);
}

// --- Rate limit (per IP, sliding window, file-backed) ----------------------
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$max = (int) ($config['rate_limit_max'] ?? 5);
$window = (int) ($config['rate_limit_window'] ?? 3600);
if (!contact_rate_ok($ip, $max, $window)) {
    respond(429, ['ok' => false, 'error' => 'rate_limited']);
}

// --- Send ------------------------------------------------------------------
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = (string) $config['smtp_host'];
    $mail->Port = (int) $config['smtp_port'];
    $mail->SMTPAuth = true;
    $mail->Username = (string) $config['smtp_user'];
    $mail->Password = (string) $config['smtp_pass'];
    $mail->SMTPSecure = (string) ($config['smtp_secure'] ?? PHPMailer::ENCRYPTION_STARTTLS);
    $mail->CharSet = PHPMailer::CHARSET_UTF8;

    // From a domain you control (SPF/DKIM) for deliverability; Reply-To the
    // visitor so a plain "Reply" reaches them; To your inbox.
    $mail->setFrom((string) $config['from_address'], (string) ($config['from_name'] ?? 'manuelheller.dev'));
    $mail->addAddress((string) $config['to_address']);
    $mail->addReplyTo($email, $name);

    $subject = (string) ($config['subject'] ?? 'Neue Nachricht über manuelheller.dev');
    $mail->Subject = $subject . ' — ' . $name;
    $mail->isHTML(true);
    $mail->Body = contact_email_html($name, $email, $message);
    $mail->AltBody = contact_email_text($name, $email, $message);

    $mail->send();
    respond(200, ['ok' => true]);
} catch (MailException) {
    error_log('[contact] send failed: ' . $mail->ErrorInfo);
    respond(502, ['ok' => false, 'error' => 'send_failed']);
}

/**
 * Crude per-IP sliding-window rate limit. Returns false when the IP has hit
 * `$max` submissions inside `$window` seconds. File-backed in the system temp
 * dir — fine for single-digit-per-month volume; swap for Redis if it grows.
 */
function contact_rate_ok(string $ip, int $max, int $window): bool
{
    $file = sys_get_temp_dir() . '/contact_rl_' . md5($ip) . '.json';
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $decoded = json_decode((string) file_get_contents($file), true);
        if (is_array($decoded)) {
            $hits = array_values(array_filter(
                $decoded,
                static fn ($ts): bool => is_int($ts) && ($now - $ts) < $window,
            ));
        }
    }
    if (count($hits) >= $max) {
        return false;
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);

    return true;
}

/** Riso-flavoured HTML email (inline styles + table layout for client compat). */
function contact_email_html(string $name, string $email, string $message): string
{
    $paper = '#f0e8dc';
    $paperTint = '#fef2e2';
    $ink = '#0a0608';
    $inkSoft = '#4a4044';
    $rose = '#ff6ba0';
    $line = '#d6cbb8';

    $eName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $eEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
    $eMessage = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

    return <<<HTML
    <body style="margin:0;padding:0;background:{$paper};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{$paper};padding:32px 16px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:{$paperTint};border:1.5px solid {$ink};">
            <tr><td style="height:6px;background:{$rose};"></td></tr>
            <tr><td style="padding:28px 28px 8px 28px;">
              <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:{$inkSoft};">
                manuelheller.dev &middot; Kontaktformular
              </div>
              <h1 style="margin:10px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:26px;color:{$ink};">
                Neue Nachricht
              </h1>
            </td></tr>
            <tr><td style="padding:18px 28px 4px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:{$inkSoft};width:90px;vertical-align:top;">Name</td>
                  <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:15px;color:{$ink};">{$eName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:{$inkSoft};vertical-align:top;">E-Mail</td>
                  <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:15px;color:{$ink};">
                    <a href="mailto:{$eEmail}" style="color:{$ink};text-decoration:underline;text-decoration-color:{$rose};">{$eEmail}</a>
                  </td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:8px 28px 0 28px;"><div style="border-top:1px solid {$line};"></div></td></tr>
            <tr><td style="padding:18px 28px 28px 28px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:{$ink};">
              {$eMessage}
            </td></tr>
          </table>
          <div style="max-width:560px;margin-top:12px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;color:{$inkSoft};">
            Antworten geht direkt — Reply-To ist auf den Absender gesetzt.
          </div>
        </td></tr>
      </table>
    </body>
    HTML;
}

/** Plaintext alternative for clients that strip HTML. */
function contact_email_text(string $name, string $email, string $message): string
{
    return "Neue Nachricht über manuelheller.dev\n\n"
        . "Name:   {$name}\n"
        . "E-Mail: {$email}\n\n"
        . "----------------------------------------\n\n"
        . $message . "\n";
}
