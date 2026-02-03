-- Data Migration: Unlink Super Admin from placeholder salon
-- This ensures the frontend routes them to /admin/dashboard instead of /admin-hq/dashboard

UPDATE public.staff 
SET salon_id = NULL 
WHERE email = 'admin@reservi.com' AND is_super_admin = true;
