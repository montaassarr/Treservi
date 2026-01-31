# Badge System Testing Guide

## Pre-Test Setup

### 1. Environment Requirements
- **Device**: iPhone with iOS 16.4+ (badge API support)
- **Browser**: Safari (required for iOS PWA installation)
- **Network**: HTTPS connection (required for service worker)
- **Backend**: Supabase connection configured and running

### 2. Installation Steps
```bash
# Build the app
cd barber-frontend
npm run build

# Or run in dev mode
npm run dev
```

### 3. iOS PWA Installation
1. Open Safari on iPhone
2. Navigate to your app URL (must be HTTPS)
3. Tap Share icon (box with arrow)
4. Select "Add to Home Screen"
5. Name it "Reservi" or your salon name
6. Tap "Add"
7. **IMPORTANT**: Open app from home screen icon (not Safari)

---

## Test Suite

### Test 1: Initial Badge Load
**Objective**: Verify badge shows cached count on app mount

**Steps**:
1. Open app from home screen
2. Check if badge shows on app icon (may be 0 initially)

**Expected**:
- Badge shows number from localStorage
- No errors in console
- Badge appears within 1-2 seconds

**Debug**:
```javascript
// Open DevTools (Safari → Develop → iPhone → Your App)
localStorage.getItem('unread_badge_count'); // Should show cached count
```

---

### Test 2: Database Sync on Mount
**Objective**: Verify badge updates with actual DB count

**Steps**:
1. Create 3 appointments in Supabase (status: 'Pending')
2. Close and reopen app
3. Watch badge update

**Expected**:
- Badge initially shows cached count
- After ~1 second, updates to actual DB count (3)
- Console logs: "Refreshed badge from DB: 3"

**Debug**:
```javascript
// Check last refresh timestamp
localStorage.getItem('last_notification_check');

// Manually trigger refresh
await refreshBadgeFromDB();
```

---

### Test 3: Realtime Increment
**Objective**: Verify badge increments on new appointments

**Setup**:
1. Have app open on iPhone
2. Keep Safari DevTools console visible (if possible)
3. Use Supabase dashboard or API to insert new appointment

**Steps**:
1. Insert new appointment:
```sql
INSERT INTO appointments (
  salon_id, 
  staff_id, 
  customer_name, 
  appointment_date, 
  appointment_time, 
  status
) VALUES (
  'your-salon-id', 
  'your-staff-id', 
  'Test Customer', 
  CURRENT_DATE, 
  '14:00', 
  'Pending'
);
```
2. Watch app badge

**Expected**:
- Badge increments within 2 seconds
- Notification sound plays (800Hz chime)
- Red dot appears on notification icon
- Console logs: "[Badge] Incremented to X"

**Debug**:
```javascript
// Check realtime subscription
supabase.channel('new-appointments-badge').state; // Should be 'joined'

// Manual sound test
testNotificationSound();
```

---

### Test 4: Clear on View (Instagram-Style)
**Objective**: Verify badge clears when user views notifications

**Steps**:
1. Have badge showing count > 0 (e.g., 5)
2. Tap notification icon in app
3. View notification panel
4. Check app icon badge

**Expected**:
- Badge clears immediately (0)
- Red dot disappears from icon
- localStorage updated:
  ```javascript
  localStorage.getItem('last_notification_check'); // Should be recent ISO timestamp
  localStorage.getItem('unread_badge_count'); // Should be '0'
  ```

**Debug**:
```javascript
// Check if clear was called
console.log('Last cleared:', localStorage.getItem('last_notification_check'));

// Manual clear test
await clearBadge();
```

---

### Test 5: No Hardcoded Cap
**Objective**: Verify badge can exceed 3 (old limit)

**Steps**:
1. Insert 10 appointments in Supabase
2. Refresh app
3. Check badge count

**Expected**:
- Badge shows actual count (10, not capped at 3)
- Notification list shows up to 10 items
- No "Math.min" logic limiting count

**Debug**:
```sql
-- Count unread appointments
SELECT COUNT(*) FROM appointments 
WHERE salon_id = 'your-salon-id' 
AND status IN ('Pending', 'Confirmed');
```

---

### Test 6: Role-Based Filtering
**Objective**: Verify owners see all, staff see only theirs

**Setup**:
- Test with 2 accounts: 1 owner, 1 staff member
- Create appointments for different staff

