-- Add role column to staff table to differentiate owner from staff
alter table public.staff 
  add column if not exists role text default 'staff' check (role in ('owner', 'staff'));

-- Update existing staff records based on owner_email match
update public.staff 
set role = 'owner'
where email in (select owner_email from public.salons);

-- Add index for role lookup
create index if not exists staff_role_idx on public.staff(role);

-- Add RLS policy for staff to view their own record
create policy "Staff can view their own record"
  on public.staff for select
  using (id = auth.uid());
