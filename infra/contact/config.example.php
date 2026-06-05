<?php

declare(strict_types=1);

/**
 * Contact endpoint config TEMPLATE.
 *
 * Copy this to `config.php`, fill in real SMTP credentials, and keep the
 * copy OUTSIDE the web root (or otherwise un-servable) — it holds a secret.
 * `config.php` is gitignored; never commit real credentials.
 *
 * The nginx snippet passes the path via the CONTACT_CONFIG fastcgi_param,
 * so config.php can live next to contact.php OR anywhere else on the box.
 */

return [
    // --- SMTP transport ----------------------------------------------------
    'smtp_host' => 'smtp.example.com',
    'smtp_port' => 587,
    'smtp_secure' => 'tls',                 // 'tls' (port 587) or 'ssl' (port 465)
    'smtp_user' => 'kontakt@manuelheller.dev',
    'smtp_pass' => 'CHANGE_ME',

    // --- Envelope ----------------------------------------------------------
    // From: a mailbox on a domain you control with SPF/DKIM set up — best
    // Bluewin deliverability. Avoid sending From: the bluewin address itself
    // (From == To can trip self-spam heuristics).
    'from_address' => 'kontakt@manuelheller.dev',
    'from_name' => 'manuelheller.dev Kontakt',
    // To: where you actually receive the messages.
    'to_address' => 'manuelheller@bluewin.ch',
    'subject' => 'Neue Nachricht über manuelheller.dev',

    // --- Abuse guard (per IP) ---------------------------------------------
    'rate_limit_max' => 5,                  // max submissions ...
    'rate_limit_window' => 3600,            // ... per this many seconds
];
