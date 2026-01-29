-- Fix invalid input syntax for type uuid: "anon" in extensive RLS policies.
-- The issue propagates from the use of is_user_super_admin(auth.uid()) where auth.uid() can be 'anon' text.
-- Since policies are recursive (staff policy queries salons, so salons policy must be valid), we must fix ALL.

-- 1. Fix public.salons
DROP POLICY IF EXISTS "Owners can view their salon" ON public.salons;
CREATE POLICY "Owners can view their salon"
  ON public.salons FOR SELECT
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Owners can update their salon" ON public.salons;
CREATE POLICY "Owners can update their salon"
  ON public.salons FOR UPDATE
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- 2. Fix public.services
DROP POLICY IF EXISTS "Owners and super admins can view services" ON public.services;
CREATE POLICY "Owners and super admins can view services"
  ON public.services FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- 3. Fix public.stations (The 'Owners and super admins' policy)
DROP POLICY IF EXISTS "Owners and super admins can manage stations" ON public.stations;
CREATE POLICY "Owners and super admins can manage stations"
  ON public.stations FOR ALL
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- 4. public.staff and public.appointments were fixed in previous migrations, 
-- but if those failed or were partial, these above fixes should handle the transitive dependencies 
-- (e.g. staff accessing salons).

