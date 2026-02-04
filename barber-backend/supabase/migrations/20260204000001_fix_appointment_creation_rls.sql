-- FIX APPOINTMENT BOOKING RLS ISSUE
-- 403 Forbidden error when trying to create appointments
-- This ensures proper RLS policies and table grants are in place

-- Step 1: Ensure RLS is enabled on appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to avoid conflicts
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'appointments' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', policy_name);
    END LOOP;
END $$;

-- Step 3: Create clear, permissive policies for appointment creation

-- Policy 1: Allow ANYONE (authenticated or anon) to create appointments
CREATE POLICY "allow_anyone_create_appointments"
  ON public.appointments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Allow anyone to view appointments (needed for list/confirmation)
CREATE POLICY "allow_anyone_view_appointments"
  ON public.appointments FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy 3: Allow authenticated users to update appointments
CREATE POLICY "allow_authenticated_update_appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: Allow authenticated users to delete appointments
CREATE POLICY "allow_authenticated_delete_appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (true);

-- Step 4: Ensure proper grants to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;

-- Step 5: Check services table (read-only)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'services' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.services', policy_name);
    END LOOP;
END $$;

CREATE POLICY "allow_anyone_view_services"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.services TO authenticated, anon;
GRANT ALL ON public.services TO service_role;

-- Step 6: Ensure staff table is readable for lookups
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'staff' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff', policy_name);
    END LOOP;
END $$;

CREATE POLICY "allow_anyone_view_staff"
  ON public.staff FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "allow_staff_view_own_record"
  ON public.staff FOR SELECT
  TO authenticated
  USING (id = auth.uid());

GRANT SELECT ON public.staff TO authenticated, anon;
GRANT ALL ON public.staff TO service_role;

-- Step 7: Ensure salons table is readable
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'salons' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.salons', policy_name);
    END LOOP;
END $$;

CREATE POLICY "allow_anyone_view_salons"
  ON public.salons FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.salons TO authenticated, anon;
GRANT ALL ON public.salons TO service_role;
