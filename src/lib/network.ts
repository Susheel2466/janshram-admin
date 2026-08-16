// Whether the console can reach the API. Mirrors the app's lib/network.
//
// `navigator.onLine` only reports whether an interface is up, so it stays true
// on a captive-portal wifi or when the API itself is unreachable. Real request
// outcomes are the second, authoritative signal.
type Listener = (online: boolean) => void;

const listeners = new Set<Listener>();
let online = typeof navigator === 'undefined' || navigator.onLine !== false;

function set(next: boolean) {
  if (next === online) return;
  online = next;
  for (const listener of listeners) listener(online);
}

export const isOnline = () => online;

export function onNetworkChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A request reached the server — any status proves a route. */
export const reportRequestSucceeded = () => set(true);
/** A request never reached the server. */
export const reportRequestFailed = () => set(false);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => set(true));
  window.addEventListener('offline', () => set(false));
}

/** A fetch that never reached the server, as opposed to one we aborted. */
export function isNetworkFailure(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return false;
  return err instanceof TypeError;
}

export const OFFLINE_MESSAGE = 'No internet connection. Check your network and try again.';
