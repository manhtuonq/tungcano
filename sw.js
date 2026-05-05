/* Offline cache — bật sau khi user đã vào web ít nhất 1 lần có mạng */
const CACHE = 'tvh-bill-static-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        const urls = ['/', './', '/index.html', './index.html'];
        await Promise.all(
          urls.map((u) =>
            cache.add(new Request(u, { cache: 'reload' })).catch(() => null)
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => {
            try {
              cache.put(request, copy);
            } catch (_) {}
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          const isNav =
            request.mode === 'navigate' ||
            (request.headers.get('accept') || '').includes('text/html');
          if (isNav) {
            return caches.match('/index.html').then((page) =>
              page || caches.match('./index.html')
            );
          }
          return cached;
        })
      )
  );
});
