import { useEffect, useRef } from 'react';

const FLUSH_INTERVAL_MS = 60_000;
const BATCH_SIZE = 100;
const MAX_BYTES = 55_000;
type Entry = { type: 'client_navigation'; timestamp: string; method: string; url: string; path: string; query: string; user_agent: string; referer: string | null };

/** Pass your router's pathname + search. Mount once in the SPA root.
 * The initial document request is recorded at the edge; only changes are logged here.
 * Browser queues are best effort, bounded, and intentionally not persisted to disk.
 */
export function useAccessLog(location: string) {
  const queue = useRef<Entry[]>([]);
  const previous = useRef<string | null>(null);
  const sending = useRef(false);
  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    const flush = async (unloading = false) => {
      if (sending.current || !queue.current.length) return;
      const batch: Entry[] = [];
      for (const entry of queue.current.slice(0, BATCH_SIZE)) {
        if (new Blob([JSON.stringify([...batch, entry])]).size > MAX_BYTES) break;
        batch.push(entry);
      }
      if (!batch.length) { queue.current.shift(); return; }
      const body = JSON.stringify(batch);
      if (unloading && navigator.sendBeacon('/api/access-log', new Blob([body], { type: 'application/json' }))) {
        queue.current.splice(0, batch.length);
        return;
      }
      sending.current = true;
      queue.current.splice(0, batch.length);
      try {
        const response = await fetch('/api/access-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
        if (!response.ok) throw new Error('Delivery failed');
      } catch {
        queue.current = [...batch, ...queue.current].slice(0, 1000);
      } finally { sending.current = false; }
    };
    flushRef.current = () => { void flush(); };
    const interval = window.setInterval(() => { void flush(); }, FLUSH_INTERVAL_MS);
    const hidden = () => { if (document.visibilityState === 'hidden') void flush(true); };
    const pagehide = () => { void flush(true); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pagehide);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pagehide);
    };
  }, []);

  useEffect(() => {
    if (previous.current === location) return;
    const initial = previous.current === null;
    const referer = previous.current ? new URL(previous.current, window.location.origin).href : document.referrer || null;
    previous.current = location;
    if (initial) return;
    const url = new URL(location, window.location.origin);
    if (url.origin !== window.location.origin) return;
    queue.current.push({ type: 'client_navigation', timestamp: new Date().toISOString(), method: 'GET', url: url.href, path: url.pathname, query: url.search, user_agent: navigator.userAgent, referer });
    queue.current = queue.current.slice(-1000);
    if (queue.current.length >= BATCH_SIZE) flushRef.current();
  }, [location]);
}
