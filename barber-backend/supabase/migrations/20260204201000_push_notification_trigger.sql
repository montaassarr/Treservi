-- Database trigger to call push notification edge function on new appointments
-- This ensures notifications are sent automatically when appointments are created

-- Create or replace the function that triggers the edge function
CREATE OR REPLACE FUNCTION notify_push_on_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  result JSON;
BEGIN
  -- Only trigger on INSERT (new appointments)
  IF TG_OP = 'INSERT' THEN
    -- Call the edge function asynchronously using pg_net (if available)
    -- Otherwise, use http extension
    BEGIN
      -- Try using pg_net for async HTTP calls
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
      -- If pg_net is not available, log and continue
      -- The realtime notifications will still work
      RAISE NOTICE 'Push notification trigger: pg_net not available or error: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_push_notification_on_appointment ON appointments;

-- Create the trigger
CREATE TRIGGER trigger_push_notification_on_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_new_appointment();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_push_on_new_appointment() TO service_role;

-- Add comment
COMMENT ON FUNCTION notify_push_on_new_appointment() IS 
'Triggers push notification edge function when a new appointment is created';
