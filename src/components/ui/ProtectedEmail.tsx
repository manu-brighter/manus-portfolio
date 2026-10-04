"use client";

import { useEffect, useState } from "react";
import { assembleEmail, EMAIL_PLACEHOLDER } from "@/lib/email";

/**
 * ProtectedEmail: the contact address as a mailto link that never ships
 * in the static HTML.
 *
 * The prerendered markup (and the no-JS view) carries only the "[at]"
 * placeholder, which primitive regex harvesters don't match. The real
 * address is assembled from its parts after mount, so it exists only in
 * the live DOM. A clever scraper that runs JS still gets it; this is
 * about the cheap bulk harvesters. The swap happens in an effect, so the
 * hydrated tree matches the server tree and there is no mismatch.
 *
 * Print (CV PDF via `window.print()`) runs after hydration, so paper
 * gets the real address and "visible text === destination" holds.
 */
export function ProtectedEmail({ className }: { className?: string }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(assembleEmail());
  }, []);

  if (!address) return <span className={className}>{EMAIL_PLACEHOLDER}</span>;
  return (
    <a href={`mailto:${address}`} className={className}>
      {address}
    </a>
  );
}
