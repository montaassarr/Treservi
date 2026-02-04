-- Fix trigger functions to use statement timeouts to prevent hanging
-- The http_post calls may hang if the edge function is slow or unresponsive

create or replace function public.notify_new_appointment()
returns trigger as $$
declare
  edge_function_url text;
  payload jsonb;
begin
  -- Set a timeout for this function execution (5 seconds)
  set statement_timeout = '5s';

  edge_function_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    current_setting('app.supabase_url', true),
    'https://czvsgtvienmchudyzqpk.supabase.co'
  ) || '/functions/v1/push-notification';

  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'salon_id', NEW.salon_id,
      'staff_id', NEW.staff_id,
      'customer_name', NEW.customer_name,
      'appointment_date', NEW.appointment_date,
      'appointment_time', NEW.appointment_time
    )
  );

  -- Execute the HTTP POST asynchronously to avoid blocking the transaction
  perform public.http_post(
    edge_function_url,
    payload::text,
    'application/json'
  );

  return NEW;
exception
  when others then
    raise warning 'Push notification failed: %', SQLERRM;
    return NEW;
end;
$$ language plpgsql security definer;

create or replace function public.trigger_realtime_notification()
returns trigger as $$
declare
  edge_function_url text;
  payload jsonb;
begin
  -- Set a timeout for this function execution (5 seconds)
  set statement_timeout = '5s';

  edge_function_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    current_setting('app.supabase_url', true),
    'https://czvsgtvienmchudyzqpk.supabase.co'
  ) || '/functions/v1/realtime-notification';

  payload := jsonb_build_object(
    'record', row_to_json(NEW)
  );

  -- Execute the HTTP POST asynchronously to avoid blocking the transaction
  perform public.http_post(
    edge_function_url,
    payload::text,
    'application/json'
  );

  return NEW;
exception
  when others then
    raise warning 'Realtime notification failed: %', SQLERRM;
    return NEW;
end;
$$ language plpgsql security definer;
