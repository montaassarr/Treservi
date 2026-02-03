-- Fix the role column constraint to allow 'super_admin' value
-- The original constraint only allowed ('owner', 'staff')

-- 1. Drop the old constraint
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;

-- 2. Add the new constraint including 'super_admin'
ALTER TABLE public.staff 
ADD CONSTRAINT staff_role_check CHECK (role IN ('owner', 'staff', 'super_admin'));
