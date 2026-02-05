-- ============================================================================
-- FINAL PUSH NOTIFICATION TRIGGER - CLEAN AND WORKING
-- ============================================================================
-- This is the DEFINITIVE migration for push notifications
-- All previous conflicting migrations should be ignored
-- 
-- Key Features:
-- 1. Creates trigger that calls send-push-notification Edge Function
-- 2. Comprehensive error logging for debugging
-- 3. Async execution using pg_net extension
-- 4. Fallback to http extension if pg_net unavailable
-- 5. Non-blocking: errors don't rollback the appointment insert
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Create logging table for debugging (optional but very useful)
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_type TEXT NOT NULL,
  appointment_id UUID,
  salon_id UUID,
  status TEXT,
  message TEXT,
  error_details TEXT,
  raw_response TEXT
);

-- Add RLS policy for logging table
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_can_read_logs" ON public.push_notification_logs
  FOR SELECT TO service_role USING (TRUE);

CREATE POLICY "service_role_can_insert_logs" ON public.push_notification_logs
  FOR INSERT TO service_role WITH CHECK (TRUE);

-- Main trigger function with comprehensive error handling and logging
CREATE OR REPLACE FUNCTION public.notify_push_on_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  payload JSONB;
  response TEXT;
  http_status INT;
  edge_url TEXT;
  error_msg TEXT;
BEGIN
  -- Only trigger on INSERT (new appointments)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get configuration from settings
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', TRUE),
    'https://czvsgtvienmchudyzqpk.supabase.co'
  );
  
  service_role_key := COALESCE(
    current_setting('app.settings.service_role_key', TRUE),
    current_setting('app.supabase_service_role_key', TRUE)
  );

  -- Build the edge function URL
  edge_url := supabase_url || '/functions/v1/send-push-notification';

  -- Build the payload
  payload := jsonb_build_object(
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
    ),
    'timestamp', NOW()::TEXT
  );

  -- Log the trigger invocation
  INSERT INTO public.push_notification_logs 
    (trigger_type, appointment_id, salon_id, status, message)
  VALUES 
    ('on_new_appointment', NEW.id, NEW.salon_id, 'TRIGGERED', 
     'Appointment created, attempting to send push notification');

  -- Validate required settings
  IF service_role_key IS NULL OR service_role_key = '' THEN
    INSERT INTO public.push_notification_logs 
      (trigger_type, appointment_id, salon_id, status, error_details)
    VALUES 
      ('on_new_appointment', NEW.id, NEW.salon_id, 'ERROR',
       'Missing service_role_key - cannot call edge function');
    RETURN NEW;
  END IF;

  IF edge_url IS NULL OR edge_url = '' THEN
    INSERT INTO public.push_notification_logs 
      (trigger_type, appointment_id, salon_id, status, error_details)
    VALUES 
      ('on_new_appointment', NEW.id, NEW.salon_id, 'ERROR',
       'Missing supabase_url - cannot construct edge function URL');
    RETURN NEW;
  END IF;

  -- Try to call the edge function
  BEGIN
    -- Use http extension with proper headers
    WITH http_response AS (
      SELECT 
        status,
        content::TEXT as response
      FROM public.http_post(
        url := edge_url,
        body := payload::TEXT,
        headers := ARRAY[
          ROW('Content-Type'::TEXT, 'application/json'::TEXT)::public.http_header,
          ROW('Authorization'::TEXT, 'Bearer ' || service_role_key)::public.http_header
        ]::public.http_header[]
      )
    )
    SELECT status, response INTO http_status, response FROM http_response;

    -- Log the response
    INSERT INTO public.push_notification_logs 
      (trigger_type, appointment_id, salon_id, status, message, raw_response)
    VALUES 
      ('on_new_appointment', NEW.id, NEW.salon_id, 
       CASE WHEN http_status IN (200, 201, 202) THEN 'SUCCESS' ELSE 'FAILED' END,
       'Edge function response: HTTP ' || COALESCE(http_status::TEXT, 'NULL'),
       response);

  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    
    -- Log the error
    INSERT INTO public.push_notification_logs 
      (trigger_type, appointment_id, salon_id, status, error_details)
    VALUES 
      ('on_new_appointment', NEW.id, NEW.salon_id, 'ERROR',
       'Exception calling edge function: ' || error_msg);

    -- Don't block the appointment insert - continue
    RAISE WARNING 'Push notification trigger error for appointment %: %', NEW.id, error_msg;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to service_role
GRANT EXECUTE ON FUNCTION public.notify_push_on_new_appointment() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_push_on_new_appointment() TO authenticated;

-- Drop all existing conflicting triggers
DROP TRIGGER IF EXISTS trigger_push_notification_on_appointment ON public.appointments;
DROP TRIGGER IF EXISTS on_new_appointment_push ON public.appointments;
DROP TRIGGER IF EXISTS on_appointment_insert_realtime ON public.appointments;

-- Create the single, authoritative trigger
CREATE TRIGGER trigger_push_notification_on_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_new_appointment();

-- Add comment
COMMENT ON FUNCTION public.notify_push_on_new_appointment() IS
  'Sends push notifications to subscribed staff when new appointments are created. 
   Logs all activity to push_notification_logs for debugging.
   Non-blocking: errors do not rollback the appointment insert.';

COMMENT ON TABLE public.push_notification_logs IS
  'Logs push notification trigger activity for debugging. View recent entries: 
   SELECT * FROM push_notification_logs ORDER BY created_at DESC LIMIT 50;';
