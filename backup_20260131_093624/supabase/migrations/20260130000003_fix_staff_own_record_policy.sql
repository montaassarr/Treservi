-- Fix "Staff can view their own record" which causes invalid input syntax for type uuid: "anon"
-- when accessing the staff table as an anonymous user (because auth.uid() is checked against id).

DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;

CREATE POLICY "Staff can view their own record"
  ON public.staff FOR SELECT
  USING (
    auth.role() = 'authenticated' AND id = auth.uid()
  );