**Steps (Owner Account)**:
1. Login as owner
2. Create 3 appointments (assign to different staff)
3. Check badge count

**Expected (Owner)**:
- Badge shows 3 (all salon appointments)

**Steps (Staff Account)**:
1. Login as staff member
2. Check badge count

**Expected (Staff)**:
- Badge shows only appointments assigned to that staff
- Does NOT show other staff's appointments

**Debug**:
```javascript
// Check user role
console.log('Role:', userRole); // Should be 'owner' or 'staff'

// Check Supabase filter
const query = userRole === 'owner'
  ? supabase.from('appointments').eq('salon_id', salonId)
  : supabase.from('appointments').eq('staff_id', userId);
```

---

### Test 7: Persistence Across Restarts
**Objective**: Verify badge survives app restarts

**Steps**:
1. Have badge showing count (e.g., 4)
2. Close app completely (swipe up from app switcher)
3. Wait 10 seconds
4. Reopen app from home screen

**Expected**:
- Badge shows cached count (4) immediately
- After 1-2 seconds, syncs with DB (may stay 4 or update)
- No flash of 0 badge

**Debug**:
```javascript
// Check if localStorage persisted
localStorage.getItem('unread_badge_count'); // Should match badge
```

---

### Test 8: Notification Sound (iOS)
**Objective**: Verify sound plays on new appointments

**Steps**:
1. Have app open
2. Turn up volume to 50%
3. Insert new appointment via Supabase
4. Listen for sound

**Expected**:
- 800Hz chime plays for ~200ms
- Sound plays even if app is in background (PWA)
- No sound if phone is on silent mode (expected behavior)

**Debug**:
```javascript
// Manual sound test
testNotificationSound();

// Check Web Audio API support
console.log('AudioContext:', window.AudioContext || window.webkitAudioContext);
```

---

### Test 9: Offline Behavior
**Objective**: Verify badge handles offline state gracefully

**Steps**:
1. Open app with active badge count
2. Turn on Airplane Mode
3. Create appointment (should fail to sync)
4. Turn off Airplane Mode
5. Refresh app

**Expected**:
- Badge shows cached count while offline
- No errors thrown
- After reconnection, badge syncs with DB
- Service worker handles offline gracefully

**Debug**:
```javascript
// Check online state
console.log('Online:', navigator.onLine);

// Check service worker cache
caches.keys().then(console.log);
```

---

### Test 10: Permission Flow
**Objective**: Verify auto-permission request on first interaction

**Steps**:
1. Fresh install (or reset storage):
```javascript
localStorage.clear();
sessionStorage.clear();
```
2. Open app
3. Click anywhere on screen
4. Watch for permission prompt

**Expected**:
- No permission prompt on mount
- Permission prompt appears on first click/touch
- Badge starts working after permission granted

**Debug**:
```javascript
// Check permission state
console.log('Notification permission:', Notification.permission);

// Manual permission test
await testRequestPermission();
```

---

## Advanced Tests

### Test 11: Concurrent Users
**Objective**: Verify badge updates with multiple users

**Setup**:
- 2 devices (or 2 browser tabs)
- Same salon, different staff accounts

**Steps**:
1. Login to Device A as Staff 1
2. Login to Device B as Staff 2
3. Create appointment assigned to Staff 1 from admin panel
4. Check both devices

**Expected**:
- Device A (Staff 1): Badge increments
- Device B (Staff 2): Badge stays same (not their appointment)

---

### Test 12: Rapid Appointments
**Objective**: Verify badge handles burst of new appointments

**Steps**:
1. Have app open
2. Insert 5 appointments rapidly (within 5 seconds)
3. Watch badge updates

**Expected**:
- Badge increments for each appointment (1→2→3→4→5)
- Sound plays for each (may overlap)
- No race conditions or missed updates

**Debug**:
```javascript
// Check realtime subscription buffer
console.log('Seen appointments:', seenAppointmentsRef.current.size);
```

---

### Test 13: Badge After Clear
**Objective**: Verify badge re-increments after clearing

**Steps**:
1. Have badge at 3
2. Clear by viewing notifications
3. Wait 5 minutes
4. Insert new appointment

**Expected**:
- Badge clears to 0 after viewing
- New appointment increments badge to 1 (not stays at 0)
- Timestamp logic works correctly

**Debug**:
```javascript
// Check timestamp comparison
const lastChecked = new Date(localStorage.getItem('last_notification_check'));
const appointmentTime = new Date('2025-01-31T15:30:00Z');
console.log('Is new?', appointmentTime > lastChecked);
```

