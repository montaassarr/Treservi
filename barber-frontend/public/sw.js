const CACHE_NAME = 'treservi-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Navigation routes that should return index.html (SPA routing)
const SPA_ROUTES = ['/book', '/dashboard', '/login', '/settings', '/appointments', '/staff', '/services'];

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
  
  // Handle SPA navigation - return index.html for app routes
  if (event.request.mode === 'navigate') {
    // Check if it's an app route (SPA navigation)
    const isAppRoute = SPA_ROUTES.some(route => url.pathname.startsWith(route)) || url.pathname === '/';
    
    if (isAppRoute) {
      event.respondWith(
        fetch(event.request)
          .catch(() => caches.match('/index.html'))
          .then(response => response || caches.match('/index.html'))
      );
      return;
    }
  }
  
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
 * Push Notification handler
 */
self.addEventListener('push', (event) => {
  let data = { title: 'Treservi', body: 'New notification', icon: '/icon-192.png' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    sound: '/notification.mp3',
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ],
    requireInteraction: true,
    tag: data.tag || 'treservi-notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
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
  
  // Skip waiting when requested
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
