const CACHE = 'challenge-room-v17';
const APP_ROOT = new URL('./', self.registration.scope);
const SHELL = [
  new URL('./', self.registration.scope).href,
  new URL('./index.html', self.registration.scope).href,
  new URL('./manifest.json', self.registration.scope).href,
  new URL('./icon.svg', self.registration.scope).href,
  new URL('./icon-192.png', self.registration.scope).href,
  new URL('./icon-512.png', self.registration.scope).href
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('challenge-room-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first for app files. Never answer a manifest or icon request with index.html.
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const index = await caches.match(new URL('./index.html', self.registration.scope).href);
        if (index) return index;
      }
      return new Response('Offline and this resource is not cached.', { status: 503, statusText: 'Offline' });
    }
  })());
});
