-- Fix salons table RLS to allow anon users to create salons
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

-- Create permissive policies
CREATE POLICY "allow_anyone_create_salons"
  ON public.salons FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "allow_anyone_view_salons"
  ON public.salons FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "allow_update_salons"
  ON public.salons FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_delete_salons"
  ON public.salons FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO authenticated;
GRANT SELECT, INSERT ON public.salons TO anon;
GRANT ALL ON public.salons TO service_role;
