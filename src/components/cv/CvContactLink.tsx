"use client";

import { useLocale, useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { stashHomeSection } from "@/lib/homeSection";
import { navLabelLang } from "@/lib/navLang";

/**
 * CvContactLink — toolbar shortcut from the CV proof to the home
 * page's Contact section.
 *
 * The href is the real `/{locale}/#contact` so it stays a crawlable,
 * middle-clickable link. A plain click goes through the same
 * stash-and-push path as the Nav (see `stashHomeSection`), because a
 * native hash jump lands one section off while the case-study pin is
 * still settling.
 *
 * Label reuses the Nav's "Contact" entry (common namespace, already on
 * the client), so the toolbar and the navbar can't drift apart.
 */

type CvContactLinkProps = {
  className?: string;
};

export function CvContactLink({ className }: CvContactLinkProps) {
  const t = useTranslations("nav.items");
  const locale = useLocale();
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // New tab / window: let the browser follow the real href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.push(stashHomeSection("contact"));
  };

  return (
    <a
      href={`/${locale}/#contact`}
      onClick={onClick}
      lang={navLabelLang("contact", locale)}
      className={className}
    >
      <span>{t("contact")}</span>
      <span aria-hidden="true" className="shrink-0">
        →
      </span>
    </a>
  );
}
