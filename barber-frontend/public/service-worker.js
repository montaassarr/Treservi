// Service Worker for Treservi PWA
// Handles offline caching, badge updates, and push notifications

const CACHE_NAME = 'treservi-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html', // Create a simple offline fallback page
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
// Fetch event - Efficient caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORE: Non-GET, API calls, Chrome Extensions, Supabase
  if (
    event.request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 2. CACHE-FIRST for Static Assets (Images, Fonts, Scripts)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Don't cache bad responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
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
    return;
  }

  // 3. NETWORK-FIRST for HTML/Navigation (ensures fresh content)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Fallback for text-only payloads
    data = { body: event.data ? event.data.text() : 'You have a new appointment!' };
  }

  const title = data.title || 'New Appointment';
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192.png'
      }
    ]
  };

  // Update App Badge count from payload if present
  if (data.badge && 'setAppBadge' in navigator) {
    const badgeCount = parseInt(data.badge);
    if (!isNaN(badgeCount)) {
      navigator.setAppBadge(badgeCount).catch(err => console.error('Failed to set badge', err));
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window for this app open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If url matches or just bringing app to foreground
        if ('focus' in client) {
          if (client.url.includes(urlToOpen)) {
            return client.focus();
          }
          // Optional: navigate client to url if different?
          // For now, just focusing is good, but if we want to navigate:
          // client.navigate(urlToOpen);
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Badge API support - update badge count
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    const count = event.data.count || 0;

    // Set badge using Badge API
    if (self.navigator && self.navigator.setAppBadge) {
      if (count > 0) {
        self.navigator.setAppBadge(count);
      } else {
        self.navigator.clearAppBadge();
      }
    }
  }
});

// Background sync for appointment updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  try {
    // Fetch pending appointment updates
    const cache = await caches.open(CACHE_NAME);
    const pendingUpdates = await cache.match('/api/pending-updates');

    if (pendingUpdates) {
      const data = await pendingUpdates.json();

      // Send updates to server
      for (const update of data.updates) {
        await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: JSON.stringify(update.body)
        });
      }

      // Clear pending updates
      await cache.delete('/api/pending-updates');
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

console.log('[ServiceWorker] Loaded');
