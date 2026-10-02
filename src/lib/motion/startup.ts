/** Runs before page content is parsed. Missing/slow application scripts fall
 * back to readable static content instead of leaving headings hidden. */
export const MOTION_STARTUP_SCRIPT = `(() => {
  const root = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.dataset.motion = 'enabled';
  if (/^\\/(de|en|fr|it)\\/?$/.test(location.pathname)) root.dataset.intro = 'waiting';
  window.setTimeout(() => {
    if (root.dataset.motionReady === 'true') return;
    root.dataset.motion = 'static';
    root.dataset.intro = 'done';
  }, 2000);
})();`;
