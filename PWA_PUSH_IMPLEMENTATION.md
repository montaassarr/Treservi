# Complete PWA Push Notification Implementation Guide
## Reservi Barber Shop - iOS & Web

Based on industry best practices and YouTube tutorials, this guide covers the complete implementation of push notifications for Progressive Web Apps.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Service Worker Setup](#service-worker-setup)
3. [Frontend Registration](#frontend-registration)
4. [VAPID Keys](#vapid-keys)
5. [Subscription Management](#subscription-management)
6. [Server-Side Push](#server-side-push)
7. [iOS Web Push Specifics](#ios-web-push-specifics)
8. [Testing & Debugging](#testing--debugging)

---

## Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Application                        │
│  - React/Vue.js Components                                 │
│  - Service Worker Registration                             │
│  - Push Permission Requests                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Service Worker (Background)                    │
│  - Listen for push events                                  │
│  - Display notifications                                  │
│  - Handle notification clicks                             │
│  - Cache management                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│          Browser Push Service (System Level)                │
│  - Apple Push Service (iOS Safari)                        │
│  - Google Cloud Messaging (Android Chrome)                │
│  - Firefox Push Service                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Server                             │
│  - Database (Supabase)                                    │
│  - Edge Functions                                         │
│  - VAPID Key Management                                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Technologies

- **Web Push API**: Browser standard for push notification registration
- **Service Worker**: Background process that handles push events
- **VAPID (Voluntary Application Server Identification)**: Authentication for push services
- **Supabase Edge Functions**: Serverless backend for sending pushes
- **Supabase Database**: Stores subscription endpoints

---

## Service Worker Setup

### 1. Create `public/service-worker.js`

```javascript
// Service Worker - Handles push notifications
const CACHE_NAME = 'reservi-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/icon-192.png',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Cache add error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) {
          return caches.match(event.request);
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// PUSH EVENT - Main handler for incoming notifications
self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'New Appointment',
    body: 'You have a new booking',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'appointment-notification',
    requireInteraction: false,
    data: {
      url: '/',
      appointmentId: null
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  // Update badge (unread count)
  if (notificationData.badge && typeof notificationData.badge === 'number') {
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data
    });
  } else {
    self.registration.showNotification(notificationData.title, notificationData);
  }

  event.waitUntil(Promise.resolve());
});

// NOTIFICATION CLICK - User clicked the notification
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  // Look for existing window
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// MESSAGE LISTENER - Receive messages from app
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'UPDATE_BADGE') {
    // Handle badge updates
    const badge = event.data.badge || 0;
    console.log('Badge update:', badge);
  }
});

console.log('Service Worker loaded');
```

### 2. Service Worker Cache Strategy

- **HTML/Index**: Network-first (always get latest)
- **CSS/JS**: Cache-first with network fallback
- **Images**: Cache-first with network fallback
- **API calls**: Network-only (don't cache)

---

## Frontend Registration

### 1. Service Worker Registration (`src/hooks/usePushNotifications.ts`)

```typescript
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      { scope: '/' }
    );
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}
```

### 2. Push Notification Hook

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  // Check if Web Push is available and user has granted permission
  function hasWebPush(): boolean {
    if (typeof window === 'undefined') return false
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  // Request notification permission
  async function requestPermission(): Promise<NotificationPermission> {
    if (!hasWebPush()) {
      throw new Error('Web Push not supported')
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('User denied notification permission')
    }
    return permission
  }

  // Subscribe to push notifications
  async function subscribeToPush() {
    try {
      // Step 1: Request permission
      await requestPermission()

      // Step 2: Register service worker
      const registration = await navigator.serviceWorker.ready

      // Step 3: Subscribe with VAPID public key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_PUBLIC_VAPID_KEY
        )
      })

      // Step 4: Save subscription to database
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const subscriptionData = {
        user_id: user.user.id,
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
        user_agent: navigator.userAgent
      }

      // Upsert subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          [subscriptionData],
          { onConflict: 'endpoint' }
        )

      if (error) throw error

      setSubscription(subscription)
      setSubscribed(true)
      console.log('Push subscription created:', subscription.endpoint)

    } catch (error) {
      console.error('Failed to subscribe to push:', error)
      throw error
    }
  }

  // Unsubscribe from push notifications
  async function unsubscribeToPush() {
    try {
      if (!subscription) return

      await subscription.unsubscribe()

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint)

      setSubscription(null)
      setSubscribed(false)
      console.log('Unsubscribed from push')

    } catch (error) {
      console.error('Failed to unsubscribe:', error)
    }
  }

  // Check subscription status on mount
  useEffect(() => {
    if (!hasWebPush()) return

    navigator.serviceWorker.ready.then(async registration => {
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        setSubscription(sub)
        setSubscribed(true)
      }
    })
  }, [])

  return {
    subscribed,
    subscription,
    subscribeToPush,
    unsubscribeToPush,
    hasWebPush: hasWebPush()
  }
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
```

### 3. UI Component for Push Subscription

```typescript
import { usePushNotifications } from '../hooks/usePushNotifications'

export function NotificationSettings() {
  const { subscribed, hasWebPush, subscribeToPush, unsubscribeToPush } = usePushNotifications()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (subscribed) {
        await unsubscribeToPush()
      } else {
        await subscribeToPush()
      }
    } catch (error) {
      console.error('Push notification error:', error)
      alert('Failed to update notification settings')
    } finally {
      setLoading(false)
    }
  }

  if (!hasWebPush) {
    return <p>Push notifications not supported on this device</p>
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 rounded ${
        subscribed ? 'bg-red-500' : 'bg-green-500'
      } text-white`}
    >
      {loading ? 'Loading...' : subscribed ? 'Disable Notifications' : 'Enable Notifications'}
    </button>
  )
}
```

---

## VAPID Keys

### What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are an asymmetric keypair (public/private) that:
- **Public Key**: Sent to browser, used to validate subscription requests
- **Private Key**: Kept secret on server, used to sign authorization tokens

### Generation

Using `web-push` CLI:

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key: BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA
Private Key: H5pOuWncwjpQZfs_fCRagPS0yU51ZWJ06HyeUP7JEPY
```

### Storage

- **Public Key**: Store in `.env.local` (frontend) and app config
- **Private Key**: Store in Supabase Secrets (NOT in code)

```env
# .env.local
VITE_PUBLIC_VAPID_KEY=BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA

# Supabase Secret (set via dashboard)
SUPABASE_SECRET_VAPID_PRIVATE_KEY=REDACTED
```

---

## Subscription Management

### Database Schema

```sql
create table push_subscriptions (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users not null,
  endpoint text not null unique,
  p256dh text not null,        -- Client public key
  auth text not null,           -- Authentication token
  user_agent text,              -- Browser/device info
  created_at timestamp default now(),
  last_used_at timestamp default now()
);

-- Enable RLS
alter table push_subscriptions enable row level security;

-- Policies
create policy "Users can manage their own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read for sending pushes
grant select on push_subscriptions to service_role;
```

### REST API Upsert

```typescript
const { error } = await supabase
  .from('push_subscriptions')
  .upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: base64Keys.p256dh,
    auth: base64Keys.auth,
    user_agent: navigator.userAgent
  }, {
    onConflict: 'endpoint'
  })
```

---

## Server-Side Push

### Edge Function (`supabase/functions/push-notification/index.ts`)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = "BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA"
const VAPID_PRIVATE_KEY = REDACTED('VAPID_PRIVATE_KEY') || "H5pOuWncwjpQZfs_fCRagPS0yU51ZWJ06HyeUP7JEPY"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get payload from request
    const { record } = await req.json()

    // Find affected users
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')

    // Send to each subscription
    for (const sub of subscriptions || []) {
      const notification = {
        title: 'New Appointment',
        body: `Booking from ${record.customer_name}`,
        data: { appointmentId: record.id }
      }

      // Generate VAPID token
      const token = await generateVAPIDToken(VAPID_PRIVATE_KEY)

      // Send notification
      await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `vapid t=${token},pk=${VAPID_PUBLIC_KEY}`
        },
        body: JSON.stringify(notification)
      })
    }

    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

async function generateVAPIDToken(privateKey: string): Promise<string> {
  // JWT signing implementation
  // Returns format: "header.payload.signature"
  // Details in production implementation
}
```

### Database Trigger

```sql
create or replace function notify_new_appointment()
returns trigger as $$
begin
  perform public.http_post(
    'https://czvsgtvienmchudyzqpk.supabase.co/functions/v1/push-notification',
    jsonb_build_object('record', row_to_json(new))::text,
    'application/json'
  );
  return new;
exception when others then
  raise warning 'Push failed: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_appointment_insert
  after insert on appointments
  for each row
  execute function notify_new_appointment();
```

---

## iOS Web Push Specifics

### iOS Safari Limitations & Solutions

| Feature | iOS 16.4+ | Notes |
|---------|-----------|-------|
| Web Push API | ✅ Yes | Must be PWA or home screen web app |
| Background push | ⚠️ Limited | Only when app running or active |
| Foreground push | ✅ Yes | Reliable while app is open |
| Badge numbers | ✅ Yes | Shows unread count |
| Action buttons | ❌ No | Not supported on iOS |

### PWA Installation (iOS)

1. User opens app in Safari
2. Taps Share > Add to Home Screen
3. App installed as standalone PWA
4. Web Push notifications become available

### Configuration (`public/manifest.json`)

```json
{
  "name": "Reservi Barber Shop",
  "short_name": "Reservi",
  "description": "Barber shop appointment booking",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Reservi Barber Shop',
        // ... manifest config
      }
    })
  ]
})
```

---

## Testing & Debugging

### 1. Verify Service Worker

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('SW registered:', reg.scope)
    console.log('Active:', reg.active)
  })
})
```

### 2. Test Push Subscription

```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Current subscription:', sub)
  })
})
```

### 3. Manual Push Test

```bash
# Using curl with service role key
curl -X POST "https://czvsgtvienmchudyzqpk.supabase.co/functions/v1/push-notification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{
    "record": {
      "id": "test-123",
      "salon_id": "salon-uuid",
      "customer_name": "Test Customer"
    }
  }'
