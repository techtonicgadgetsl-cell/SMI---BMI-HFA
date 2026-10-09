const CACHE_NAME = 'smi-bmi-v4';
const LOCAL_FILES = [
  './',
  './index.html',
  './app.js',
  './who_data_2.js',
  './manifest.json'
];
const CDN_FILES = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(LOCAL_FILES);
      // CDN files: cache individually so one failure doesn't break install
      await Promise.all(CDN_FILES.map(url =>
        fetch(url, { mode: 'no-cors' })
          .then(res => cache.put(url, res))
          .catch(() => {})
      ));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;

  if (sameOrigin) {
    // Own files: network first (so updates show up), cache as offline fallback
    event.respondWith(
      fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // CDN files: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy)).catch(() => {});
        return res;
      });
    })
  );
});
