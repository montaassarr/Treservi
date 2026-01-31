-- Fix "Owners and super admins can view staff" policy causing invalid input syntax for type uuid: "anon"
-- The issue is `is_user_super_admin(auth.uid())` attempts to cast auth.uid() (which is 'anon' text) to uuid.

-- Fix for public.staff
DROP POLICY IF EXISTS "Owners and super admins can view staff" ON public.staff;

CREATE POLICY "Owners and super admins can view staff"
  ON public.staff FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- Fix for public.appointments
DROP POLICY IF EXISTS "Owners and super admins can view appointments" ON public.appointments;

CREATE POLICY "Owners and super admins can view appointments"
  ON public.appointments FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- Fix for public.salons (if exists there too)
-- Check if "Super admins can view all salons" exists
-- (I recall seeing it in earlier searches or assumed)
-- Let's just run these two for now, as staff is the blocker.
