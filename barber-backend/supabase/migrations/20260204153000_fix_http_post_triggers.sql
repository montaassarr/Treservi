-- Fix HTTP trigger functions to use http extension instead of pg_net

create extension if not exists "http" with schema "public";

create or replace function public.notify_new_appointment()
returns trigger as $$
declare
  edge_function_url text;
  payload jsonb;
  service_key text;
  auth_header public.http_header;
begin
  edge_function_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    current_setting('app.supabase_url', true)
  ) || '/functions/v1/push-notification';

  if edge_function_url is null or edge_function_url = '/functions/v1/push-notification' then
    edge_function_url := 'https://czvsgtvienmchudyzqpk.supabase.co/functions/v1/push-notification';
  end if;

  service_key := coalesce(
    current_setting('app.settings.service_role_key', true),
    current_setting('app.supabase_service_role_key', true)
  );

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

  if service_key is null then
    raise warning 'Push notification failed: missing service role key in settings';
    return NEW;
  end if;

  auth_header := row('Authorization', 'Bearer ' || service_key)::public.http_header;

  perform public.http_post(
    edge_function_url,
    payload::text,
    'application/json',
    array[auth_header]
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
  service_key text;
  auth_header public.http_header;
begin
  edge_function_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    current_setting('app.supabase_url', true)
  ) || '/functions/v1/realtime-notification';

  if edge_function_url is null or edge_function_url = '/functions/v1/realtime-notification' then
    edge_function_url := 'https://czvsgtvienmchudyzqpk.supabase.co/functions/v1/realtime-notification';
  end if;

  service_key := coalesce(
    current_setting('app.settings.service_role_key', true),
    current_setting('app.supabase_service_role_key', true)
  );

  payload := jsonb_build_object(
    'record', row_to_json(NEW)
  );

  if service_key is null then
    raise warning 'Realtime notification failed: missing service role key in settings';
    return NEW;
  end if;

  auth_header := row('Authorization', 'Bearer ' || service_key)::public.http_header;

  perform public.http_post(
    edge_function_url,
    payload::text,
    'application/json',
    array[auth_header]
  );

  return NEW;
exception
  when others then
    raise warning 'Realtime notification failed: %', SQLERRM;
    return NEW;
end;
$$ language plpgsql security definer;

-- Recreate triggers to ensure they point at updated functions

drop trigger if exists on_new_appointment_push on public.appointments;
create trigger on_new_appointment_push
  after insert on public.appointments
  for each row
  execute function public.notify_new_appointment();

drop trigger if exists on_appointment_insert_realtime on public.appointments;
create trigger on_appointment_insert_realtime
  after insert on public.appointments
  for each row
  execute function public.trigger_realtime_notification();
