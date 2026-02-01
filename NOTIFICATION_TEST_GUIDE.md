# Notification System Test Guide

## Overview
Testing the extracted `useNotificationManager` hook that works on both desktop browsers and iOS Safari.

## Test Environment
- **URL**: http://localhost:3000/hamdi
- **Test Salon**: hamdi
- **App Type**: Barber shop dashboard

## Test Cases

### 1. Desktop Browser Testing (Chrome/Firefox/Safari)

#### Test 1.1: Login and Navigate to Dashboard
1. Open http://localhost:3000/hamdi
2. Login with owner credentials (test@salon.com / password)
3. Should see dashboard without white screen
4. Notification bell icon should appear in top navigation

**Expected Result**: Dashboard loads, no console errors

#### Test 1.2: Notification Count Display
1. After login, check notification badge (should show count if notifications exist)
2. Notification bell icon in Navbar should display count
3. Count should persist after page refresh (localStorage test)

**Expected Result**: Notification count displays correctly, persists on refresh

#### Test 1.3: Real-time Notifications
1. Open two browser windows: one with dashboard, one with admin/appointments
2. Create a new appointment in one window
3. Watch for notification to appear in dashboard window in real-time
4. Notification should show: title with customer name, service, staff name, timestamp

**Expected Result**: New appointment appears in notifications without page refresh

#### Test 1.4: Mark Notifications as Read
1. Click on notification bell to open notification panel
2. Click "onNotificationsOpen" callback is triggered (calls markAsRead)
3. Notification count should reset to 0
4. Notification count should remain 0 until next appointment

**Expected Result**: Clicking notifications clears badge count

#### Test 1.5: localStorage Persistence
1. Create 3-5 notifications
2. Close browser completely
3. Reopen and login again
4. Notifications should reappear from localStorage

**Expected Result**: Notifications persist across browser sessions

### 2. iOS Safari Testing

#### Test 2.1: Login and Navigate to Dashboard
1. Open Safari on iOS
2. Go to http://192.168.100.242:3000/hamdi (use network IP)
3. Login with owner credentials
4. Dashboard should load without white screen
5. Check Safari Console for errors (Cmd+Option+I)

**Expected Result**: Dashboard loads on iOS, no blank screen, no console errors

#### Test 2.2: Notification Bell Displays
1. After login, notification bell should appear in top navigation
2. Notification count badge should display if applicable
3. No "PushManager is not available" errors

**Expected Result**: Notification UI visible, no iOS-specific errors

#### Test 2.3: Real-time Notifications on iOS
1. Open admin dashboard on laptop
2. Create a new appointment
3. Watch iOS dashboard for notification in real-time
4. Notification should appear without page reload

**Expected Result**: Notifications work in real-time on iOS

#### Test 2.4: localStorage on iOS
1. Check Safari Console > Storage > localStorage
2. Key should be: `dashboard_notifications`
3. Notifications should be stored as JSON array
4. Close Safari, reopen, login again
5. Notifications should load from localStorage

**Expected Result**: iOS localStorage works (sync-only), notifications persist

#### Test 2.5: No Banner Notifications on iOS
1. iOS doesn't support Web Push API or Badge API
2. Should NOT see system notifications
3. Notifications should only appear in-app in notification panel
4. No "not permitted" or "deprecated" warnings

**Expected Result**: In-app notifications only, no broken API calls

### 3. Error Handling Tests

#### Test 3.1: Network Connectivity
1. Turn on Airplane Mode on iOS
2. Dashboard should remain functional
3. Existing notifications should still display
4. When network returns, new notifications should sync

**Expected Result**: Graceful degradation without errors

#### Test 3.2: localStorage Quota
1. Create many appointments (50+) to test localStorage limits
2. System should gracefully handle quota exceeded
3. Should not crash, should slice to most recent 10

**Expected Result**: localStorage quota errors silently fail, app stable

#### Test 3.3: Supabase Connection Loss
1. Disable network on iOS
2. Real-time subscription should gracefully fail
3. No console errors, app remains functional
4. Reconnect network, subscriptions should not retry (fresh reload needed)

**Expected Result**: Connection errors don't crash app

### 4. Code Quality Checks

#### Test 4.1: No Deprecated APIs Used
- ✅ No Badge API calls (not on iOS)
- ✅ No Web Audio API (buggy on iOS)
- ✅ No PushManager subscriptions (not on iOS)
- ✅ Only localStorage (sync-only reads)
- ✅ Standard Supabase real-time

**Expected Result**: No iOS-specific API errors in console

#### Test 4.2: Hook Performance
1. Check React DevTools Profiler
2. useNotificationManager should render <5ms typically
3. No unnecessary re-renders (only on notification changes)
4. Memory usage should be stable

**Expected Result**: Hook is performant

#### Test 4.3: Component Cleanup
1. Login and logout multiple times
2. Switch between tabs on dashboard
3. No memory leaks (check DevTools)
4. Subscriptions should clean up properly

**Expected Result**: Proper cleanup on unmount

## Passing Criteria

### Desktop ✅
- [ ] Dashboard loads without white screen
- [ ] Notification bell shows count
- [ ] Real-time notifications appear
- [ ] Mark as read clears badge
- [ ] localStorage persists notifications
- [ ] No console errors

### iOS ✅
- [ ] Dashboard loads without white screen
- [ ] Notification bell appears without errors
- [ ] Real-time notifications appear
- [ ] localStorage persists (sync-only)
- [ ] No Badge/PushManager/Web Audio errors
- [ ] In-app notifications only, no system notifications
- [ ] No console errors

### Code Quality ✅
- [ ] No deprecated iOS APIs used
- [ ] Hook renders efficiently
- [ ] Proper cleanup on unmount
- [ ] Graceful error handling

## Troubleshooting

### White Screen on iOS
- Check React Router paths: should be flat (/:salonSlug/dashboard)
- Check for async operations in useEffect (should be in try-catch)
- Clear Safari Cache: Settings > Safari > Clear History and Website Data

### No Real-time Notifications
- Check Supabase connection: network tab should show subscription
- Check filter on postgres_changes: should match salonId and userId
- Verify appointment is created with correct salon_id/staff_id

### localStorage Not Persisting
- iOS has 5MB quota per domain
- Check Storage in Safari DevTools
- Might need to clear old notifications if quota exceeded
- localStorage write errors are silently ignored (as intended)

### Notification Count Wrong
- Check if seenAppointmentsRef is working (should prevent duplicates)
- Verify markAsRead is called when notifications opened
- Check localStorage for stale data

## Final Checklist Before Push

- [ ] All 6 desktop tests passing
- [ ] All 5 iOS tests passing
- [ ] Code quality checks passing
- [ ] No console errors on desktop
- [ ] No console errors on iOS
- [ ] Real-time notifications work on both platforms
- [ ] Commit message: "refactor: extract notifications to useNotificationManager hook (iOS-safe)"
- [ ] Ready for production deployment

