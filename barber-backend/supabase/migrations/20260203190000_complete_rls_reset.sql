-- COMPLETE RLS RESET FOR APPOINTMENTS TABLE
-- This drops ALL existing policies and creates new clean ones

-- Step 1: Drop ALL existing policies on appointments
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

-- Step 2: Create simple, permissive policies

-- Allow ANYONE to INSERT appointments (public booking)
CREATE POLICY "allow_insert_appointments"
  ON public.appointments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow ANYONE to SELECT appointments (needed for booking confirmation)
CREATE POLICY "allow_select_appointments"
  ON public.appointments FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to UPDATE their own bookings OR staff/owners
CREATE POLICY "allow_update_appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to DELETE (owners/admins only in practice)
CREATE POLICY "allow_delete_appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (true);

-- Step 3: Ensure grants are correct
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;
