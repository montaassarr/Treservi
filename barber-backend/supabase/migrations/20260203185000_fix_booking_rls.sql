-- Fix RLS policies for appointment booking
-- The issue: authenticated users booking appointments get denied
-- because existing policies only cover specific owner/staff scenarios

-- Drop problematic policies that might be interfering
DROP POLICY IF EXISTS "Public can book appointments" ON public.appointments;
DROP POLICY IF EXISTS "Owners can insert appointments for their salon" ON public.appointments;
DROP POLICY IF EXISTS "Staff can insert their own appointments" ON public.appointments;

-- Create a single permissive INSERT policy that allows anyone
-- (both anon and authenticated) to create appointments
CREATE POLICY "Anyone can book appointments"
  ON public.appointments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure owners can still manage their salon's appointments
CREATE POLICY "Owners can manage salon appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    salon_id IN (
      SELECT salon_id FROM public.staff 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    salon_id IN (
      SELECT salon_id FROM public.staff 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Super admins can manage all appointments
CREATE POLICY "Super admins can manage all appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Staff can view and update their assigned appointments
CREATE POLICY "Staff can view their appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Staff can update their appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());
