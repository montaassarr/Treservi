# Push Notification Architecture - Treservi PWA

## Overview

This document describes the push notification architecture for the Treservi PWA. The system supports:

- **iOS 16.4+** (when installed as PWA via "Add to Home Screen")
- **Android** (both browser and PWA)
- **Desktop browsers** (Chrome, Firefox, Safari, Edge)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser/PWA)                               │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────────┐    │
│  │   React App     │    │  pushService.ts │    │  service-worker.js   │    │
│  │                 │    │                 │    │                      │    │
│  │ useNotifications├───▶│ - detectPlatform├───▶│ - push event handler │    │
│  │ hook            │    │ - subscribeToPush│   │ - notificationclick  │    │
│  │                 │    │ - requestPermission│ │ - showNotification   │    │
│  │ NotificationPrompt│  │ - saveToBackend │    │ - badge updates      │    │
│  └─────────────────┘    └────────┬────────┘    └──────────▲───────────┘    │
│                                  │                         │                │
└──────────────────────────────────┼─────────────────────────┼────────────────┘
                                   │                         │
                                   │ 1. Save subscription    │ 6. Push delivered
                                   │                         │
┌──────────────────────────────────▼─────────────────────────┼────────────────┐
│                           BACKEND (Supabase)               │                │
│                                                            │                │
│  ┌─────────────────────┐    ┌─────────────────────────┐   │                │
│  │ push_subscriptions  │    │ send-push-notification  │   │                │
│  │ table               │◀───│ Edge Function           │   │                │
│  │                     │    │                         │   │                │
│  │ - user_id           │    │ - Fetch subscriptions   │   │                │
│  │ - endpoint          │    │ - Encrypt payload       │   │                │
│  │ - p256dh            │    │ - Generate VAPID JWT    │───┘                │
│  │ - auth              │    │ - Send to push service  │                    │
│  │ - salon_id          │    └───────────┬─────────────┘                    │
│  │ - platform          │                │                                   │
│  └─────────────────────┘                │ 5. POST encrypted payload        │
│                                         │                                   │
│  ┌─────────────────────┐                │                                   │
│  │ Database Triggers   │────────────────┘                                   │
│  │ (on new appointment)│                                                    │
│  └─────────────────────┘                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌──────────────────────────────────▼───────────────────────────────────────────┐
│                         PUSH SERVICES                                        │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ FCM (Chrome/    │  │ Mozilla Autopush│  │ Apple Web Push  │             │
│  │ Android)        │  │ (Firefox)       │  │ (Safari/iOS)    │             │
│  │                 │  │                 │  │                 │             │
│  │ fcm.googleapis.com│ │ updates.push.   │  │ web.push.apple.com│          │
│  └─────────────────┘  │ services.mozilla│  └─────────────────┘             │
│                       │ .com            │                                    │
│                       └─────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Flow Description

### 1. User Subscribes (Client-side)

```
User clicks "Enable Notifications"
         │
         ▼
┌─────────────────────────────┐
│ Check platform support      │
│ (iOS needs 16.4+ and PWA)   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Register Service Worker     │
│ (/service-worker.js)        │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Request Notification        │
│ Permission (user gesture!)  │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ pushManager.subscribe()     │
│ with VAPID applicationServerKey│
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Save subscription to        │
│ Supabase (endpoint, keys)   │
└─────────────────────────────┘
```

### 2. Server Sends Notification

```
New appointment created
         │
         ▼
┌─────────────────────────────┐
│ Database trigger calls      │
│ send-push-notification      │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Fetch subscriptions for     │
│ salon owner + assigned staff│
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ For each subscription:      │
│ - Encrypt payload (aes128gcm)│
│ - Generate VAPID JWT        │
│ - POST to push endpoint     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Handle response:            │
│ - 201: Success              │
│ - 410/404: Delete sub       │
│ - Other: Log error          │
└─────────────────────────────┘
```

### 3. Client Receives Notification

```
Push service delivers to SW
         │
         ▼
┌─────────────────────────────┐
│ Service Worker 'push' event │
│ - Parse payload             │
│ - showNotification()        │
│ - Update app badge          │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ User clicks notification    │
│ (notificationclick event)   │
│ - Focus/open app            │
│ - Navigate to URL           │
└─────────────────────────────┘
```

