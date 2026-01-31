# Dynamic Badge System Documentation

## Overview
Instagram-style notification badge system that syncs with Supabase in real-time. The badge shows the actual number of unread appointments from the database (not hardcoded), clears when user views notifications, and updates immediately on new appointments.

## Architecture

### 1. **Service Layer** (`services/notificationService.ts`)
Core business logic for badge management:

#### Key Functions:
- **`getUnreadCount(userId, salonId, userRole)`**
  - Queries Supabase for Pending/Confirmed appointments
  - Filters by last checked timestamp (stored in localStorage)
  - Returns actual unread count (no hardcoded limits)
  - Caches result in localStorage as fallback
  - Role-based filtering:
    - **Owner**: All salon appointments
    - **Staff**: Only assigned appointments

- **`markAllAsRead()`**
  - Updates `last_notification_check` timestamp in localStorage
  - Clears badge count
  - Instagram-style: marks current moment as "all read"

- **`incrementBadgeCount(currentCount)`**
  - Increments badge count on new appointment
  - Updates localStorage cache
  - No cap on maximum count

- **`subscribeToNewAppointments(salonId, userId, userRole, callback)`**
  - Creates Supabase realtime channel
  - Listens for INSERT events on appointments table
  - Calls callback with new appointment data
  - Auto-increments badge via callback

- **`playNotificationSound()`**
  - iOS-compatible Web Audio API notification sound
  - Plays 800Hz sine wave for 200ms
  - Graceful fallback if audio context fails

#### Storage Keys:
- `unread_badge_count`: Current badge count cache
- `last_notification_check`: ISO timestamp of last view
- `dashboard_notifications_read`: Boolean read state flag

---

### 2. **Hook Layer** (`hooks/useAppBadge.ts`)
React hook that connects badge API to Supabase service:

#### Interface:
```typescript
interface UseAppBadgeOptions {
  autoRequestPermission?: boolean;
  userId?: string;
  salonId?: string;
  userRole?: 'owner' | 'staff';
}
```

#### Returned Methods:
- **`badgeCount`**: Current badge count (state)
- **`updateBadge(count)`**: Set badge to specific count
- **`clearBadge()`**: Clear badge and mark all as read
- **`refreshBadgeFromDB()`**: Query Supabase for latest unread count
- **`requestPermission()`**: Request notification permission (required for iOS)
- **`incrementBadge()`**: Increment by 1
- **`decrementBadge()`**: Decrement by 1
- **`hasPermission`**: Boolean permission state
- **`isSupported`**: Boolean badge API support

#### Automatic Features:
1. **Auto-load**: Restores count from localStorage on mount
2. **Auto-subscribe**: Sets up realtime listener when user context provided
3. **Auto-increment**: Increments badge when new appointment arrives
4. **Auto-sound**: Plays notification sound on new appointment
5. **Auto-permission**: Requests permission on first user interaction

#### Realtime Flow:
```
New Appointment in DB
↓
Supabase Realtime Channel Fires
↓
subscribeToNewAppointments() callback
↓
incrementBadgeCount() updates localStorage
↓
setNotificationBadge() updates OS badge
↓
playNotificationSound() plays chime
↓
React state updates (badgeCount)
```

---

### 3. **Component Layer** (`pages/DashboardPage.tsx`)
Integration with main dashboard:

#### Initialization:
```typescript
const { 
  updateBadge, 
  clearBadge, 
  hasPermission, 
  isSupported, 
  refreshBadgeFromDB,
  badgeCount 
} = useAppBadge({ 
  autoRequestPermission: true,
  userId: userId,
  salonId: salonId,
  userRole: userRole
});
```

#### Clear-on-View Handler:
```typescript
onNotificationsOpen={async () => {
  // Instagram-style: clear badge and mark as read
  setNotificationCount(0);
  setHasReadNotifications(true);
  await clearBadge();
  
  // Refresh badge count from DB
  if (refreshBadgeFromDB) {
    await refreshBadgeFromDB();
  }
}}
```

