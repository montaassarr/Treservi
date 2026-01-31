-- Clean up duplicate RLS policies
-- These policies already exist and are causing errors on migration

-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Owners can delete their salon staff" ON public.staff;
DROP POLICY IF EXISTS "Owners can delete services for their salon" ON public.services;
DROP POLICY IF EXISTS "Owners can delete appointments for their salon" ON public.appointments;
DROP POLICY IF EXISTS "Owners can delete their salon" ON public.salons;

-- The existing policies from previous migrations should handle this
-- No new policies needed - just preventing duplicates
