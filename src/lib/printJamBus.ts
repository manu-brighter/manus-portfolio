/**
 * Print-jam bus — fire-and-forget trigger for the Fehldruck easter
 * egg. Same tiny pub/sub shape as fluidBus: the console menu (and any
 * future trigger) dispatches without holding a ref to the overlay
 * component mounted in the root layout.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToPrintJam(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerPrintJam(): void {
  for (const l of listeners) l();
}
