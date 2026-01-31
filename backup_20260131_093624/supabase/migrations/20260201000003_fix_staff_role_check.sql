-- Drop the old restricted constraint
alter table public.staff drop constraint if exists staff_role_check;

-- Add the new constraint allowing 'super_admin'
alter table public.staff add constraint staff_role_check check (role in ('owner', 'staff', 'super_admin'));

-- Insert or Update the Super Admin profile
-- We use ON CONFLICT to handle cases where the profile might partially exist or if we want to update an existing one
insert into public.staff (id, full_name, email, role, is_super_admin, status, created_at, updated_at)
values (
  'f4e015cc-c549-4129-a9bf-0c46428aa9c3',
  'Super Admin',
  'montamoulaapp@resrvi.com',
  'super_admin',
  true,
  'Active',
  now(),
  now()
)
on conflict (id) do update
set 
  role = 'super_admin',
  is_super_admin = true,
  email = 'montamoulaapp@resrvi.com',
  status = 'Active';
