-- CRITICAL FIX: Restore table permissions that were revoked
-- The remote schema pull accidentally revoked all grants

-- Grant permissions on STAFF table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO service_role;
GRANT SELECT ON public.staff TO anon;

-- Grant permissions on SALONS table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO service_role;
GRANT SELECT ON public.salons TO anon;

-- Grant permissions on APPOINTMENTS table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO service_role;
GRANT SELECT, INSERT ON public.appointments TO anon;

-- Grant permissions on SERVICES table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO service_role;
GRANT SELECT ON public.services TO anon;

-- Grant permissions on PUSH_SUBSCRIPTIONS table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;

-- Grant permissions on STATIONS table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stations TO service_role;
GRANT SELECT ON public.stations TO anon;
