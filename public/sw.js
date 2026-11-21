// Keeps the travel card (/my-meds) working without a connection.
// The page tells this worker which files it loaded (see src/lib/offline.ts); those and the page itself are
// cached, and served when the network is unreachable. Everything else goes to the network untouched.

const CACHE = 'rxabroad-card-v1';
const CARD = '/my-meds';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The card's own files, as the page lists them. Replaces what was cached before, so old builds don't pile up.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-urls' || !Array.isArray(event.data.urls)) return;
  const urls = [...new Set([CARD, ...event.data.urls])].filter((u) => new URL(u, self.location.origin).origin === self.location.origin);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const results = await Promise.allSettled(urls.map((u) => cache.add(u)));
      const keep = new Set(urls.map((u) => new URL(u, self.location.origin).href));
      for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
      if (results[0].status === 'fulfilled') event.source?.postMessage({ type: 'cached' });
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The card page: network first, so it stays current; the saved copy when offline.
  if (req.mode === 'navigate') {
    if (url.pathname !== CARD) return;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(CARD, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(CARD)) ?? Response.error()),
    );
    return;
  }

  // Build files never change under the same name, so a saved copy is always good. Files loaded after the
  // page sent its list (chunks loaded on demand) are saved as they arrive.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
