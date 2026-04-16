/**
 * Shared RAF loop — thin wrapper over gsap.ticker.
 *
 * Plan §8: GSAP + Lenis + R3F share one frame. We lean on gsap.ticker
 * (already battle-tested, handles visibilitychange pause natively,
 * exposes lagSmoothing) and expose a priority-sorted subscribe API so
 * consumer code does not import gsap.
 *
 * Priority slots (convention, not enforced):
 *   0    Lenis (scroll position must settle first)
 *   10   ScrollTrigger / scroll-dependent effects  (Phase 5)
 *   20   R3F useFrame / Canvas advance             (Phase 4)
 *   50   default
 *   100+ custom / late
 *
 * `gsap.ticker.lagSmoothing(0)` is set on bootstrap so that returning
 * from a backgrounded tab does not produce a time-jump for Lenis or
 * downstream animations.
 */

import gsap from "gsap";

export type TickFn = (deltaMs: number, elapsedMs: number) => void;

type Subscriber = {
  fn: TickFn;
  priority: number;
};

let subscribers: Subscriber[] = [];
let bootstrapped = false;
let prevMs = 0;

function tick(time: number): void {
  const elapsedMs = time * 1000;
  const deltaMs = prevMs === 0 ? 0 : elapsedMs - prevMs;
  prevMs = elapsedMs;
  for (const sub of subscribers) {
    sub.fn(deltaMs, elapsedMs);
  }
}

/**
 * Idempotent. Safe to call from every client component that needs the
 * ticker; only the first call installs the gsap.ticker handler.
 */
export function bootstrap(): void {
  if (bootstrapped) return;
  if (typeof window === "undefined") return;
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add(tick);
  bootstrapped = true;
}

/**
 * Remove the shared tick handler from gsap.ticker and reset module
 * state. Call from MotionProvider's cleanup so HMR and locale switches
 * don't leak a stale handler.
 */
export function teardown(): void {
  if (!bootstrapped) return;
  gsap.ticker.remove(tick);
  subscribers = [];
  bootstrapped = false;
  prevMs = 0;
}

/**
 * Register a per-frame callback. Returns an unsubscriber — always call it
 * in the effect cleanup to prevent leaks and double-ticking under Strict
 * Mode.
 *
 * Lower priority numbers tick earlier. Equal priorities preserve
 * insertion order.
 */
export function subscribe(fn: TickFn, priority = 50): () => void {
  if (!bootstrapped) bootstrap();
  const entry: Subscriber = { fn, priority };
  const insertAt = subscribers.findIndex((s) => s.priority > priority);
  if (insertAt === -1) subscribers.push(entry);
  else subscribers.splice(insertAt, 0, entry);
  return () => {
    subscribers = subscribers.filter((s) => s !== entry);
  };
}
