import { SITE } from "@/lib/site";

/**
 * The contact address is stored as parts and joined only at runtime in
 * the browser, so the literal never appears in the static HTML, the RSC
 * payload or a JS chunk. Call `assembleEmail()` from effects and event
 * handlers or from client-only render paths, never during a server
 * render: that would bake the address straight back into the export.
 */
export function assembleEmail(): string {
  return `${SITE.author.email.user}@${SITE.author.email.domain}`;
}

/** Readable stand-in for the prerendered and no-JS markup. */
export const EMAIL_PLACEHOLDER = `${SITE.author.email.user} [at] ${SITE.author.email.domain}`;

/** Token in legal copy (messages/<locale>/legal.json) where the address goes. */
export const EMAIL_TOKEN = "{email}";
