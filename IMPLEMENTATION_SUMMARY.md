# Push Notification Error Logging Implementation

## Problem Identified

The push notification system had **no error logging**, making it impossible to debug why:
- Trigger fires or doesn't fire
- Edge Function succeeds or fails
- What specific error occurred

**Your logs showed:**
- Push subscription was created ✅ (POST 201)
- Appointment was created ✅ (POST 201)
- But NO edge function call logs (missing POST /functions/v1/send-push-notification)
- No way to know WHY

## Solution Implemented

### 1. **New Migration: 20260205000000_final_push_notification_trigger.sql**
   
   **What it does:**
   - Creates `push_notification_logs` table for debugging
   - Cleans up all conflicting triggers from 13 previous migrations
   - Creates single authoritative trigger function with comprehensive error handling
   - Adds logging at every step: trigger fired, configuration validated, request sent, response received
   
   **Key Features:**
   ```sql
   -- New table that logs every push notification event
   CREATE TABLE public.push_notification_logs (
     id, created_at, trigger_type, appointment_id, salon_id, 
     status (SUCCESS|ERROR|TRIGGERED), message, error_details, raw_response
   );
   
   -- Trigger function now logs:
   -- 1. When trigger fires (status: 'TRIGGERED')
   -- 2. If configuration is missing (status: 'ERROR')
   -- 3. When HTTP request completes (status: 'SUCCESS' or 'FAILED')
   -- 4. Full response/error details
   ```

### 2. **Enhanced Edge Function: index.ts**
   
   **Added:**
   - Database logging when function succeeds
   - Database logging when function errors
   - Logs include: sent count, failed count, detailed results
   
   ```typescript
   // New: Log success
   await supabaseAdmin.from('push_notification_logs').insert({
     trigger_type: 'edge_function',
     appointment_id, salon_id, status: 'SUCCESS',
     message: `Sent ${successful}, failed ${failed}`,
     raw_response: JSON.stringify({...})
   })
   
   // New: Log errors
   await supabaseAdmin.from('push_notification_logs').insert({
     trigger_type: 'edge_function', salon_id,
     status: 'ERROR', error_details: errorMsg
   })
   ```

## How to Debug Now

### Quick Check (SQL)
```sql
-- See what happened to push notifications
SELECT * FROM push_notification_logs 
ORDER BY created_at DESC LIMIT 50;
```

**Columns tell you:**
- `status` - Was it triggered? Did it succeed?
- `error_details` - What went wrong?
- `raw_response` - What did Edge Function return?
- `created_at` - When did it happen?

### Example Log Results

#### Scenario A: Trigger Not Firing ❌
```
trigger_type   | status    | message
edge_function  | (nothing) | <-- No rows = Trigger never called
```
**Fix:** Check trigger exists with query from debugging guide

#### Scenario B: Trigger Fires, Config Missing ❌
```
trigger_type     | status  | error_details
on_new_appointment | ERROR | "Missing service_role_key - cannot call edge function"
```
**Fix:** Must set app.settings.service_role_key or SUPABASE_SERVICE_ROLE_KEY

#### Scenario C: Trigger Fires, Edge Function Fails ❌
```
trigger_type | status  | raw_response
on_new_appointment | FAILED | HTTP 500 from edge function
```
**Fix:** Check Edge Function logs in Supabase Dashboard

#### Scenario D: Everything Works ✅
```
trigger_type     | status  | message
on_new_appointment | TRIGGERED | "Attempting to send push notification"
edge_function    | SUCCESS | "Successfully sent 1 notifications, 0 failed"
```
**Fix:** Already working! Push should have been delivered

## Files Changed

1. **barber-backend/supabase/migrations/20260205000000_final_push_notification_trigger.sql** (NEW)
   - 130 lines
   - Creates logging table, drops conflicting triggers, creates single authoritative trigger

2. **barber-backend/supabase/functions/send-push-notification/index.ts** (UPDATED)
   - Added ~40 lines for database logging (success and error paths)

3. **PUSH_NOTIFICATION_DEBUG_GUIDE.md** (NEW)
   - Comprehensive debugging guide with 7 SQL queries
   - Common scenarios and how to fix them

## Commits

1. **8642681** - "feat: Add comprehensive push notification error logging and fix trigger conflicts"
2. **4aed8f0** - "docs: Add comprehensive push notification debugging guide"

## Next Steps

1. **Deploy migration:**
   ```bash
   npx supabase db push --project-ref czvsgtvienmchudyzqpk
   ```

2. **Set VAPID secrets in Dashboard** (if not already set):
   - Go to: Settings > Functions > send-push-notification > Environment Variables
   - Add: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

3. **Check logs:**
   ```sql
   SELECT * FROM push_notification_logs ORDER BY created_at DESC LIMIT 50;
   ```

4. **Create test appointment** and watch logs appear

## Technical Details

### Why Multiple Triggers Existed
The workspace had 13 conflicting migrations from previous attempts:
- 20260201000001_create_push_subscriptions.sql
- 20260201000002_add_push_notification_trigger.sql
- 20260201000003_add_realtime_notification_trigger.sql
- 20260203000003_fix_trigger_secrets.sql
- 20260204120000-182000 (8 more conflicting versions)
- 20260204201000_push_notification_trigger.sql

**Each one was:**
- Dropping the previous trigger
- Creating new trigger with slightly different logic
- Using different function names
- Different error handling

**Result:** Final state was ambiguous - unclear which trigger was actually active

### Why New Migration Fixes This
- **Timestamp: 20260205** - Latest, will run last
- **Drops ALL conflicting triggers** - Explicitly removes 20260204*.sql triggers
- **Single authoritative function** - notify_push_on_new_appointment()
- **Comprehensive logging** - Every step logged to database

### Why Database Logging is Better Than Just Console Logs
- **Console logs disappear** - Deno Edge Functions have limited log retention
- **Database logs persist** - Can query hours later
- **Structured data** - Can filter by status, salon_id, error type
- **Queryable** - Can write SQL to find patterns

## Monitoring

After deployment, the system will:
1. ✅ Create log entry when trigger fires
2. ✅ Create log entry when Edge Function called
3. ✅ Log success/failure with details
4. ✅ Enable SQL queries to diagnose any issues

**Production monitoring query:**
```sql
SELECT 
  status, COUNT(*), 
  MAX(created_at) as last_error
FROM push_notification_logs
WHERE status = 'ERROR' AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## Validation Checklist

- [x] Migration file created with DROP all previous triggers
- [x] New logging table with all required columns
- [x] Trigger function with try/catch and comprehensive error logging
- [x] Edge Function logs success and errors to database
- [x] Non-blocking: trigger errors don't rollback appointments
- [x] Commits created with clear messages
- [x] Debugging guide created with 7 SQL queries
- [x] Production monitoring queries included
- [x] All documentation updated
