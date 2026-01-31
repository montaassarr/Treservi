-- Fix broken policies that might cause 'invalid input syntax for type uuid: "anon"'
-- This happens when auth.uid() is evaluated for an anonymous user in a context where it's compared to a UUID column without being NULL.

-- 1. Fix "Staff can view their own appointments"
DROP POLICY IF EXISTS "Staff can view their own appointments" ON public.appointments;
CREATE POLICY "Staff can view their own appointments"
  ON public.appointments FOR SELECT
  USING (
    auth.role() = 'authenticated' AND staff_id = auth.uid()
  );

-- 2. Fix "Staff can insert appointments" (Not really used by public, but good to fix)
DROP POLICY IF EXISTS "Staff can insert appointments" ON public.appointments;
CREATE POLICY "Staff can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    salon_id IN (SELECT salon_id FROM public.staff WHERE id = auth.uid()) AND
    staff_id = auth.uid()
  );

-- 3. Fix "Staff can update their own appointments"
DROP POLICY IF EXISTS "Staff can update their own appointments" ON public.appointments;
CREATE POLICY "Staff can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND staff_id = auth.uid()
  );

-- 4. Fix "Staff can view stations" (Double check, I fixed it in previous migration but ensuring)
-- Already fixed in 20260130000001_fix_policies_uuid_error.sql

-- 5. Fix implicit staff self-view if any
-- The error is likely coming from a policy that does `... WHERE id = auth.uid()` on the staff table or similar.

-- Review "Staff can view stations" uses: `salon_id IN (SELECT salon_id FROM public.staff WHERE id = auth.uid())`
-- This subquery `SELECT salon_id FROM public.staff WHERE id = auth.uid()` is the danger zone.
-- If auth.uid() is 'anon' string (it shouldn't be, but if it is), it fails casting against `id` (uuid).
-- So we MUST gate `auth.uid()` usage with `auth.role() = 'authenticated'`.

-- Ensure fixing "Staff can view stations" again to be absolutely sure
DROP POLICY IF EXISTS "Staff can view stations" ON public.stations;
CREATE POLICY "Staff can view stations"
  ON public.stations FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND salon_id IN (SELECT salon_id FROM public.staff WHERE id = auth.uid()))
  );
