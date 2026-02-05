# Push Notification Debugging Guide

## Quick Status Check

After deploying the new migration, use these SQL queries to debug:

### 1. **Check if trigger is active**
```sql
-- See active triggers on appointments table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;
```

Expected output: Should see `trigger_push_notification_on_appointment` with `AFTER INSERT`

### 2. **Check trigger function exists and is valid**
```sql
-- Verify the trigger function
SELECT 
  proname,
  prosecdef,
  prokind
FROM pg_proc
WHERE proname = 'notify_push_on_new_appointment';
```

Expected: One row with `prosecdef = true` (security definer)

### 3. **View push notification logs (MOST IMPORTANT)**
```sql
-- Check what happened when appointments were created
SELECT 
  id,
  created_at,
  trigger_type,
  appointment_id,
  salon_id,
  status,
  message,
  error_details,
  raw_response
FROM public.push_notification_logs
ORDER BY created_at DESC
LIMIT 50;
```

**This shows:**
- ✅ Was trigger called? (look for 'TRIGGERED' status)
- ✅ What was the error? (see error_details)
- ✅ What did Edge Function return? (see raw_response)

### 4. **Check if service_role_key is set in settings**
```sql
-- Verify database configuration
SELECT 
  setting_name,
  setting_value
FROM pg_settings
WHERE setting_name LIKE '%supabase%' OR setting_name LIKE '%service%'
ORDER BY setting_name;
```

If empty, the trigger won't work!

### 5. **Manually test the Edge Function**
```bash
# Test if Edge Function is callable
curl -X POST https://czvsgtvienmchudyzqpk.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "e07d2b13-6d04-45d8-809d-2b689fae2b76",
    "staff_id": "aedafece-b152-4dca-be7a-7824f80f3bf6",
    "customer_name": "Test Customer",
    "appointment_date": "2026-02-06",
    "appointment_time": "14:00",
    "service_id": "YOUR_SERVICE_ID"
  }'
```

Expected: HTTP 200 with `{"success": true, "sent": X, "failed": Y, ...}`

### 6. **Check push subscriptions exist**
```sql
-- Verify subscriptions were saved
SELECT 
  id,
  user_id,
  salon_id,
  platform,
  created_at,
  last_used_at,
  endpoint
FROM public.push_subscriptions
WHERE salon_id = 'e07d2b13-6d04-45d8-809d-2b689fae2b76'
ORDER BY created_at DESC;
```

Must have entries for notifications to send!

### 7. **Check VAPID keys in Supabase**
```sql
-- Verify VAPID keys match between frontend and backend
-- This is just informational, keys are in Supabase settings:
-- Go to: Settings > Functions > Environment Variables for send-push-notification
SELECT 'Check Supabase Dashboard for VAPID key environment variables';
```

**Key names to check in Dashboard:**
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (optional, default: mailto:admin@treservi.com)

## Debugging Workflow

### Scenario 1: Trigger Not Firing
**Symptoms:** New appointments created but no logs in push_notification_logs

1. Check query #1 - trigger exists?
2. Check query #2 - trigger function valid?
3. Check query #4 - service_role_key set?
4. Re-deploy migration: `npx supabase db push`
5. Create test appointment and check logs

### Scenario 2: Trigger Fires But Edge Function Fails
**Symptoms:** Logs show 'TRIGGERED' but error_details has message

1. Check query #3 - what is the error_details?
2. Common errors:
   - **"Missing supabase_url"** → Check app.settings.supabase_url
   - **"Missing service_role_key"** → Must set in Supabase Dashboard
   - **"POST failed: X"** → Edge Function returned HTTP X
3. Check Edge Function logs: `Supabase Dashboard > Functions > send-push-notification > Logs`

### Scenario 3: Edge Function Returns 500
**Symptoms:** Logs show HTTP 500 from Edge Function

1. Go to: `Supabase Dashboard > Functions > send-push-notification > Logs`
2. Look for timestamp matching the failed appointment
3. Read the error message in the function logs
4. Common causes:
   - VAPID keys not set (env vars missing)
   - Invalid VAPID key format
   - Missing Supabase client initialization

### Scenario 4: Edge Function Returns 200 but sent=0
**Symptoms:** Function succeeds but no subscriptions found

1. Check query #6 - subscriptions exist?
2. If empty - user hasn't subscribed to push notifications yet
3. Steps to fix:
   - User must click notification bell/toggle in app
   - App will request permission: "Allow notifications?"
   - User clicks "Allow"
   - Subscription is created in push_subscriptions table

## Setting VAPID Keys in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/czvsgtvienmchudyzqpk/settings/functions
2. Click on: `send-push-notification` function
3. Scroll to: **Environment Variables** section
4. Click: **Add new environment variable**
5. Add three variables:
   - **Name:** `VAPID_PUBLIC_KEY`
     **Value:** `BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA`
   - **Name:** `VAPID_PRIVATE_KEY`
     **Value:** `H5pOuWncwjpQZfs_fCRagPS0yU51ZWJ06HyeUP7JEPY`
   - **Name:** `VAPID_SUBJECT`
     **Value:** `mailto:support@treservi.com`
6. Click: **Confirm & Deploy**
7. Wait for deployment to complete

## Next Steps to Test

1. **Deploy migration:** `npx supabase db push`
2. **Check logs:** Run query #3 to see if trigger fired
3. **Set VAPID keys:** Follow section above
4. **Re-subscribe:** User toggles notifications off/on in app
5. **Create test appointment:** Should trigger push notification
6. **Check logs again:** Query #3 should show success

## Monitoring in Production

After everything works, monitor these:

```sql
-- Check failures in last hour
SELECT * FROM public.push_notification_logs
WHERE status = 'ERROR' AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check success rate
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors
FROM public.push_notification_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

## Key Insights

- **Trigger is async:** Errors in trigger don't block appointment creation ✅
- **Logging is comprehensive:** Every step is logged in push_notification_logs ✅
- **VAPID keys are system-level:** Not per-salon, must be set once ✅
- **Subscriptions are multi-tenant:** Filtered by salon_id in Edge Function ✅
- **No manual intervention needed:** Once set up, runs automatically ✅
