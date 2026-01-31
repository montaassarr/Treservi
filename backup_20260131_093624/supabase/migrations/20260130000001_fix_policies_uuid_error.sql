-- Fix UUID error by ensuring auth.uid() is only called for authenticated users,
-- or safe-guarding the policy execution.

-- 1. Drop potentially problematic policies
DROP POLICY IF EXISTS "Staff can view stations" ON public.stations;

-- 2. Recreate with safety check
CREATE POLICY "Staff can view stations"
  ON public.stations FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND 
    salon_id IN (
      SELECT salon_id FROM public.staff WHERE id = auth.uid()
    )
  );
