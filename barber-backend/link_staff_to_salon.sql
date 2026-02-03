-- FINAL FIX: Link staff to salon

-- Step 1: Check the salon exists
SELECT id, name, slug FROM public.salons WHERE slug = 'reservi-main';

-- Step 2: Link the staff member to the salon
UPDATE public.staff 
SET salon_id = (SELECT id FROM public.salons WHERE slug = 'reservi-main')
WHERE email = 'admin@reservi.com';

-- Step 3: Verify the link
SELECT id, email, full_name, salon_id, role, is_super_admin 
FROM public.staff 
WHERE email = 'admin@reservi.com';
