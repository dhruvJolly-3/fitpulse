/* FitPulse service worker: makes the app installable and keeps the shell
   loading on flaky mobile networks.
   - Page navigations: network first, cached index.html as offline fallback,
     so a new deploy is always picked up when online.
   - Hashed build assets (/static/*) and icons: cache first (they never change).
   - API calls and third-party requests are never cached. */
const CACHE = 'fitpulse-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          // clone before returning: the body can only be read once
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/static/') || /\.(png|svg|ico|json)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
