-- Check existing policies
SELECT tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('salons', 'services', 'staff', 'appointments')
ORDER BY tablename, policyname;
