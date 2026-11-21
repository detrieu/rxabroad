'use client';

import { useEffect, useState } from 'react';

// Files the travel card page needs to render on its own: build chunks, fonts and icons.
const STATIC_FILE = /^\/(_next\/static\/|icons\/)/;

/**
 * Registers public/sw.js and hands it the files this page loaded, so the card opens without a connection.
 * True once the page is saved for offline use.
 */
export function useOfflineReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    let cancelled = false;
    const markIfSaved = () =>
      caches.match(location.pathname).then((hit) => !cancelled && hit && setReady(true)).catch(() => {});
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'cached') markIfSaved();
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    markIfSaved();

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const files = performance
          .getEntriesByType('resource')
          .map((r) => new URL(r.name))
          .filter((u) => u.origin === location.origin && STATIC_FILE.test(u.pathname))
          .map((u) => u.pathname + u.search);
        reg.active?.postMessage({ type: 'cache-urls', urls: [location.pathname, ...files] });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  return ready;
}