#### Changes from Old System:
1. **Removed hardcoded "3" cap**: `Math.min(prev + 1, 3)` → `prev + 1`
2. **Increased notification history**: `slice(0, 3)` → `slice(0, 10)`
3. **Added DB sync**: `clearBadge()` now updates localStorage timestamps
4. **Auto-refresh**: Calls `refreshBadgeFromDB()` after clearing

---

### 4. **Service Worker** (`public/service-worker.js`)
Background badge management for PWA:

#### Message Handler:
```javascript
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    const count = event.data.count || 0;
    
    if (self.navigator && self.navigator.setAppBadge) {
      if (count > 0) {
        self.navigator.setAppBadge(count);
      } else {
        self.navigator.clearAppBadge();
      }
    }
  }
});
```

#### Usage from Client:
```typescript
navigator.serviceWorker?.controller?.postMessage({
  type: 'UPDATE_BADGE',
  count: 5
});
```

---

## iOS PWA Setup

### Requirements:
1. **Add to Home Screen**: Badge API only works after PWA is installed
2. **User Gesture**: Permission must be requested inside click/touch event
3. **HTTPS**: Required for service worker and badge API
4. **Manifest**: `display: "standalone"` for app-like behavior

### iOS 16.4+ Badge Behavior:
- Badge shows on app icon immediately after `setAppBadge()`
- Clears instantly with `clearAppBadge()`
- Persists across app restarts
- No explicit permission needed (auto-granted for PWA)

### Testing on iOS:
1. Open Safari on iPhone
2. Navigate to app URL (must be HTTPS)
3. Tap Share → "Add to Home Screen"
4. Open app from home screen (not Safari)
5. Click any interactive element to trigger permission request
6. Badge should appear on icon after first appointment

---

## Supabase Schema Requirements

### Current Implementation:
Uses existing `appointments` table with these fields:
- `id` (uuid, primary key)
- `status` (text: 'Pending', 'Confirmed', 'Completed', 'Cancelled')
- `salon_id` (uuid, foreign key)
- `staff_id` (uuid, foreign key)
- `customer_name` (text)
- `appointment_date` (date)
- `appointment_time` (time)
- `created_at` (timestamp)

### Badge Count Query:
```sql
SELECT COUNT(*) 
FROM appointments 
WHERE salon_id = $salonId 
  AND status IN ('Pending', 'Confirmed')
  AND created_at > $lastCheckedTimestamp;
```

### Realtime Trigger:
Badge increments when:
```sql
INSERT INTO appointments (status, salon_id, ...)
VALUES ('Pending', ...);
```

### Future Enhancement (Optional):
Add `read_at` timestamp column for persistent read tracking:
```sql
ALTER TABLE appointments ADD COLUMN read_at TIMESTAMP;
UPDATE appointments SET read_at = NOW() WHERE id = ANY($notificationIds);
```

---

## Behavior Comparison

### Old System (Hardcoded):
```typescript
// ❌ Capped at 3
setNotificationCount((prev) => Math.min(prev + 1, 3));

// ❌ No DB sync
localStorage.setItem('dashboard_notifications_read', 'true');

// ❌ Only stores 3 notifications
notifications.slice(0, 3)
```

### New System (Dynamic):
```typescript
// ✅ Unlimited count
setNotificationCount((prev) => prev + 1);

// ✅ Syncs with DB via timestamp
await clearBadge(); // Updates last_notification_check

// ✅ Stores 10 notifications
notifications.slice(0, 10)

// ✅ Queries actual unread count
const count = await getUnreadCount(userId, salonId, userRole);
```

---

## Flow Diagrams

### Initial Load:
```
App Mounts
↓
useAppBadge() initializes
↓
getStoredBadgeCount() reads localStorage
↓
setNotificationBadge(storedCount)
↓
refreshBadgeFromDB() queries Supabase
↓
Updates badge with actual DB count
```

