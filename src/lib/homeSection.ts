/**
 * Cross-route jump to a home-page section.
 *
 * A plain `/#contact` link lets the browser resolve the hash while the
 * home page is still settling: GSAP pins the case-study section a beat
 * later and its pin-spacer shifts every section below it, so the visitor
 * lands one section off. Instead the caller stashes the target id here,
 * navigates to the bare home route, and <ScrollToOnLoad /> scrolls once
 * the pin extent is live.
 *
 * Returns the locale-relative destination for the router: `/` when the
 * target is stashed, `/#<id>` when site storage is blocked (private
 * windows) so the URL carries it instead. ScrollToOnLoad reads both.
 */

export const SCROLL_TO_ON_LOAD_KEY = "scrollToOnLoad";

export function stashHomeSection(target: string): string {
  try {
    sessionStorage.setItem(SCROLL_TO_ON_LOAD_KEY, target);
    return "/";
  } catch {
    return `/#${target}`;
  }
}
