// Service Worker for Treservi PWA
// Handles offline caching, badge updates, and push notifications

const CACHE_NAME = 'treservi-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// ============================================================================
// INSTALL EVENT - Cache essential resources
// ============================================================================

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

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================

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

// ============================================================================
// FETCH EVENT - Efficient caching strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension, Supabase API, and other API calls
  if (
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/functions/')
  ) {
    return;
  }

  // Static assets: Cache-first with background update
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Navigation requests: Network-first with offline fallback
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

// ============================================================================
// PUSH EVENT - Handle incoming push notifications
// ============================================================================

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? JSON.parse(event.data.text()) : {};
  } catch (error) {
    console.error('[ServiceWorker] Failed to parse push payload:', error);
    payload = {};
  }

  console.log('[ServiceWorker] 🔔 Push received:', payload);

  const title = payload.title || payload.message || 'New Appointment';
  const body = payload.body || 'You have a new appointment';
  const icon = payload.icon || '/icon-192.png';
  const badge = payload.badge || '/badge-72.png';
  const url = payload?.data?.url || payload?.url || '/dashboard';
  const appointmentId = payload?.data?.appointmentId || null;
  const tag = payload.tag || 'appointment-notification';
  
  const actions = payload.actions || [
    { action: 'open', title: 'Open' },
    { action: 'dismiss', title: 'Dismiss' }
  ];

  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction: true,
    actions,
    data: { url, appointmentId, playSound: true },
    vibrate: [200, 100, 200],
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[ServiceWorker] ✅ Notification shown:', title);
        
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PLAY_NOTIFICATION_SOUND',
              sound: '/notification.mp3'
            });
          });
        });
      })
      .catch((error) => {
        console.error('[ServiceWorker] ❌ Failed to show notification:', error);
      })
  );
});

// ============================================================================
// NOTIFICATION CLICK - Handle user clicking on notification
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            if (urlToOpen && !client.url.endsWith(urlToOpen)) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================================================
// NOTIFICATION CLOSE - Handle notification being dismissed
// ============================================================================

self.addEventListener('notificationclose', () => {
  return;
});

// ============================================================================
// MESSAGE EVENT - Handle messages from main thread
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'UPDATE_BADGE':
      if ('setAppBadge' in navigator) {
        const count = data?.count || 0;
        if (count > 0) {
          navigator.setAppBadge(count);
        } else {
          navigator.clearAppBadge();
        }
      }
      break;
      
    case 'CLEAR_BADGE':
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge();
      }
      break;
      
    case 'GET_SUBSCRIPTION':
      self.registration.pushManager.getSubscription()
        .then((subscription) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
              subscribed: !!subscription,
              endpoint: subscription?.endpoint
            });
          }
        });
      break;
      
    default:
  }
});

// ============================================================================
// BACKGROUND SYNC - Handle offline actions
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  try {
    console.log('[ServiceWorker] Syncing appointments...');
    
    const cache = await caches.open(CACHE_NAME);
    const pendingUpdates = await cache.match('/api/pending-updates');

    if (pendingUpdates) {
      const data = await pendingUpdates.json();

      for (const update of data.updates) {
        await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: JSON.stringify(update.body)
        });
      }

      await cache.delete('/api/pending-updates');
      console.log('[ServiceWorker] Appointments synced successfully');
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

// ============================================================================
// PUSH SUBSCRIPTION CHANGE - Handle subscription expiry/changes
// ============================================================================

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    })
    .then((newSubscription) => {
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SUBSCRIPTION_CHANGED',
            subscription: newSubscription.toJSON()
          });
        });
      });
    })
    .catch(() => {
      return;
    })
  );
});

console.log('[ServiceWorker] Script loaded - v1');
