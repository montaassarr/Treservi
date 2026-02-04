-- Cleanup: Remove old notification functions and triggers, keep only send-push-notification
-- Date: 2026-02-04
-- Purpose: Clean up duplicate/old notification infrastructure

-- ============================================================================
-- DROP OLD TRIGGERS (they may have old function references)
-- ============================================================================

-- Drop old realtime notification triggers
DROP TRIGGER IF EXISTS notify_realtime_on_appointment ON appointments;
DROP TRIGGER IF EXISTS trigger_realtime_notification_on_appointment ON appointments;

-- Drop old push notification triggers (only keep the latest one in 20260204201000)
DROP FUNCTION IF EXISTS notify_push_on_appointment_old() CASCADE;
DROP FUNCTION IF EXISTS notify_realtime_on_appointment_old() CASCADE;

-- ============================================================================
-- VERIFY CURRENT TRIGGER EXISTS AND IS CORRECT
-- ============================================================================

-- Ensure the main trigger is set to call send-push-notification (not old functions)
DROP TRIGGER IF EXISTS trigger_push_notification_on_appointment ON appointments;

CREATE OR REPLACE FUNCTION notify_push_on_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  result JSON;
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN
      PERFORM net.http_post(
        url := CONCAT(
          current_setting('app.settings.supabase_url', true),
          '/functions/v1/send-push-notification'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key', true))
        ),
        body := jsonb_build_object(
          'record', jsonb_build_object(
            'id', NEW.id,
            'salon_id', NEW.salon_id,
            'staff_id', NEW.staff_id,
            'customer_name', NEW.customer_name,
            'customer_phone', NEW.customer_phone,
            'service_id', NEW.service_id,
            'appointment_date', NEW.appointment_date,
            'appointment_time', NEW.appointment_time,
            'status', NEW.status,
            'amount', NEW.amount
          )
        )::text
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Push notification trigger error: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_push_notification_on_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_new_appointment();

-- ============================================================================
-- VERIFY push_subscriptions TABLE HAS CORRECT SCHEMA
-- ============================================================================

-- Ensure push_subscriptions table has all needed columns
ALTER TABLE IF EXISTS push_subscriptions
  ADD COLUMN IF NOT EXISTS salon_id UUID,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

-- Create index for salon_id lookups (critical for notification delivery)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_salon_id 
  ON push_subscriptions(salon_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
  ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
  ON push_subscriptions(endpoint);

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Changes made:
-- 1. Dropped old realtime notification triggers
-- 2. Dropped old unused notification functions
-- 3. Recreated main push trigger to use send-push-notification only
-- 4. Ensured push_subscriptions table has all required columns
-- 5. Created indexes for performance
--
-- Result: Clean, single-source-of-truth notification system
-- Active function: /functions/v1/send-push-notification
-- Active trigger: trigger_push_notification_on_appointment
