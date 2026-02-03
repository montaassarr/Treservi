-- PREREQUISITE:
-- 1. Go to Authentication > Users in Supabase Dashboard.
-- 2. Create a modified user with Email: admin@reservi.com and Password: password123 (or your choice).
-- 3. Run this script in SQL Editor AFTER creating the user.

-- Create a Default Salon
INSERT INTO public.salons (name, slug, owner_email, status)
VALUES ('Reservi Main Salon', 'reservi-main', 'admin@reservi.com', 'active')
ON CONFLICT DO NOTHING;

-- Link the Auth User to Staff Table as Super Admin
INSERT INTO public.staff (id, email, full_name, role, is_super_admin, salon_id, status)
SELECT 
    id, 
    email, 
    'System Administrator', 
    'owner', 
    true, 
    (SELECT id FROM public.salons WHERE slug = 'reservi-main'),
    'Active'
FROM auth.users

WHERE email = 'admin@reservi.com'
ON CONFLICT (id) DO UPDATE 
SET is_super_admin = true, role = 'owner', status = 'Active';

-- Verify
SELECT * FROM public.staff WHERE email = 'admin@reservi.com';