```

### 4. Browser DevTools

- **Application tab**: View service worker status
- **Application → Manifest**: Check PWA configuration
- **Console**: Monitor push events and errors
- **Network**: Monitor fetch requests

### 5. iOS Testing

1. Install PWA on home screen
2. Safari DevTools → Console tab
3. Look for "Push event received"
4. Check if notification appears

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Service Worker not registered" | Registration failed | Check browser console for errors |
| "Push not available" | Browser doesn't support | Use feature detection |
| "Permission denied" | User rejected | Show education banner |
| "Push fails with 401" | Invalid VAPID token | Regenerate and verify keys |
| "No notification appears" | SW not active | Check service worker status |
| "iOS Safari no push" | Not installed as PWA | Add to Home Screen first |

---

## Deployment Checklist

- [ ] VAPID keys generated and stored securely
- [ ] Service worker deployed to public folder
- [ ] Frontend environment variables set
- [ ] Edge function deployed and tested
- [ ] Database subscriptions table created
- [ ] Notification trigger set up
- [ ] iOS PWA installable
- [ ] Push tested in all target browsers
- [ ] Error handling and logging in place
- [ ] User education/onboarding done

---

## Current Implementation Status

### ✅ Completed
- Service Worker with push event handling
- Frontend subscription UI
- Database subscription storage
- Edge function with VAPID token generation
- Database trigger for automatic push
- iOS Web Push enabled for iOS 16.4+

### 🟡 In Progress
- VAPID token signing (crypto implementation)
- Payload encryption (RFC 8188)
- Full end-to-end delivery testing

### ❌ TODO
- Complete AESGCM encryption for Web Push spec compliance
- Production error handling and retries
- Analytics and delivery tracking
- User notification preferences

---

## Resources

- [Web Push Protocol (RFC 8030)](https://datatracker.ietf.org/doc/html/rfc8030)
- [Message Encryption (RFC 8188)](https://datatracker.ietf.org/doc/html/rfc8188)
- [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid)

