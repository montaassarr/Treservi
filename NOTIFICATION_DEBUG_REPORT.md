# iOS Push Notification Implementation - Investigation Report
## Date: February 4, 2026

### What Happened When You Tested Booking

When you created a test appointment and reported "badge disabled" and "browser inactive", here's what occurred:

1. **Appointment Creation**: ✅ Successfully created in database
2. **Database Trigger**: ✅ Fired and called push-notification edge function  
3. **Edge Function Execution**: ❌ **CRASHED** with `WORKER_ERROR`
4. **Root Cause**: The `web-push` npm library from esm.sh is incompatible with Deno runtime in Supabase Edge Functions

### REST API Permissions Issue (FIXED)

**Error**: `401 Unauthorized` when querying push_subscriptions with service_role JWT

**Root Cause**: The service_role lacked SELECT/INSERT/UPDATE/DELETE permissions on push_subscriptions table

**Solution Applied**:
```sql
grant select on public.push_subscriptions to service_role;
grant insert on public.push_subscriptions to service_role;
grant update on public.push_subscriptions to service_role;
grant delete on public.push_subscriptions to service_role;
```

Migration: `20260204180000_grant_push_subscriptions_to_service_role.sql`

**Verification**: ✅ Service role can now query all 7 active push subscriptions

### Edge Function WORKER_ERROR (ROOT CAUSE IDENTIFIED)

**Original Implementation Issue**:
- Function imported `webpush` library from esm.sh
- Deno runtime does NOT properly support `web-push@3.5.0`
- Function would crash at module load time

**Testing Process**:
1. Tested full function → WORKER_ERROR  
2. Simplified to minimal serve → ✅ Works
3. Added Supabase client → ✅ Works
4. Added webpush import → ❌ WORKER_ERROR

**Solution**:
- Removed webpush library
- Rewrote to use native fetch() API directly to push endpoints
- Function now executes without crashing

**Current Status**: 
- Function deploys successfully
- Returns without crashing
- Attempts to send notifications to all subscriptions
- Responses: 401 (auth missing), 400, 403 (need VAPID token and encryption)

### Active Push Subscriptions Found

All 7 subscriptions are from a single iPhone user on iOS 18.7 with Safari:

```
ID  | User ID                              | User Agent                  | Endpoint (Apple Push)
----|--------------------------------------|-----------------------------|------------------
13  | aedafece-b152-4dca-be7a-7824f80f3bf6 | Safari 26.2 iOS 18.7        | https://web.push.apple.com/QE...
12  | aedafece-b152-4dca-be7a-7824f80f3bf6 | Safari 26.2 iOS 18.7        | https://web.push.apple.com/QG...
11  | aedafece-b152-4dca-be7a-7824f80f3bf6 | Safari 26.2 iOS 18.7        | https://web.push.apple.com/QB...
8   | aedafece-b152-4dca-be7a-7824f80f3bf6 | Safari 26.2 iOS 18.7        | https://web.push.apple.com/QC...
6   | aedafece-b152-4dca-be7a-7824f80f3bf6 | Safari 26.2 iOS 18.7        | https://web.push.apple.com/QC...
```

### Database Triggers

**Migrations Applied**:
- `20260204170000_update_triggers_no_auth.sql` - Calls edge functions without auth headers
- `20260204173000_grant_sequence_service_role.sql` - Fixed sequence permissions  
- `20260204181000_fix_trigger_timeout.sql` - Added 5-second statement timeout

**Trigger Status**:
- Both `on_new_appointment_push` and `on_appointment_insert_realtime` are active
- Fire AFTER INSERT on appointments table
- Call the respective edge functions via http_post()

### Remaining Issues to Fix

#### 1. **VAPID Token Generation** (Medium Priority)
Need to implement JWT signing for VAPID authentication:
```
Authorization: vapid t=<JWT>,pk=<PUBLIC_KEY>
```

#### 2. **Payload Encryption** (High Priority)  
Need to implement AESGCM encryption for Web Push:
- Extract key derivation from p256dh and auth
- Encrypt JSON payload
- Return as binary stream

#### 3. **Service Worker Push Event Handling** (Done)
- Service worker properly listens for push events ✅
- Shows notifications with badge and icon ✅
- Opens app on notification click ✅

#### 4. **iOS Safari Web Push Limitations**
- iOS 16.4+ supports Web Push API
- But push delivery might be restricted when app is closed
- Consider alternative: using Supabase Realtime for in-app notifications

### Files Modified This Session

```
barber-backend/
├── supabase/
│   ├── functions/push-notification/index.ts (rewritten without webpush)
│   ├── functions/push-notification/config.toml (verify_jwt = false)
│   └── migrations/
│       ├── 20260204180000_grant_push_subscriptions_to_service_role.sql (NEW)
│       └── 20260204181000_fix_trigger_timeout.sql (NEW)
```

### Deployment Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend (Vercel) | ✅ Deployed | resevini.vercel.app |
| Service Worker | ✅ Deployed | public/service-worker.js v2 |
| iOS Detection | ✅ Fixed | Enables Web Push for iOS 16.4+ |
| Push Subscriptions | ✅ Saved | 7 active endpoints found |
| Database Triggers | ✅ Active | Fire on appointment INSERT |
| Edge Functions | ⚠️ Partial | Executes but needs VAPID/encryption |
| REST API | ✅ Fixed | service_role permissions granted |

### Next Steps

1. **Implement proper VAPID token generation** in push-notification function
   - Use Deno crypto APIs
   - Sign JWT with VAPID private key
   - Set Authorization header correctly

2. **Implement payload encryption** (aesgcm)
   - Use hkdf for key derivation
   - Use AES-128-GCM for encryption
   - Send with proper Content-Encoding header

3. **Test end-to-end notification delivery**
   - Create test appointment
   - Monitor browser console and service worker
   - Check if push event fires on device
   - Verify notification appears (may be limited to active tab on iOS)

4. **Consider fallback notification strategy**
   - Supabase Realtime for in-app toast notifications
   - Works while app is open (iOS doesn't restrict this)
   - Complements Web Push for background notifications

5. **Document iOS Web Push limitations**
   - Background notification delivery is not guaranteed on iOS
   - Foreground notifications work reliably
   - App must be installed as PWA for best results
