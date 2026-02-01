-- Create a database webhook to trigger push notifications on new appointments
-- Note: This uses Supabase's pg_net extension for HTTP calls

-- Enable pg_net extension if not already enabled
create extension if not exists pg_net with schema extensions;

-- Create function to call push notification edge function
create or replace function public.notify_new_appointment()
returns trigger as $$
declare
  edge_function_url text;
  payload jsonb;
begin
  -- Build the Edge Function URL
  -- Replace with your actual Supabase project URL
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/push-notification';
  
  -- If setting not available, use environment variable pattern
  if edge_function_url is null or edge_function_url = '/functions/v1/push-notification' then
    -- Fallback: You need to set this URL manually or via config
    edge_function_url := 'https://your-project.supabase.co/functions/v1/push-notification';
  end if;

  -- Prepare payload with new appointment data
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

  -- Make async HTTP request to Edge Function
  -- Using pg_net for non-blocking calls
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload::text
  );

  return NEW;
exception
  when others then
    -- Don't fail the insert if notification fails
    raise warning 'Push notification failed: %', SQLERRM;
    return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger on appointments table
drop trigger if exists on_new_appointment_push on public.appointments;

create trigger on_new_appointment_push
  after insert on public.appointments
  for each row
  execute function public.notify_new_appointment();

-- Grant necessary permissions
grant usage on schema net to postgres, anon, authenticated, service_role;
