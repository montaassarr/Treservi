-- ARCHITECTURE VERIFICATION
-- Super Admin should NOT be linked to any salon
-- Super Admin manages the entire platform and all salons

-- Check Super Admin (should have salon_id = NULL)
SELECT id, email, full_name, salon_id, role, is_super_admin 
FROM public.staff 
WHERE email = 'admin@reservi.com';
-- Expected: salon_id = NULL, role = 'super_admin', is_super_admin = true

-- Check Salon Owners (should have salon_id set)
SELECT 
    s.id, 
    s.email, 
    s.full_name, 
    s.salon_id, 
    s.role, 
    s.is_super_admin,
    sal.name as salon_name
FROM public.staff s
LEFT JOIN public.salons sal ON s.salon_id = sal.id
WHERE s.role = 'owner';
-- Expected: salon_id = their salon UUID, role = 'owner', is_super_admin = false

-- Check all staff hierarchy
SELECT 
    s.email,
    s.role,
    s.is_super_admin,
    CASE 
        WHEN s.salon_id IS NULL THEN 'Platform Level (All Salons)'
        ELSE sal.name
    END as scope
FROM public.staff s
LEFT JOIN public.salons sal ON s.salon_id = sal.id
ORDER BY s.is_super_admin DESC, s.role;
