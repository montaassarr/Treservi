-- Migration: Update push_subscriptions table for enhanced notification architecture
-- Adds salon_id for targeted notifications and platform for analytics

-- Add salon_id column for targeting notifications to specific salons
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS salon_id uuid REFERENCES public.salons(id) ON DELETE SET NULL;

-- Add platform column to track device types
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'unknown';

-- Create index on salon_id for efficient lookups
CREATE INDEX IF NOT EXISTS push_subscriptions_salon_id_idx 
ON public.push_subscriptions(salon_id);

-- Create index on platform for analytics
CREATE INDEX IF NOT EXISTS push_subscriptions_platform_idx 
ON public.push_subscriptions(platform);

-- Update RLS policies to allow service role full access for sending notifications
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.push_subscriptions;

CREATE POLICY "Service role can manage all subscriptions"
ON public.push_subscriptions 
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update user policies to allow updating salon_id
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions 
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

COMMENT ON COLUMN public.push_subscriptions.salon_id IS 'Salon this subscription is associated with for targeted notifications';
COMMENT ON COLUMN public.push_subscriptions.platform IS 'Device platform: ios, android, or desktop';
