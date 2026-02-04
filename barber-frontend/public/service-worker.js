/**
 * Service Worker for Treservi PWA
 * 
 * Handles:
 * - Offline caching (network-first strategy for HTML, cache-first for assets)
 * - Background sync
 * 
 * Compatible with iOS 16.4+, Android, and Desktop browsers
 */

const CACHE_NAME = 'treservi-v3';
const OFFLINE_URL = '/offline.html';

// Resources to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache failed:', error);
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
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
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// ============================================================================
// FETCH EVENT - Caching Strategy
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
        // Update cache in background
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
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
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
      // Return current subscription status
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
    
    // Fetch pending appointment updates from cache
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
      console.log('[ServiceWorker] Appointments synced successfully');
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

console.log('[ServiceWorker] Script loaded - v3');
