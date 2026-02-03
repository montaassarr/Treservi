-- Create a private schema for secrets if it doesn't exist
create schema if not exists private;

-- Create the secrets table
create table if not exists private.secrets (
  key text primary key,
  value text not null
);

-- Secure the secrets table
revoke all on private.secrets from authenticated, anon, public;
grant select on private.secrets to service_role;
grant select on private.secrets to postgres;

-- Insert the secrets (These values come from the user input)
insert into private.secrets (key, value)
values
  ('supabase_url', 'https://czvsgtvienmchudyzqpk.supabase.co'),
  ('supabase_service_role_key', 'REDACTED_JWT')
on conflict (key) do update set value = excluded.value;

-- Create helper function to get secrets easily
create or replace function private.get_secret(secret_key text)
returns text as $$
  select value from private.secrets where key = secret_key;
$$ language sql security definer;

-- Update the notification trigger to use the table instead of current_setting
create or replace function public.trigger_realtime_notification()
returns trigger as $$
declare
  service_key text;
  project_url text;
begin
  -- Fetch secrets from the private table
  select value into service_key from private.secrets where key = 'supabase_service_role_key';
  select value into project_url from private.secrets where key = 'supabase_url';

  -- Call the edge function using pg_net
  PERFORM net.http_post(
    url := project_url || '/functions/v1/realtime-notification',
    body := jsonb_build_object(
      'record', row_to_json(new)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );
  
  return new;
end;
$$ language plpgsql security definer;