---

## Browser Console Testing

### Setup DevTools:
1. Connect iPhone to Mac via USB
2. Enable "Web Inspector" on iPhone (Settings → Safari → Advanced)
3. Open Safari on Mac → Develop → [Your iPhone] → [Your App]

### Run Diagnostic:
```javascript
// Import test utils (copy from badgeTestUtils.ts)
runAllTests();

// Output:
// === Badge API Support ===
// navigator.setAppBadge: true
// Notification.permission: granted
// Is PWA: true
// Service Worker: true
// 
// === LocalStorage State ===
// Badge Count: 3
// Last Checked: 2025-01-31T...
// ...
```

---

## Common Issues & Fixes

### Issue 1: Badge Not Showing
**Symptoms**: App icon has no badge after new appointments

**Fixes**:
1. Verify PWA is installed (not running in Safari browser)
2. Check notification permission: `Notification.permission`
3. Verify Badge API support: `'setAppBadge' in navigator`
4. Check iOS version (requires 16.4+)

**Debug**:
```javascript
testBadgeSupport();
```

---

### Issue 2: Badge Stuck at Old Count
**Symptoms**: Badge doesn't update with new appointments

**Fixes**:
1. Check realtime subscription: `supabase.channel('...').state`
2. Verify Supabase connection: `testSupabaseConnection(...)`
3. Check localStorage cache: `testStorageState()`
4. Force refresh: `await refreshBadgeFromDB()`

**Debug**:
```javascript
// Check subscription health
const channel = supabase.channel('new-appointments-badge');
console.log('Subscription state:', channel.state);
console.log('Subscription options:', channel.socket.connectionState());
```

---

### Issue 3: Badge Doesn't Clear
**Symptoms**: Badge stays after viewing notifications

**Fixes**:
1. Check async clear handler is awaited
2. Verify `clearBadge()` is called in `onNotificationsOpen`
3. Check localStorage timestamp: `localStorage.getItem('last_notification_check')`

**Debug**:
```javascript
// Manually trigger clear
await clearBadge();
console.log('Cleared at:', localStorage.getItem('last_notification_check'));
```

---

### Issue 4: No Sound on iOS
**Symptoms**: Badge updates but no chime plays

**Fixes**:
1. Check phone volume (not on silent mode)
2. Verify Web Audio API support: `window.AudioContext`
3. Test sound manually: `testNotificationSound()`
4. Check if iOS blocks audio on autoplay (must be user-initiated)

**Debug**:
```javascript
// Create audio context (requires user gesture)
document.addEventListener('click', () => {
  const audioContext = new AudioContext();
  console.log('Audio context state:', audioContext.state); // Should be 'running'
});
```

---

## Success Criteria

### Must Pass:
- [ ] Badge shows actual DB count (not hardcoded 3)
- [ ] Badge increments on new appointments (realtime)
- [ ] Badge clears when notifications viewed
- [ ] Badge persists across app restarts
- [ ] Badge respects role (owner vs staff)
- [ ] No cap on badge count (can exceed 3)
- [ ] Sound plays on new notification

### Nice to Have:
- [ ] Badge updates within 2 seconds of DB insert
- [ ] No flashing or race conditions
- [ ] Works offline (cached count)
- [ ] Permission auto-requested on first click

---

## Reporting Issues

### Template:
```
**Issue**: Badge not clearing after view

**Device**: iPhone 14 Pro, iOS 17.2
**Browser**: Safari (PWA installed)
**Steps to Reproduce**:
1. Open app with badge = 5
2. Tap notification icon
3. View notification panel
4. Check app icon

**Expected**: Badge clears to 0
**Actual**: Badge stays at 5

**Debug Info**:
- Notification.permission: granted
- localStorage.unread_badge_count: 5
- localStorage.last_notification_check: null
- Console errors: [paste screenshot]
```

---

## Performance Benchmarks

### Target Metrics:
- **Initial Load**: Badge appears within 1 second
- **DB Sync**: Refreshes within 2 seconds
- **Realtime Update**: Increments within 2 seconds of DB insert
- **Clear Action**: Badge clears immediately (< 100ms)
- **Memory**: < 5MB localStorage usage
- **Battery**: < 1% battery per hour (background PWA)

---

**Built for Reservi PWA** | Last Updated: January 2025
