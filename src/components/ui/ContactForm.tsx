"use client";

import gsap from "gsap";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { SITE } from "@/lib/site";

/**
 * Contact form — client component for submit-state choreography.
 *
 * Submit posts the form as JSON to a SAME-ORIGIN endpoint (`/api/contact`),
 * handled by a Cloudflare Worker bound to the route `manuelheller.dev/api/contact`
 * that sends the message via Resend. The Worker intercepts at the CF edge,
 * before nginx — so the static export needs no server runtime. Same-origin
 * keeps it within the existing CSP `connect-src 'self'` — no CSP change, and
 * no third party beyond Resend sees submissions. See `infra/contact-worker/`
 * for the Worker, config and setup.
 *
 * Honoring the static-export constraint: there is no Next `/api/*` route at
 * runtime (`output: "export"`). The endpoint is the edge Worker, not part of
 * the Next bundle.
 *
 * Graceful degrade: if the request fails (network, non-2xx, timeout, or the
 * endpoint isn't reachable) the form drops to an `error` state with a
 * pre-filled `mailto:` link to SITE.author.email — the visitor's message is
 * never lost.
 *
 * Validation is intentionally light: HTML5 constraints (`required`, `type`,
 * `minLength`) plus the honeypot client-side; the Worker re-validates
 * everything server-side (a direct POST bypasses the client checks).
 *
 * Honeypot pattern: a field a real user never sees / focuses (`bot-trap`,
 * tabIndex=-1, aria-hidden, off-screen). Bots fill all fields blindly; if it
 * has a value we silently swallow the submit (and the server does too).
 */

/** Same-origin endpoint — a Cloudflare Worker (Resend) handles this at the edge (see infra/contact-worker). */
const CONTACT_ENDPOINT = "/api/contact";
/** Abort the request after this long so a hung endpoint still degrades to mailto. */
const SUBMIT_TIMEOUT_MS = 8000;

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const trapId = useId();

  const requiredNoteId = useId();

  const [status, setStatus] = useState<Status>("idle");
  const abortTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const nameValueRef = useRef<string>("");
  const messageValueRef = useRef<string>("");
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const pulseTweenRef = useRef<gsap.core.Tween | null>(null);

  // Cancel any in-flight request + GSAP pulse on unmount so React doesn't
  // warn about a state update on an unmounted component.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortTimerRef.current !== null) {
        window.clearTimeout(abortTimerRef.current);
        abortTimerRef.current = null;
      }
      abortRef.current?.abort();
      abortRef.current = null;
      pulseTweenRef.current?.kill();
      pulseTweenRef.current = null;
    };
  }, []);

  // Start/stop the submit-button opacity pulse while sending.
  useEffect(() => {
    const btn = submitButtonRef.current;
    if (!btn) return;
    if (status === "sending") {
      pulseTweenRef.current = gsap.to(btn, {
        opacity: 0.6,
        duration: 0.55,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    } else {
      pulseTweenRef.current?.kill();
      pulseTweenRef.current = null;
      gsap.set(btn, { opacity: 1 });
    }
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // Honeypot tripped — silently swallow. Setting a visible state here would
    // hand the bot a mailto link with Manuel's address; the trap should look
    // like a successful submit to the bot while doing nothing.
    if (formData.get("bot-trap")) return;

    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const message = String(formData.get("message") ?? "");
    // Stash for the error-state mailto pre-fill.
    nameValueRef.current = name;
    messageValueRef.current = message;

    setStatus("sending");

    const controller = new AbortController();
    abortRef.current = controller;
    abortTimerRef.current = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
        signal: controller.signal,
      });
      // Only a genuine `{ "ok": true }` JSON 2xx counts as sent; anything
      // else (404 because the endpoint isn't wired, an HTML error page, a
      // validation 4xx) drops to the mailto fallback.
      let sent = false;
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        sent = data?.ok === true;
      }
      if (!mountedRef.current) return;
      if (sent) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      // Network failure, timeout/abort, or unreachable endpoint.
      if (!mountedRef.current) return;
      setStatus("error");
    } finally {
      if (abortTimerRef.current !== null) {
        window.clearTimeout(abortTimerRef.current);
        abortTimerRef.current = null;
      }
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  const isSending = status === "sending";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-5"
      aria-describedby={status !== "idle" ? "contact-status" : undefined}
    >
      {/* Required-fields note — visible to sighted and AT users alike.
          Each input references this via aria-describedby so SR users
          hear it when entering a field (WCAG 3.3.2). */}
      <p id={requiredNoteId} className="type-body-sm text-ink-muted">
        {t("requiredNote")}
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="type-label text-ink">
          {t("name.label")}
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          required
          autoComplete="name"
          disabled={isSending}
          placeholder={t("name.placeholder")}
          aria-describedby={requiredNoteId}
          className="riso-input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={emailId} className="type-label text-ink">
          {t("email.label")}
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isSending}
          placeholder={t("email.placeholder")}
          aria-describedby={requiredNoteId}
          className="riso-input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={messageId} className="type-label text-ink">
          {t("message.label")}
        </label>
        <textarea
          id={messageId}
          name="message"
          required
          minLength={10}
          rows={6}
          disabled={isSending}
          placeholder={t("message.placeholder")}
          aria-describedby={requiredNoteId}
          className="riso-input resize-y"
        />
      </div>

      {/* Honeypot — invisible to humans, irresistible to dumb bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={trapId}>{t("honeypot.label")}</label>
        <input
          id={trapId}
          type="text"
          name="bot-trap"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <button
        ref={submitButtonRef}
        type="submit"
        disabled={isSending}
        className="riso-submit self-start"
      >
        {isSending ? t("submit.sending") : t("submit.label")}
      </button>

      <div
        id="contact-status"
        aria-live="polite"
        className="min-h-[1.5rem] type-body-sm text-ink-soft"
      >
        {status === "sent" && <span>{t("status.success")}</span>}
        {status === "error" && (
          <span>
            {t("status.error")}{" "}
            <a
              href={`mailto:${SITE.author.email}?subject=${encodeURIComponent(t("status.mailSubject"))}&body=${encodeURIComponent(`${nameValueRef.current ? `${t("status.fromLabel")} ${nameValueRef.current}\n\n` : ""}${messageValueRef.current}`)}`}
              className="underline decoration-spot-rose decoration-2 underline-offset-4 transition-colors hover:text-ink"
            >
              {SITE.author.email}
            </a>
          </span>
        )}
      </div>
    </form>
  );
}