### New Appointment:
```
Customer Books Appointment
↓
Supabase INSERT trigger
↓
Realtime channel broadcasts
↓
useAppBadge subscription receives event
↓
incrementBadgeCount() updates localStorage
↓
playNotificationSound() plays chime
↓
setNotificationBadge(newCount) updates OS
↓
React re-renders with new count
```

### User Views Notifications:
```
User Clicks Notification Icon
↓
onNotificationsOpen() fires
↓
clearBadge() calls markAllAsRead()
↓
Updates last_notification_check timestamp
↓
clearNotificationBadge() clears OS badge
↓
refreshBadgeFromDB() queries DB
↓
Returns 0 (no new appointments after timestamp)
↓
Badge remains cleared
```

---

## Debugging

### Check Badge Support:
```typescript
console.log('Badge supported:', 'setAppBadge' in navigator);
console.log('Notification permission:', Notification.permission);
```

### Check Stored Count:
```typescript
console.log('Cached badge count:', localStorage.getItem('unread_badge_count'));
console.log('Last checked:', localStorage.getItem('last_notification_check'));
```

### Check Supabase Connection:
```typescript
const { data, error } = await supabase
  .from('appointments')
  .select('id, status, created_at')
  .eq('salon_id', salonId)
  .in('status', ['Pending', 'Confirmed']);
  
console.log('Unread appointments:', data?.length, data);
```

### Check Realtime Subscription:
```typescript
const channel = supabase.channel('test-channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'appointments' },
    (payload) => console.log('New appointment:', payload)
  )
  .subscribe((status) => console.log('Subscription status:', status));
```

---

## Known Limitations

1. **iOS Safari (Browser)**: Badge API not available, only works in PWA
2. **Android Chrome**: Badge shows in notification tray, not home screen icon
3. **Desktop Chrome**: Badge shows on taskbar/dock icon (macOS/Windows 10+)
4. **Firefox**: No badge API support yet (as of 2025)
5. **Permission Timing**: iOS requires badge update after permission granted

---

## Future Enhancements

1. **Read Receipts**: Add `read_at` column to appointments table
2. **Category Badges**: Different badges for pending vs confirmed
3. **Push Notifications**: Trigger badge updates via push messages
4. **Offline Queue**: Cache badge updates when offline, sync later
5. **Multi-Salon**: Separate badge counts per salon for super admins
6. **Badge Actions**: iOS 15+ supports badge tap to open specific view

---

## Testing Checklist

- [ ] Badge shows correct count on app mount
- [ ] Badge increments when new appointment created
- [ ] Badge clears when notification panel opened
- [ ] Badge persists across app restarts (localStorage)
- [ ] Badge syncs with Supabase on refresh
- [ ] Badge respects role (owner sees all, staff sees theirs)
- [ ] Sound plays on new notification (iOS compatible)
- [ ] No hardcoded "3" cap (can exceed previous limit)
- [ ] Realtime updates work without page refresh
- [ ] Permission request works on iOS (requires user gesture)

---

## Migration Notes

### Breaking Changes:
- `useAppBadge` now requires `userId`, `salonId`, `userRole` props
- `clearBadge()` is now async (returns Promise)
- `refreshBadgeFromDB()` added to hook API

### Backward Compatible:
- Old localStorage keys preserved for fallback
- Existing notifications array still works (just stores 10 instead of 3)
- Service worker message handler unchanged
- Badge API calls remain the same

### Migration Steps:
1. Update `useAppBadge` call to pass user context
2. Add `await` to `clearBadge()` calls
3. Replace hardcoded `Math.min(prev + 1, 3)` with `prev + 1`
4. Change `.slice(0, 3)` to `.slice(0, 10)` for more history
5. Test on iOS PWA (add to home screen required)

---

**Built with ❤️ for Reservi PWA** | Last Updated: January 2025
