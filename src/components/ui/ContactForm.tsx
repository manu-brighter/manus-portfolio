"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { SITE } from "@/lib/site";

/**
 * Contact form — client component for submit-state choreography.
 *
 * Phase-11 wiring strategy: the form is fully built (validation, honeypot,
 * accessible labels, status announcements) but the submit handler does NOT
 * call Resend yet. The Cloudflare Worker that bridges browser -> Resend
 * lives in the Sprint 6 server pass; until then, submit always lands on
 * `mailto-fallback` state with a direct mail link to SITE.author.email.
 *
 * Honoring the static-export constraint: there is no `/api/*` server route.
 * The eventual prod flow is `fetch("https://contact.manuelheller.dev",
 * { method: "POST", body: JSON.stringify(values) })` to a Worker that
 * proxies to Resend with the API key server-side. Public-key direct-call
 * was rejected (abuse risk, see prior briefing).
 *
 * Validation is intentionally light: HTML5 constraints (`required`, `type`,
 * `minLength`) plus the honeypot. Heavier client-side validation (Zod,
 * react-hook-form) would bloat the bundle for a contact form whose volume
 * will be measured in single digits per month.
 *
 * Honeypot pattern: a field a real user never sees / focuses (`bot-trap`,
 * tabIndex=-1, aria-hidden, off-screen). Bots fill all fields blindly;
 * if it has a value, we silently swallow the submit.
 */
export function ContactForm() {
  const t = useTranslations("contact.form");
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const trapId = useId();

  const [status, setStatus] = useState<"idle" | "sending" | "fallback" | "error">("idle");
  const fallbackTimerRef = useRef<number | null>(null);

  // Cancel any in-flight stub timer on unmount so React doesn't warn
  // about a state update on an unmounted component.
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Honeypot tripped — silently swallow. Setting `fallback` here
    // would hand the bot a visible mailto link with Manuel's address;
    // the whole point of the trap is to look like a successful submit
    // to the bot while doing nothing.
    if (formData.get("bot-trap")) return;

    setStatus("sending");
    // Phase-11 Sprint-1 stub: Resend Worker not deployed yet — graceful
    // fallback to direct email. Replaced in Sprint 6 with real fetch.
    fallbackTimerRef.current = window.setTimeout(() => {
      setStatus("fallback");
      fallbackTimerRef.current = null;
    }, 320);
  }

  const isSending = status === "sending";

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-5"
      aria-describedby={status !== "idle" ? "contact-status" : undefined}
    >
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

      <button type="submit" disabled={isSending} className="riso-submit self-start">
        {isSending ? t("submit.sending") : t("submit.label")}
      </button>

      <div
        id="contact-status"
        aria-live="polite"
        className="min-h-[1.5rem] type-body-sm text-ink-soft"
      >
        {status === "fallback" && (
          <span>
            {t("status.fallback")}{" "}
            <a
              href={`mailto:${SITE.author.email}?subject=${encodeURIComponent(t("status.mailSubject"))}`}
              className="underline decoration-spot-rose decoration-2 underline-offset-4 transition-colors hover:text-ink"
            >
              {SITE.author.email}
            </a>
          </span>
        )}
        {status === "error" && <span className="text-spot-rose">{t("status.error")}</span>}
      </div>
    </form>
  );
}
