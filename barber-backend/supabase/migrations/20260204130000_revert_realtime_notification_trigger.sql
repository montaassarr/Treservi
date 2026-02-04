-- Revert realtime notification trigger added after restore commit

-- Drop trigger and function if they exist
DROP TRIGGER IF EXISTS on_appointment_created_notify ON public.appointments;
DROP FUNCTION IF EXISTS public.notify_appointment_created();

-- Note: http extension is left installed as it may be used elsewhere
SELECT 'Reverted realtime notification trigger' AS status;
