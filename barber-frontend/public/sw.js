const CACHE_NAME = 'treservi-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log('Some assets failed to cache during install');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // API calls: network-first strategy with cache fallback
  if (url.pathname.includes('/api') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Network failed, return cached version or offline page
          return caches.match(event.request).then((cached) => {
            return cached || new Response('Offline - please try again when connection is restored', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        })
    );
  } else {
    // Static assets: cache-first strategy
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});

/**
 * Handle app launch from home screen or deep link
 * Restores user to their last viewed salon/page (like Facebook)
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'RESTORE_STATE') {
    // Notify all clients that state restoration is needed
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'STATE_RESTORED',
          data: event.data.state,
        });
      });
    });
  }
});
