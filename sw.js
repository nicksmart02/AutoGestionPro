const CACHE = 'agp-v3';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('brevo.com')) return;
  if (url.pathname.startsWith('/_vercel/')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.destination === 'document') return caches.match('/');
        })
      )
  );
});

self.addEventListener('sync', e => {
  if (e.tag === 'sync-data') {
    e.waitUntil(self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'SYNC_READY' }))
    ));
  }
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'refresh-data') {
    e.waitUntil(caches.open(CACHE).then(c => c.add('/')));
  }
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(data.title || 'AutoGarage Pro', {
    body: data.body || 'Nouvelle notification',
    icon: '/manifest.json',
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data.url || '/'));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
