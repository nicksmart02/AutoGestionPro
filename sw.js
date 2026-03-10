// AutoGarage Pro — Service Worker v2.0
const CACHE_NAME = 'ag-pro-v2';
const STATIC_ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ne pas intercepter les requêtes Supabase ou externes
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('fonts.') || url.hostname.includes('cdn.')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre en cache les ressources locales
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request).then(r => r || new Response('Offline', { status: 503 })))
  );
});
