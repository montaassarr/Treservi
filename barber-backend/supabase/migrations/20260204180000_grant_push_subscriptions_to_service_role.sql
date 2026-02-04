-- Grant service_role permission to access push_subscriptions table
-- This is needed for backend services and edge functions to read/invoke push notifications

grant select on public.push_subscriptions to service_role;
grant insert on public.push_subscriptions to service_role;
grant update on public.push_subscriptions to service_role;
grant delete on public.push_subscriptions to service_role;

-- Ensure proper access to related sequences
grant usage, select on all sequences in schema public to service_role;
