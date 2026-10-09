const CACHE_NAME = 'smi-bmi-v5';
const LOCAL_FILES = [
  './',
  './index.html',
  './app.js',
  './who_data_2.js',
  './tailwind.css',
  './chart.umd.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network first (so updates always show up when online), cache as the offline fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(res => {
      if (res && res.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() =>
      caches.match(event.request, { ignoreSearch: true })
        .then(r => r || caches.match('./index.html'))
    )
  );
});
