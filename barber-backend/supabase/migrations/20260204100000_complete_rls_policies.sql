-- Comprehensive RLS Policy Fix for Production
-- Ensure all tables have proper INSERT, SELECT, UPDATE, DELETE policies

-- Enable RLS on all tables
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_anyone_create_salons" ON public.salons;
DROP POLICY IF EXISTS "allow_anyone_view_salons" ON public.salons;
DROP POLICY IF EXISTS "allow_update_salons" ON public.salons;
DROP POLICY IF EXISTS "allow_delete_salons" ON public.salons;

DROP POLICY IF EXISTS "allow_anyone_create_services" ON public.services;
DROP POLICY IF EXISTS "allow_anyone_view_services" ON public.services;
DROP POLICY IF EXISTS "allow_update_services" ON public.services;
DROP POLICY IF EXISTS "allow_delete_services" ON public.services;

DROP POLICY IF EXISTS "allow_anyone_create_staff" ON public.staff;
DROP POLICY IF EXISTS "allow_anyone_view_staff" ON public.staff;
DROP POLICY IF EXISTS "allow_update_staff" ON public.staff;
DROP POLICY IF EXISTS "allow_delete_staff" ON public.staff;

DROP POLICY IF EXISTS "allow_anyone_create_appointments" ON public.appointments;
DROP POLICY IF EXISTS "allow_anyone_view_appointments" ON public.appointments;
DROP POLICY IF EXISTS "allow_update_appointments" ON public.appointments;
DROP POLICY IF EXISTS "allow_delete_appointments" ON public.appointments;

DROP POLICY IF EXISTS "allow_create_stations" ON public.stations;
DROP POLICY IF EXISTS "allow_view_stations" ON public.stations;
DROP POLICY IF EXISTS "allow_update_stations" ON public.stations;
DROP POLICY IF EXISTS "allow_delete_stations" ON public.stations;

-- SALONS - Complete CRUD policies
CREATE POLICY "allow_anyone_create_salons" ON public.salons FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_anyone_view_salons" ON public.salons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_update_salons" ON public.salons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_salons" ON public.salons FOR DELETE TO anon, authenticated USING (true);

-- SERVICES - Complete CRUD policies
CREATE POLICY "allow_anyone_create_services" ON public.services FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_anyone_view_services" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_update_services" ON public.services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_services" ON public.services FOR DELETE TO anon, authenticated USING (true);

-- STAFF - Complete CRUD policies
CREATE POLICY "allow_anyone_create_staff" ON public.staff FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_anyone_view_staff" ON public.staff FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_update_staff" ON public.staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_staff" ON public.staff FOR DELETE TO anon, authenticated USING (true);

-- APPOINTMENTS - Complete CRUD policies
CREATE POLICY "allow_anyone_create_appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_anyone_view_appointments" ON public.appointments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_update_appointments" ON public.appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_appointments" ON public.appointments FOR DELETE TO anon, authenticated USING (true);

-- STATIONS - Complete CRUD policies
CREATE POLICY "allow_create_stations" ON public.stations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_view_stations" ON public.stations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_update_stations" ON public.stations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_stations" ON public.stations FOR DELETE TO anon, authenticated USING (true);

-- Grant basic permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stations TO anon, authenticated;
