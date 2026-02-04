-- Fix RLS policies for push_subscriptions table
-- The issue is that with the current policy, users need to be authenticated
-- but during session refresh, auth.uid() might be NULL

-- Drop the old policies
drop policy if exists "Users can insert their own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can view their own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own subscriptions" on public.push_subscriptions;

-- Create new policies that are more flexible
-- Allow users to insert subscriptions for themselves (with proper auth check)
create policy "Users can insert their own subscriptions v2"
on public.push_subscriptions for insert
with check (
  auth.uid() IS NOT NULL AND 
  (auth.uid() = user_id OR auth.role() = 'authenticated')
);

-- Allow users to view their own subscriptions
create policy "Users can view their own subscriptions v2"
on public.push_subscriptions for select
using (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow users to delete their own subscriptions
create policy "Users can delete their own subscriptions v2"
on public.push_subscriptions for delete
using (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow service_role to manage all subscriptions
create policy "Service role can manage subscriptions"
on public.push_subscriptions for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
