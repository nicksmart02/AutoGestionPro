const CACHE = 'autogaragepro-v3';
const OFFLINE_URL = '/';

const PRECACHE = [
  '/',
  '/manifest.json',
];

// Install — précache des ressources critiques
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activate — purge des anciens caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — stratégie Network First avec fallback Cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Ignorer les appels Supabase / API — toujours réseau
  if (url.hostname.includes('supabase.co') || url.hostname.includes('brevo.com')) return;

  // Ignorer Vercel analytics
  if (url.pathname.includes('/_vercel/')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Mettre en cache les réponses valides (HTML, JS, CSS, images)
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Fallback: retourner depuis le cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Fallback ultime: page principale depuis le cache
          if (e.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Message pour forcer le refresh
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
