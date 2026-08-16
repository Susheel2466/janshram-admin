import { useCallback, useEffect, useRef, useState } from 'react';

// How often a screen re-reads its data on its own. The console is a live view of
// a marketplace other people are changing — bookings land, bids arrive, tickets
// get raised — and an admin acting on a stale row is the failure this prevents.
export const DEFAULT_REFRESH_MS = 30_000;

// Minimal data-fetching hook: runs an async fn, tracks loading/error, and
// re-runs when `deps` change or `refetch()` is called.
//
// It also revalidates on its own — on a timer, and whenever the tab regains
// focus. Those background reads are deliberately *silent*: they leave `loading`
// alone and keep the previous data on failure, because a screen that drops to a
// skeleton every 30 seconds, or blanks out over one flaky request, is worse than
// one that is briefly stale. Screens that want the spinner can read `refreshing`.
//
// Pass `{ refreshMs: 0 }` to opt a screen out — needed wherever fetched data is
// copied into editable state, since a poll landing mid-edit would overwrite what
// the admin is typing.
export function useApi<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  { refreshMs = DEFAULT_REFRESH_MS }: { refreshMs?: number } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoFn = useCallback(fn, deps);

  // Shared by the foreground load and the background poll, so a slow request
  // can't have a timer stack a second one behind it.
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    memoFn()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e as Error))
      .finally(() => {
        inFlight.current = false;
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [memoFn, nonce]);

  // Held in a ref so the timer and the focus listener always call the current
  // query without being torn down and rebuilt on every render.
  const revalidate = useRef(() => {});
  revalidate.current = () => {
    // A hidden tab is a tab nobody is reading. Skipping keeps background tabs
    // from polling the API for hours.
    if (inFlight.current || document.hidden) return;
    inFlight.current = true;
    setRefreshing(true);
    memoFn()
      .then((d) => mounted.current && setData(d))
      .catch(() => {
        /* keep the last good data; the next tick will try again */
      })
      .finally(() => {
        inFlight.current = false;
        if (mounted.current) setRefreshing(false);
      });
  };

  useEffect(() => {
    if (!refreshMs) return;
    const tick = () => revalidate.current();
    const onFocus = () => {
      if (document.visibilityState === 'visible') revalidate.current();
    };
    const timer = setInterval(tick, refreshMs);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refreshMs]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, refreshing, error, refetch, setData };
}
