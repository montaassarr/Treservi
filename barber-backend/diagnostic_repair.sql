-- DIAGNOSTIC & REPAIR SCRIPT
-- Run this if you're getting 500 errors after reset

-- Step 1: Check table structures
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name IN ('staff', 'salons')
ORDER BY table_name, ordinal_position;

-- Step 2: Verify staff columns exist
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS role text DEFAULT 'staff' CHECK (role IN ('owner', 'staff'));
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Step 3: Verify salons columns exist
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled'));

-- Step 4: Fix RLS policies (disable temporarily to test)
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons DISABLE ROW LEVEL SECURITY;

-- Step 5: Verify your user and staff record
SELECT 'Auth Users' as check_point, COUNT(*) as count FROM auth.users WHERE email = 'admin@reservi.com'
UNION ALL
SELECT 'Salons', COUNT(*) FROM public.salons WHERE slug = 'reservi-main'
UNION ALL
SELECT 'Staff', COUNT(*) FROM public.staff WHERE email = 'admin@reservi.com';

-- Step 6: Re-enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- Step 7: If staff record is missing, create it now
INSERT INTO public.staff (id, email, full_name, role, is_super_admin, salon_id, status)
SELECT 
    u.id, 
    u.email, 
    'System Administrator', 
    'owner', 
    true, 
    s.id,
    'Active'
FROM auth.users u, public.salons s
WHERE u.email = 'admin@reservi.com' 
AND s.slug = 'reservi-main'
AND NOT EXISTS (
    SELECT 1 FROM public.staff WHERE id = u.id
)
ON CONFLICT (id) DO UPDATE 
SET role = 'owner', is_super_admin = true, status = 'Active';

-- Step 8: Verify final state
SELECT 'FINAL CHECK' as section;
SELECT * FROM public.salons WHERE slug = 'reservi-main';
SELECT * FROM public.staff WHERE email = 'admin@reservi.com';
