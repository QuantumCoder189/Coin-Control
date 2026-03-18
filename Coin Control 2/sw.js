/* ============================================================
   COIN CONTROL — sw.js (Service Worker)
   Enables offline mode by caching all app files locally.
   When there's no internet, the cached version loads instead.
   ============================================================ */

// Cache name — update the version number when you change any files
// (this forces the old cache to be replaced with fresh files)
const CACHE_NAME = 'coincontrol-v1';

// All the files we want to cache for offline use
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // Chart.js from CDN — cached so charts work offline too
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Manrope:wght@400;500;600&display=swap',
];

/* ---------- INSTALL ----------
   Fires once when the service worker is first registered.
   We open a cache and store all our app files inside it. */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app files for offline use...');
      // addAll fetches every file and stores it — if any fail, install fails
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Take over immediately without waiting for old SW to finish
  self.skipWaiting();
});

/* ---------- ACTIVATE ----------
   Fires after install. We clean up any old caches here. */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // find old caches
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

/* ---------- FETCH ----------
   Intercepts every network request the app makes.
   Strategy: Cache-first — serve from cache if available,
   otherwise fetch from network and cache the response. */
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // If we have it cached, return it immediately (works offline)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from the network
      return fetch(event.request).then(networkResponse => {
        // Don't cache bad responses or non-basic requests
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type === 'opaque'
        ) {
          return networkResponse;
        }

        // Clone the response — it can only be consumed once
        const responseToCache = networkResponse.clone();

        // Store the new file in cache for next time
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If both cache and network fail (truly offline + uncached),
        // return the main index.html as a fallback
        return caches.match('./index.html');
      });
    })
  );
});
