-- NUCLEAR RESET SCRIPT

-- 1. Truncate all data (Order matters for foreign keys)
TRUNCATE TABLE 
  public.notifications,
  public.appointments,
  public.services,
  public.staff,
  public.salons,
  public.push_subscriptions
RESTART IDENTITY CASCADE;

-- 2. Re-create the System Salon (Placeholder)
INSERT INTO public.salons (name, slug, owner_email, status)
VALUES ('System Admin HQ', 'admin-hq', 'admin@reservi.com', 'active');

-- 3. Re-seed the Super Admin (YOU)
-- Using the ID you provided earlier: 546832d8-d2e1-44bc-92e3-730cd0ce2256
INSERT INTO public.staff (id, email, full_name, role, is_super_admin, salon_id, status)
VALUES (
  '546832d8-d2e1-44bc-92e3-730cd0ce2256', 
  'admin@reservi.com', 
  'Super Admin', 
  'super_admin',  -- NOW VALID after constraint fix
  true,  -- is_super_admin 
  NULL,  -- salon_id IS NULL (Critical for successful routing to /admin/dashboard)
  'Active'
);

-- 4. Result
SELECT * FROM public.staff WHERE email = 'admin@reservi.com';
