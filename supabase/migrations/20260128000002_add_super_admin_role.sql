-- Add super_admin column to staff table
alter table public.staff add column if not exists is_super_admin boolean default false;

-- Create an index for super admin lookups
create index if not exists staff_is_super_admin_idx on public.staff(is_super_admin);

-- Add a function to check if user is super admin
create or replace function is_user_super_admin(user_id uuid)
returns boolean as $$
begin
  return exists(
    select 1 from public.staff 
    where id = user_id and is_super_admin = true
  );
end;
$$ language plpgsql security definer;

-- Update RLS policy for salons to allow super admins to view all
drop policy if exists "Owners can view their salon" on public.salons;

create policy "Owners can view their salon"
  on public.salons for select
  using (
    owner_email = auth.jwt()->>'email' 
    or is_user_super_admin(auth.uid())
  );

drop policy if exists "Owners can update their salon" on public.salons;

create policy "Owners can update their salon"
  on public.salons for update
  using (
    owner_email = auth.jwt()->>'email'
    or is_user_super_admin(auth.uid())
  );

-- Allow super admins to view all staff across all salons
drop policy if exists "Owners can view their salon staff" on public.staff;

create policy "Owners and super admins can view staff"
  on public.staff for select
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
    or is_user_super_admin(auth.uid())
  );

-- Allow super admins to view all appointments
drop policy if exists "Owners can view appointments for their salon" on public.appointments;

create policy "Owners and super admins can view appointments"
  on public.appointments for select
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
    or is_user_super_admin(auth.uid())
  );

-- Allow super admins to view all services
drop policy if exists "Owners can view services for their salon" on public.services;

create policy "Owners and super admins can view services"
  on public.services for select
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
    or is_user_super_admin(auth.uid())
  );

-- Allow super admins to view all stations
drop policy if exists "Owners can manage stations" on public.stations;

create policy "Owners and super admins can manage stations"
  on public.stations for all
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
    or is_user_super_admin(auth.uid())
  );
