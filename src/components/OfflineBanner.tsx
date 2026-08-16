import { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi, RotateCw } from 'lucide-react';
import { isOnline, onNetworkChange } from '../lib/network';

/**
 * A bar across the top of the console while the API is unreachable, and a brief
 * confirmation when it comes back. Mounted at the app root so it also covers the
 * login screen, where a failed request is otherwise indistinguishable from
 * wrong credentials.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(isOnline);
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    setOnline(isOnline());
    return onNetworkChange(setOnline);
  }, []);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowRestored(false);
      return;
    }
    if (!wasOffline.current) return; // nothing to announce on a normal start
    wasOffline.current = false;
    setShowRestored(true);
    const timer = setTimeout(() => setShowRestored(false), 2500);
    return () => clearTimeout(timer);
  }, [online]);

  if (online && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-white text-sm flex items-center justify-center gap-2"
      style={{ background: online ? '#16a34a' : '#dc2626' }}
    >
      {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
      <span className="font-medium">
        {online ? 'Back online' : 'No internet connection — the console can’t reach the server.'}
      </span>
      {!online && (
        <button
          onClick={() => window.location.reload()}
          className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold"
        >
          <RotateCw className="size-3" />
          Retry
        </button>
      )}
    </div>
  );
}
