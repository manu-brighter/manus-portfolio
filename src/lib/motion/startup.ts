/** Runs before page content is parsed. Missing/slow application scripts fall
 * back to readable static content instead of leaving headings hidden. */
export const MOTION_STARTUP_SCRIPT = `(() => {
  const root = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.dataset.motion = 'enabled';
  if (/^\\/(de|en|fr|it)\\/?$/.test(location.pathname)) {
    root.dataset.intro = 'waiting';
    const prepareWindow = () => {
      if (root.dataset.intro !== 'waiting') return;
      const mark = document.querySelector('[data-testid="loader-ink-mark"]');
      if (!mark || window.getComputedStyle(mark).transform === 'none') {
        window.requestAnimationFrame(prepareWindow);
        return;
      }
      // The first frame paints the ink seed; the next starts its opening.
      window.requestAnimationFrame(() => {
        if (root.dataset.intro === 'waiting') root.dataset.intro = 'running';
      });
    };
    window.requestAnimationFrame(prepareWindow);
  }
  window.setTimeout(() => {
    // Bound the paint wait even when scripts are ready but styles are not.
    if (root.dataset.intro === 'waiting') root.dataset.intro = 'done';
    if (root.dataset.motionReady === 'true') return;
    root.dataset.motion = 'static';
    root.dataset.intro = 'done';
  }, 2000);
})();`;
