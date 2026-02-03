-- Fix for infinite Recursion in RLS policies

-- 1. Create a secure function to check admin status without triggering RLS recursion
-- SECURITY DEFINER means this runs with the privileges of the creator (postgres), 
-- bypassing the RLS on the 'staff' table itself.
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.staff WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Update 'staff' policies to use this function
DROP POLICY IF EXISTS "Super admins can do everything" ON public.staff;
CREATE POLICY "Super admins can do everything" 
ON public.staff 
FOR ALL 
USING (check_is_super_admin());

-- 3. Update 'salons' policies to use this function
DROP POLICY IF EXISTS "Super admins can view all salons" ON public.salons;
CREATE POLICY "Super admins can view all salons" 
ON public.salons 
FOR SELECT 
USING (check_is_super_admin());

-- 4. Ensure basic self-access for staff still works (if not already covered)
-- (Dropping potentially conflicting policies if they exist, to be safe)
-- Note: 'Users can view their own profile' is usually standard, but let's ensure we don't break it.
-- We won't drop other policies, just ensuring the Admin one is fixed.
