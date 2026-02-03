-- Create trigger to send realtime notifications when appointments are created
create or replace function public.trigger_realtime_notification()
returns trigger as $$
begin
  -- Call the edge function to send realtime notifications
  -- This is async via pg_net, so it won't block the INSERT
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/realtime-notification',
    body := jsonb_build_object(
      'record', row_to_json(new)
    ),
    headers := jsonb_object_agg('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'))
  );
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists
drop trigger if exists on_appointment_insert_realtime on public.appointments;

-- Create trigger on appointments INSERT
create trigger on_appointment_insert_realtime
after insert on public.appointments
for each row
execute function public.trigger_realtime_notification();
