const CACHE = 'challenge-room-v5';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const SDK = 'https://www.gstatic.com/firebasejs/';
const SLOW_MS = 3000;

// cache: 'reload' skips the HTTP cache so a new worker never installs stale files.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (key, res) => caches.open(CACHE).then(c => c.put(key, res));
const cacheable = r => r.status === 200 && (r.type === 'basic' || r.type === 'cors');

self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET') return;

  // Firebase SDK URLs carry the version, so their content never changes: cache first lets the app boot offline.
  if (u.href.startsWith(SDK)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (cacheable(r)) e.waitUntil(put(req, r.clone())); return r; })));
    return;
  }
  // Firestore, auth and font requests are left to the browser.
  if (u.origin !== location.origin) return;

  // Network first for our own files so updates show up; cache is the offline fallback.
  // Every page URL (?c=CODE, ?demo, ?login) is the same app shell, so it is stored once under index.html.
  const shell = req.mode === 'navigate' && /\/(index\.html)?$/.test(u.pathname);
  const key = shell ? 'index.html' : req;
  const net = fetch(req, { cache: 'no-cache' });
  // Registered before respondWith reads the body, so the clone is always taken first.
  e.waitUntil(net.then(r => cacheable(r) && put(key, r.clone())).catch(() => {}));
  const cached = () => caches.match(key);
  // On a slow connection, serve the cached copy after SLOW_MS instead of hanging; the network copy still refreshes the cache.
  const slow = new Promise(res => setTimeout(res, SLOW_MS));
  e.respondWith(
    Promise.race([net, slow.then(cached)])
      .catch(cached)
      .then(r => r || cached().then(c => c || net))
  );
});
