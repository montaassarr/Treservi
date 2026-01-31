-- Fix invalid input syntax for type uuid: "anon" primarily caused by eager evaluation or non-short-circuited evaluation of auth.uid().
-- Solution: Use CASE WHEN to strictly guard calls to auth.uid() so it is never evaluated for anonymous users.

-- 1. Fix public.staff "Staff can view their own record"
DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;
CREATE POLICY "Staff can view their own record"
  ON public.staff FOR SELECT
  USING (
    CASE WHEN auth.role() = 'authenticated' THEN id = auth.uid() ELSE false END
  );

-- 2. Fix public.staff "Owners and super admins can view staff"
DROP POLICY IF EXISTS "Owners and super admins can view staff" ON public.staff;
CREATE POLICY "Owners and super admins can view staff"
  ON public.staff FOR SELECT
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 3. Fix public.salons "Owners can view their salon"
DROP POLICY IF EXISTS "Owners can view their salon" ON public.salons;
CREATE POLICY "Owners can view their salon"
  ON public.salons FOR SELECT
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 4. Fix public.salons "Owners can update their salon"
DROP POLICY IF EXISTS "Owners can update their salon" ON public.salons;
CREATE POLICY "Owners can update their salon"
  ON public.salons FOR UPDATE
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 5. Fix public.services "Owners and super admins can view services"
DROP POLICY IF EXISTS "Owners and super admins can view services" ON public.services;
CREATE POLICY "Owners and super admins can view services"
  ON public.services FOR SELECT
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 6. Fix public.stations "Owners and super admins can manage stations"
DROP POLICY IF EXISTS "Owners and super admins can manage stations" ON public.stations;
CREATE POLICY "Owners and super admins can manage stations"
  ON public.stations FOR ALL
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 7. Fix public.appointments "Owners and super admins can view appointments"
DROP POLICY IF EXISTS "Owners and super admins can view appointments" ON public.appointments;
CREATE POLICY "Owners and super admins can view appointments"
  ON public.appointments FOR SELECT
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 8. Fix public.appointments "Staff can view their own appointments"
DROP POLICY IF EXISTS "Staff can view their own appointments" ON public.appointments;
CREATE POLICY "Staff can view their own appointments"
  ON public.appointments FOR SELECT
  USING (
    CASE WHEN auth.role() = 'authenticated' THEN staff_id = auth.uid() ELSE false END
  );
