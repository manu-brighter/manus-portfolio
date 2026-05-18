/**
 * Loader-complete session bus — typed pub/sub for the global "loader
 * has finished" signal.
 *
 * Replaces the prior `window.dispatchEvent(new CustomEvent("loader-
 * complete"))` arrangement. Same shape as `fluidBus.ts`: producers call
 * `markLoaderComplete()` once, consumers subscribe with a callback that
 * either fires immediately (if the loader already finished earlier in
 * the session) or queues until completion. Listeners are one-shot — the
 * subscriber set is cleared after firing so a single `complete` event
 * can't fire the same callback twice (matches the `{ once: true }`
 * semantics every consumer used with the old CustomEvent).
 *
 * Module-level state survives React re-mounts inside the same JS realm
 * (locale switches re-mount the layout subtree, but the module instance
 * is preserved). Full page reload resets it — which is what we want,
 * because reload IS the user asking for the loader to play again.
 *
 * The `isLoaderComplete()` accessor is the synchronous read path used
 * by consumers that need to choose between "subscribe and wait" or "go
 * now" inside a mount effect (SceneProvider, FluidSim, OverprintReveal,
 * FadeIn).
 */

let complete = false;
const listeners = new Set<() => void>();

export function isLoaderComplete(): boolean {
  return complete;
}

/** Mark the loader as complete and fire every queued listener exactly
 *  once. Idempotent — repeated calls are no-ops, matching the prior
 *  `loaderFired` boolean guard in `Loader.tsx`. Each listener call is
 *  wrapped in try/catch so a single throwing subscriber doesn't block
 *  subsequent listeners from receiving the signal (which would otherwise
 *  be unrecoverable — `complete` is already set, so re-subscribers fire
 *  sync but the queued ones are gone). */
export function markLoaderComplete(): void {
  if (complete) return;
  complete = true;
  for (const fn of listeners) {
    try {
      fn();
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: dev-time observability for a defensive guard
      console.error("[loaderSession] subscriber threw — others continue", err);
    }
  }
  listeners.clear();
}

/**
 * Register a callback to fire when the loader completes. If the loader
 * already completed earlier in this session, the callback is invoked
 * immediately (before the function returns) so caller effects don't
 * need a separate `isLoaderComplete()` branch.
 *
 * Returns an unsubscribe function that's safe to call multiple times —
 * the listener is removed from the set on first call, becomes a no-op
 * after that.
 */
export function subscribeToLoaderComplete(fn: () => void): () => void {
  if (complete) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