## File Structure

```
barber-frontend/
├── public/
│   ├── service-worker.js      # Push handling, caching, notifications
│   ├── manifest.json          # PWA manifest
│   └── offline.html           # Offline fallback
│
├── src/
│   ├── services/
│   │   └── pushService.ts     # Core push notification logic
│   │
│   ├── hooks/
│   │   └── useNotifications.ts # React hook for push + realtime
│   │
│   └── components/
│       └── NotificationPrompt.tsx # UI component for enable prompt

barber-backend/
├── supabase/
│   ├── functions/
│   │   └── send-push-notification/
│   │       └── index.ts       # Edge function for sending push
│   │
│   └── migrations/
│       └── 20260204200000_update_push_subscriptions_schema.sql
```

## Database Schema

### push_subscriptions table

```sql
CREATE TABLE push_subscriptions (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  salon_id UUID REFERENCES salons(id),
  platform TEXT DEFAULT 'unknown',
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Environment Variables

### Frontend (.env)

```bash
VITE_VAPID_PUBLIC_KEY=BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA
```

### Backend (Supabase Secrets)

```bash
VAPID_PUBLIC_KEY=BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA
VAPID_PRIVATE_KEY=REDACTED
VAPID_SUBJECT=mailto:admin@treservi.com
```

## Usage

### Enable Notifications in React

```tsx
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPrompt } from '../components/NotificationPrompt';

function Dashboard({ userId, salonId }) {
  const { status, subscribe, unsubscribe } = useNotifications({
    userId,
    salonId,
    userRole: 'owner',
    onNotification: (notif) => {
      console.log('New notification:', notif);
      // Update UI, play sound, etc.
    }
  });

  return (
    <div>
      {/* Show prompt if not subscribed */}
      <NotificationPrompt 
        userId={userId} 
        salonId={salonId} 
        userRole="owner" 
      />
      
      {/* Or use compact toggle */}
      <NotificationPrompt compact userId={userId} salonId={salonId} />
    </div>
  );
}
```

### Send Notification from Backend

```typescript
// Trigger via database (automatic on new appointments)
// Or call the edge function directly:

await supabase.functions.invoke('send-push-notification', {
  body: {
    salon_id: 'uuid',
    customer_name: 'John Doe',
    service_id: 'uuid',
    appointment_date: '2026-02-05',
    appointment_time: '14:00'
  }
});
```

## Platform-Specific Notes

### iOS (16.4+)

- **MUST** be installed as PWA ("Add to Home Screen" from Safari)
- Permission request **MUST** be triggered by user gesture (button click)
- Notifications only work when app is backgrounded or closed
- No silent push supported

### Android

- Works in browser and PWA
- Can receive push even without PWA installation
- Supports notification actions
- Respects Doze mode (may delay non-urgent notifications)

### Desktop

- Works in all modern browsers (Chrome, Firefox, Safari 16+, Edge)
- No PWA installation required
- Notifications work even when browser is closed (with background permission)

## Troubleshooting

### "Permission denied"

User blocked notifications. They need to enable in browser settings.

### "Subscription failed" on iOS

- Ensure iOS 16.4 or later
- Ensure app is installed as PWA
- Try from a user gesture (button click)

### Notifications not received

1. Check subscription exists in database
2. Verify VAPID keys match between frontend and backend
3. Check push service response (410 = expired subscription)
4. On iOS, ensure PWA is not force-quit

### Badge not updating

- Badging API requires browser support
- iOS: Works in PWA mode only
- Check service worker is active

## Security Considerations

1. **VAPID private key** must be kept secret (never in frontend)
2. **Subscriptions** are unique per device/browser
3. **RLS policies** ensure users can only manage their own subscriptions
4. **Service role** is used for sending notifications (bypasses RLS)
5. **Expired subscriptions** are automatically cleaned up (410 response)

## Generating New VAPID Keys

If you need to generate new VAPID keys:

```bash
# Using Node.js web-push library
npx web-push generate-vapid-keys

# Output example:
# Public Key: BXXXXXXXX...
# Private Key: XXXXXXXXX...
```

**Important:** After changing VAPID keys, all existing subscriptions become invalid. Users will need to re-subscribe.
