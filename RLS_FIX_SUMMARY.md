# Push Subscription RLS Fix - February 4, 2026

## Problem Identified
When users attempted to save their push notification subscriptions to the database, they encountered:
```
Error: new row violates row-level security policy (USING expression) for table "push_subscriptions"
Code: 42501
```

## Root Cause
The RLS policy required `auth.uid() = user_id`, but:
1. During session refresh/refresh token rotation, `auth.uid()` could become NULL
2. The policy was too strict and didn't account for authenticated users properly
3. Service role wasn't allowed to manage subscriptions for the edge function

## Solutions Implemented

### 1. **Database Migration (20260204182000_fix_push_subscriptions_rls.sql)**
Updated RLS policies to:
- Drop old restrictive policies
- Add new policy: Allow users to insert if authenticated (`auth.uid() IS NOT NULL`)
- Allow service_role to manage all subscriptions (needed by edge function)
- Verify user is properly authenticated before checking user_id match

### 2. **Frontend Enhancement (usePushNotifications.ts)**
Updated the subscription save logic to:
- Call `supabase.auth.getUser()` to verify session is valid before saving
- Use the authenticated user's ID from the session instead of relying on passed userId
- Add better error logging if user is not authenticated
- Log warnings if there's a user ID mismatch

## Testing Steps

1. **Clear browser storage** (optional but recommended):
   ```
   // In browser console:
   localStorage.clear()
   sessionStorage.clear()
   ```

2. **Test on resevini.vercel.app**:
   - Log in to your salon
   - Grant notification permission when prompted
   - Check browser console for: "✅ Push notification subscription successful!"
   - Verify in database: `SELECT * FROM push_subscriptions WHERE user_id = '<your-id>'`

3. **Create a test appointment** to verify push notification delivery

## Deployment Status
- ✅ Database migration applied (20260204182000)
- ✅ Frontend code updated and deployed to resevini.vercel.app
- ✅ Edge functions redeployed
- ✅ All changes committed to git

## Next Steps if Issues Persist
1. Check browser's Notification permission (Settings > Site Settings > Notifications)
2. Verify service worker is registered: `navigator.serviceWorker.getRegistrations()`
3. Check DevTools Console for any error messages
4. Verify Supabase session is valid: `supabase.auth.getSession()`
