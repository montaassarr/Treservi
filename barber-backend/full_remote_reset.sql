-- FULL RESET SCRIPT FOR SUPABASE DASHBOARD
-- RUN THIS IN THE SQL EDITOR

-- 1. Drop Schema (Nuclear)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
-- Fix permissions for Storage/Auth if needed (optional but good)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


-- ==========================================
-- MIGRATION: 20260126000001_create_staff_tables.sql
-- ==========================================
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create salons table
create table if not exists public.salons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_email text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create staff table
create table if not exists public.staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  specialty text,
  status text default 'Active' check (status in ('Active', 'Inactive')),
  avatar_url text,
  salon_id uuid references public.salons(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists staff_salon_id_idx on public.staff(salon_id);
create index if not exists staff_email_idx on public.staff(email);

-- Enable RLS
alter table public.salons enable row level security;
alter table public.staff enable row level security;

-- RLS Policies for staff table (owners can CRUD their salon's staff)
create policy "Owners can view their salon staff"
  on public.staff for select
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can insert staff for their salon"
  on public.staff for insert
  with check (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can update their salon staff"
  on public.staff for update
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can delete their salon staff"
  on public.staff for delete
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for salons (owners can view/edit own salon)
create policy "Owners can view their salon"
  on public.salons for select
  using (owner_email = auth.jwt()->>'email');

create policy "Owners can update their salon"
  on public.salons for update
  using (owner_email = auth.jwt()->>'email');


-- ==========================================
-- MIGRATION: 20260127000002_create_appointments_services.sql
-- ==========================================
-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- Create services table
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null,
  duration integer not null, -- Duration in minutes
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create appointments table
create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  customer_avatar text,
  appointment_date date not null,
  appointment_time time not null,
  status text default 'Pending' check (status in ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  amount numeric(10, 2) not null,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for performance
create index if not exists services_salon_id_idx on public.services(salon_id);
create index if not exists appointments_salon_id_idx on public.appointments(salon_id);
create index if not exists appointments_staff_id_idx on public.appointments(staff_id);
create index if not exists appointments_date_idx on public.appointments(appointment_date);
create index if not exists appointments_status_idx on public.appointments(status);

-- Enable RLS
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- RLS Policies for services table
-- Owners can manage all services for their salon
create policy "Owners can view services for their salon"
  on public.services for select
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can insert services for their salon"
  on public.services for insert
  with check (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can update services for their salon"
  on public.services for update
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can delete services for their salon"
  on public.services for delete
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- Staff can view services for their salon
create policy "Staff can view services for their salon"
  on public.services for select
  using (
    salon_id in (
      select salon_id from public.staff where id = auth.uid()
    )
  );

-- RLS Policies for appointments table
-- Owners can manage all appointments for their salon
create policy "Owners can view appointments for their salon"
  on public.appointments for select
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can insert appointments for their salon"
  on public.appointments for insert
  with check (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can update appointments for their salon"
  on public.appointments for update
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Owners can delete appointments for their salon"
  on public.appointments for delete
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- Staff can ONLY view and manage their own appointments
create policy "Staff can view their own appointments"
  on public.appointments for select
  using (
    staff_id = auth.uid()
  );

create policy "Staff can insert their own appointments"
  on public.appointments for insert
  with check (
    staff_id = auth.uid()
  );

create policy "Staff can update their own appointments"
  on public.appointments for update
  using (
    staff_id = auth.uid()
  );

-- Staff cannot delete appointments (only owners can)
-- No delete policy for staff means they cannot delete

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_services_updated_at
  before update on public.services
  for each row
  execute function update_updated_at_column();

create trigger update_appointments_updated_at
  before update on public.appointments
  for each row
  execute function update_updated_at_column();

-- Insert some default services for demo purposes
insert into public.services (salon_id, name, price, duration, description) 
select 
  id,
  'Classic Cut',
  30.00,
  30,
  'Traditional haircut with scissors and clippers'
from public.salons
where not exists (select 1 from public.services where name = 'Classic Cut')
limit 1;

insert into public.services (salon_id, name, price, duration, description)
select 
  id,
  'Fade & Beard Trim',
  45.00,
  45,
  'Modern fade haircut with beard sculpting'
from public.salons
where not exists (select 1 from public.services where name = 'Fade & Beard Trim')
limit 1;

insert into public.services (salon_id, name, price, duration, description)
select 
  id,
  'Hair Styling',
  55.00,
  60,
  'Professional hair styling and treatment'
from public.salons
where not exists (select 1 from public.services where name = 'Hair Styling')
limit 1;

insert into public.services (salon_id, name, price, duration, description)
select 
  id,
  'Hot Towel Shave',
  35.00,
  30,
  'Traditional hot towel shave experience'
from public.salons
where not exists (select 1 from public.services where name = 'Hot Towel Shave')
limit 1;


-- ==========================================
-- MIGRATION: 20260127000003_add_role_to_staff.sql
-- ==========================================
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


-- ==========================================
-- MIGRATION: 20260127000004_create_stations_tables.sql
-- ==========================================
-- Create stations table
create table if not exists public.stations (
  id uuid primary key default uuid_generate_v4(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null,
  type text not null check (type in ('chair', 'desk', 'table')),
  current_staff_id uuid references public.staff(id) on delete set null,
  position_x numeric default 0,
  position_y numeric default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.stations enable row level security;

-- Policies
create policy "Owners can manage stations"
  on public.stations for all
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

create policy "Staff can view stations"
  on public.stations for select
  using (
    salon_id in (
      select salon_id from public.staff where id = auth.uid()
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.stations;


-- ==========================================
-- MIGRATION: 20260127000005_update_staff_permissions.sql
-- ==========================================
-- Restrict Staff to see only their own appointments
drop policy if exists "Staff can view appointments for their salon" on public.appointments;
drop policy if exists "Staff can view their own appointments" on public.appointments;
drop policy if exists "Staff can insert appointments" on public.appointments;
drop policy if exists "Staff can update their own appointments" on public.appointments;

create policy "Staff can view their own appointments"
  on public.appointments for select
  using (
    staff_id = auth.uid()
  );

create policy "Staff can insert appointments"
  on public.appointments for insert
  with check (
    salon_id in (
        select salon_id from public.staff where id = auth.uid()
    )
    AND
    staff_id = auth.uid()
  );

create policy "Staff can update their own appointments"
  on public.appointments for update
  using (
    staff_id = auth.uid()
  );

-- Ensure owners can still see everything (already covered by existing owner policies, but verifying logic)


-- ==========================================
-- MIGRATION: 20260127000006_update_stations_schema.sql
-- ==========================================

-- Update stations table to allow 'sofa' and add width
alter table public.stations drop constraint if exists stations_type_check;
alter table public.stations add constraint stations_type_check check (type in ('chair', 'desk', 'table', 'sofa'));

-- Add width column if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='stations' and column_name='width') then
    alter table public.stations add column width integer default null;
  end if;
end $$;


-- ==========================================
-- MIGRATION: 20260128000001_add_salon_slug.sql
-- ==========================================
-- Add slug column to salons table
alter table public.salons add column if not exists slug text unique;

-- Create index for slug lookups
create index if not exists salons_slug_idx on public.salons(slug);

-- Function to generate slug from name
create or replace function generate_slug(name text) returns text as $$
declare
  base_slug text;
  final_slug text;
  counter integer := 0;
begin
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(trim(name), '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  
  final_slug := base_slug;
  
  -- Check if slug exists and append counter if needed
  while exists (select 1 from public.salons where slug = final_slug) loop
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  end loop;
  
  return final_slug;
end;
$$ language plpgsql;

-- Update existing salons with slugs
update public.salons 
set slug = generate_slug(name)
where slug is null;

-- Make slug required for new entries
alter table public.salons alter column slug set not null;

-- Trigger to auto-generate slug on insert if not provided
create or replace function set_salon_slug() returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := generate_slug(new.name);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger salon_slug_trigger
  before insert or update on public.salons
  for each row
  execute function set_salon_slug();

-- Add RLS policy for public slug lookup
create policy "Anyone can lookup salon by slug"
  on public.salons for select
  using (true);

-- Note: This allows public read but still maintains write restrictions


-- ==========================================
-- MIGRATION: 20260128000002_add_super_admin_role.sql
-- ==========================================
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


-- ==========================================
-- MIGRATION: 20260128000003_add_salon_status_and_features.sql
-- ==========================================
-- Add status and additional fields to salons table
alter table public.salons add column if not exists status text default 'active' check (status in ('active', 'suspended', 'cancelled'));
alter table public.salons add column if not exists logo_url text;
alter table public.salons add column if not exists subscription_plan text default 'free' check (subscription_plan in ('free', 'starter', 'professional', 'enterprise'));
alter table public.salons add column if not exists contact_phone text;
alter table public.salons add column if not exists contact_email text;
alter table public.salons add column if not exists address text;
alter table public.salons add column if not exists city text;
alter table public.salons add column if not exists country text;

-- Create indexes for commonly queried fields
create index if not exists salons_status_idx on public.salons(status);
create index if not exists salons_subscription_plan_idx on public.salons(subscription_plan);
create index if not exists salons_owner_email_idx on public.salons(owner_email);

-- Add total_revenue tracking for salons
alter table public.salons add column if not exists total_revenue numeric(15, 2) default 0;

-- Create a function to update salon total revenue when appointments change
create or replace function update_salon_revenue()
returns trigger as $$
declare
  appointment_amount numeric(10, 2);
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.status = 'Completed' then
      update public.salons 
      set total_revenue = total_revenue + coalesce(new.amount, 0)
      where id = new.salon_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'Completed' then
      update public.salons 
      set total_revenue = total_revenue - coalesce(old.amount, 0)
      where id = old.salon_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger for revenue updates
drop trigger if exists appointment_revenue_trigger on public.appointments;

create trigger appointment_revenue_trigger
  after insert or update or delete on public.appointments
  for each row
  execute function update_salon_revenue();

-- Allow super admins to view all salons
create policy "Super admins can view all salons"
  on public.salons for select
  using (is_user_super_admin(auth.uid()));

-- Allow super admins to view salon statistics (if needed for analytics)
grant select on public.salons to authenticated;


-- ==========================================
-- MIGRATION: 20260129000001_add_public_access.sql
-- ==========================================
-- Allow public to view stations
create policy "Public can view stations"
  on public.stations for select
  using (true);

-- Allow public to view services
create policy "Public can view services"
  on public.services for select
  using (true);

-- Allow public to view active staff
create policy "Public can view active staff"
  on public.staff for select
  using (status = 'Active');

-- Allow public to insert appointments (bookings)
create policy "Public can book appointments"
  on public.appointments for insert
  with check (true);


-- ==========================================
-- MIGRATION: 20260129000010_enable_public_booking.sql
-- ==========================================
-- Allow public (unauthenticated) users to book appointments
-- This enables anyone to create a booking without needing to authenticate

-- First, drop old restrictive policies if they exist
drop policy if exists "Owners can insert appointments for their salon" on public.appointments;

-- Allow anyone (authenticated or not) to book an appointment
create policy "Anyone can create an appointment"
  on public.appointments for insert
  with check (
    salon_id is not null and
    appointment_date is not null and
    appointment_time is not null and
    customer_name is not null
  );

-- Allow anyone to view appointments (for availability checking)
create policy "Anyone can view appointments"
  on public.appointments for select
  using (true);

-- Owners can still insert appointments for their salon (override)
create policy "Owners can insert appointments"
  on public.appointments for insert
  with check (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- Owners can view all appointments for their salon
create policy "Owners can view all appointments"
  on public.appointments for select
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- Owners can update their salon's appointments
create policy "Owners can update appointments"
  on public.appointments for update
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );


-- ==========================================
-- MIGRATION: 20260130000001_fix_policies_uuid_error.sql
-- ==========================================
-- Fix UUID error by ensuring auth.uid() is only called for authenticated users,
-- or safe-guarding the policy execution.

-- 1. Drop potentially problematic policies
DROP POLICY IF EXISTS "Staff can view stations" ON public.stations;

-- 2. Recreate with safety check
CREATE POLICY "Staff can view stations"
  ON public.stations FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND 
    salon_id IN (
      SELECT salon_id FROM public.staff WHERE id = auth.uid()
    )
  );


-- ==========================================
-- MIGRATION: 20260130000002_fix_more_policies.sql
-- ==========================================
-- Fix broken policies that might cause 'invalid input syntax for type uuid: "anon"'
-- This happens when auth.uid() is evaluated for an anonymous user in a context where it's compared to a UUID column without being NULL.

-- 1. Fix "Staff can view their own appointments"
DROP POLICY IF EXISTS "Staff can view their own appointments" ON public.appointments;
CREATE POLICY "Staff can view their own appointments"
  ON public.appointments FOR SELECT
  USING (
    auth.role() = 'authenticated' AND staff_id = auth.uid()
  );

-- 2. Fix "Staff can insert appointments" (Not really used by public, but good to fix)
DROP POLICY IF EXISTS "Staff can insert appointments" ON public.appointments;
CREATE POLICY "Staff can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    salon_id IN (SELECT salon_id FROM public.staff WHERE id = auth.uid()) AND
    staff_id = auth.uid()
  );

-- 3. Fix "Staff can update their own appointments"
DROP POLICY IF EXISTS "Staff can update their own appointments" ON public.appointments;
CREATE POLICY "Staff can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND staff_id = auth.uid()
  );

-- 4. Fix "Staff can view stations" (Double check, I fixed it in previous migration but ensuring)
-- Already fixed in 20260130000001_fix_policies_uuid_error.sql

-- 5. Fix implicit staff self-view if any
-- The error is likely coming from a policy that does `... WHERE id = auth.uid()` on the staff table or similar.

-- Review "Staff can view stations" uses: `salon_id IN (SELECT salon_id FROM public.staff WHERE id = auth.uid())`
-- This subquery `SELECT salon_id FROM public.staff WHERE id = auth.uid()` is the danger zone.
-- If auth.uid() is 'anon' string (it shouldn't be, but if it is), it fails casting against `id` (uuid).
-- So we MUST gate `auth.uid()` usage with `auth.role() = 'authenticated'`.

-- Ensure fixing "Staff can view stations" again to be absolutely sure
DROP POLICY IF EXISTS "Staff can view stations" ON public.stations;
CREATE POLICY "Staff can view stations"
  ON public.stations FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND salon_id IN (SELECT salon_id FROM public.staff WHERE id = auth.uid()))
  );


-- ==========================================
-- MIGRATION: 20260130000003_fix_staff_own_record_policy.sql
-- ==========================================
-- Fix "Staff can view their own record" which causes invalid input syntax for type uuid: "anon"
-- when accessing the staff table as an anonymous user (because auth.uid() is checked against id).

DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;

CREATE POLICY "Staff can view their own record"
  ON public.staff FOR SELECT
  USING (
    auth.role() = 'authenticated' AND id = auth.uid()
  );


-- ==========================================
-- MIGRATION: 20260130000004_fix_super_admin_policy.sql
-- ==========================================
-- Fix "Owners and super admins can view staff" policy causing invalid input syntax for type uuid: "anon"
-- The issue is `is_user_super_admin(auth.uid())` attempts to cast auth.uid() (which is 'anon' text) to uuid.

-- Fix for public.staff
DROP POLICY IF EXISTS "Owners and super admins can view staff" ON public.staff;

CREATE POLICY "Owners and super admins can view staff"
  ON public.staff FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- Fix for public.appointments
DROP POLICY IF EXISTS "Owners and super admins can view appointments" ON public.appointments;

CREATE POLICY "Owners and super admins can view appointments"
  ON public.appointments FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- Fix for public.salons (if exists there too)
-- Check if "Super admins can view all salons" exists
-- (I recall seeing it in earlier searches or assumed)
-- Let's just run these two for now, as staff is the blocker.


-- ==========================================
-- MIGRATION: 20260130000005_fix_all_policies_final.sql
-- ==========================================
-- Fix invalid input syntax for type uuid: "anon" in extensive RLS policies.
-- The issue propagates from the use of is_user_super_admin(auth.uid()) where auth.uid() can be 'anon' text.
-- Since policies are recursive (staff policy queries salons, so salons policy must be valid), we must fix ALL.

-- 1. Fix public.salons
DROP POLICY IF EXISTS "Owners can view their salon" ON public.salons;
CREATE POLICY "Owners can view their salon"
  ON public.salons FOR SELECT
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Owners can update their salon" ON public.salons;
CREATE POLICY "Owners can update their salon"
  ON public.salons FOR UPDATE
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- 2. Fix public.services
DROP POLICY IF EXISTS "Owners and super admins can view services" ON public.services;
CREATE POLICY "Owners and super admins can view services"
  ON public.services FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- 3. Fix public.stations (The 'Owners and super admins' policy)
DROP POLICY IF EXISTS "Owners and super admins can manage stations" ON public.stations;
CREATE POLICY "Owners and super admins can manage stations"
  ON public.stations FOR ALL
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email'
    )
    OR 
    (auth.role() = 'authenticated' AND is_user_super_admin(auth.uid()))
  );

-- 4. public.staff and public.appointments were fixed in previous migrations, 
-- but if those failed or were partial, these above fixes should handle the transitive dependencies 
-- (e.g. staff accessing salons).



-- ==========================================
-- MIGRATION: 20260130000006_fix_uuid_safe_eval.sql
-- ==========================================
-- Fix invalid input syntax for type uuid: "anon" primarily caused by eager evaluation or non-short-circuited evaluation of auth.uid().
-- Solution: Use CASE WHEN to strictly guard calls to auth.uid() so it is never evaluated for anonymous users.

-- 1. Fix public.staff "Staff can view their own record"
DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;
CREATE POLICY "Staff can view their own record"
  ON public.staff FOR SELECT
  USING (
    CASE WHEN auth.role() = 'authenticated' THEN id = auth.uid() ELSE false END
  );

-- 2. Fix public.staff "Owners and super admins can view staff"
DROP POLICY IF EXISTS "Owners and super admins can view staff" ON public.staff;
CREATE POLICY "Owners and super admins can view staff"
  ON public.staff FOR SELECT
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 3. Fix public.salons "Owners can view their salon"
DROP POLICY IF EXISTS "Owners can view their salon" ON public.salons;
CREATE POLICY "Owners can view their salon"
  ON public.salons FOR SELECT
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 4. Fix public.salons "Owners can update their salon"
DROP POLICY IF EXISTS "Owners can update their salon" ON public.salons;
CREATE POLICY "Owners can update their salon"
  ON public.salons FOR UPDATE
  USING (
    owner_email = auth.jwt()->>'email' 
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 5. Fix public.services "Owners and super admins can view services"
DROP POLICY IF EXISTS "Owners and super admins can view services" ON public.services;
CREATE POLICY "Owners and super admins can view services"
  ON public.services FOR SELECT
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 6. Fix public.stations "Owners and super admins can manage stations"
DROP POLICY IF EXISTS "Owners and super admins can manage stations" ON public.stations;
CREATE POLICY "Owners and super admins can manage stations"
  ON public.stations FOR ALL
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 7. Fix public.appointments "Owners and super admins can view appointments"
DROP POLICY IF EXISTS "Owners and super admins can view appointments" ON public.appointments;
CREATE POLICY "Owners and super admins can view appointments"
  ON public.appointments FOR SELECT
  USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_email = auth.jwt()->>'email')
    OR 
    (CASE WHEN auth.role() = 'authenticated' THEN is_user_super_admin(auth.uid()) ELSE false END)
  );

-- 8. Fix public.appointments "Staff can view their own appointments"
DROP POLICY IF EXISTS "Staff can view their own appointments" ON public.appointments;
CREATE POLICY "Staff can view their own appointments"
  ON public.appointments FOR SELECT
  USING (
    CASE WHEN auth.role() = 'authenticated' THEN staff_id = auth.uid() ELSE false END
  );


-- ==========================================
-- MIGRATION: 20260131000001_add_delete_salon_rpc.sql
-- ==========================================
-- Create RPC function for deleting a salon (with full cascade)
-- This is safer and more atomic than edge functions
create or replace function public.delete_salon_by_super_admin(
  p_salon_id uuid
)
returns jsonb as $$
declare
  v_staff_count int;
  v_deleted_staff_ids uuid[];
begin
  -- Verify caller is super_admin
  if not is_user_super_admin(auth.uid()) then
    raise exception 'Unauthorized: only super admins can delete salons';
  end if;

  -- Get all staff IDs for this salon (to delete auth users later)
  select array_agg(id) into v_deleted_staff_ids
  from public.staff
  where salon_id = p_salon_id;

  v_staff_count := coalesce(array_length(v_deleted_staff_ids, 1), 0);

  -- Delete appointments (will cascade)
  delete from public.appointments where salon_id = p_salon_id;

  -- Delete services (will cascade)
  delete from public.services where salon_id = p_salon_id;

  -- Delete stations (will cascade)
  delete from public.stations where salon_id = p_salon_id;

  -- Delete staff
  delete from public.staff where salon_id = p_salon_id;

  -- Delete salon
  delete from public.salons where id = p_salon_id;

  -- Return success response
  return jsonb_build_object(
    'success', true,
    'message', 'Salon deleted successfully',
    'deleted_staff_count', v_staff_count,
    'staff_ids', v_deleted_staff_ids
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', sqlerrm,
    'sqlstate', sqlstate
  );
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users (super admin check is in function)
grant execute on function public.delete_salon_by_super_admin(uuid) to authenticated;


-- ==========================================
-- MIGRATION: 20260131000002_cleanup_duplicate_policies.sql
-- ==========================================
-- Clean up duplicate RLS policies
-- These policies already exist and are causing errors on migration

-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Owners can delete their salon staff" ON public.staff;
DROP POLICY IF EXISTS "Owners can delete services for their salon" ON public.services;
DROP POLICY IF EXISTS "Owners can delete appointments for their salon" ON public.appointments;
DROP POLICY IF EXISTS "Owners can delete their salon" ON public.salons;

-- The existing policies from previous migrations should handle this
-- No new policies needed - just preventing duplicates


-- ==========================================
-- MIGRATION: 20260131000003_add_salon_hours.sql
-- ==========================================
-- Add opening hours and days to salons table
alter table public.salons add column if not exists opening_time time default '09:00';
alter table public.salons add column if not exists closing_time time default '18:00';
alter table public.salons add column if not exists open_days text[] default ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

-- Add Google Maps coordinates for address
alter table public.salons add column if not exists latitude numeric(10, 8);
alter table public.salons add column if not exists longitude numeric(11, 8);

-- Comment for documentation
comment on column public.salons.opening_time is 'Time the salon opens (HH:MM format)';
comment on column public.salons.closing_time is 'Time the salon closes (HH:MM format)';
comment on column public.salons.open_days is 'Array of days the salon is open';
comment on column public.salons.latitude is 'GPS latitude for Google Maps';
comment on column public.salons.longitude is 'GPS longitude for Google Maps';


-- ==========================================
-- MIGRATION: 20260131000004_restore_delete_policies.sql
-- ==========================================
-- Restore accidental deletion of DELETE policies for Owners
-- These were dropped in 20260131000002_cleanup_duplicate_policies.sql but not replaced

-- 1. Restore public.appointments DELETE
drop policy if exists "Owners can delete appointments for their salon" on public.appointments;
create policy "Owners can delete appointments for their salon"
  on public.appointments for delete
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- 2. Restore public.services DELETE
drop policy if exists "Owners can delete services for their salon" on public.services;
create policy "Owners can delete services for their salon"
  on public.services for delete
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- 3. Restore public.staff DELETE
drop policy if exists "Owners can delete their salon staff" on public.staff;
create policy "Owners can delete their salon staff"
  on public.staff for delete
  using (
    salon_id in (
      select id from public.salons where owner_email = auth.jwt()->>'email'
    )
  );

-- 4. Restore public.salons DELETE (Owner deletes own salon)
drop policy if exists "Owners can delete their salon" on public.salons;
create policy "Owners can delete their salon"
  on public.salons for delete
  using (owner_email = auth.jwt()->>'email');


-- ==========================================
-- MIGRATION: 20260131000005_add_is_read_to_appointments.sql
-- ==========================================
-- Add is_read column to appointments table
alter table public.appointments 
add column if not exists is_read boolean default false;

-- Create index for performance
create index if not exists appointments_is_read_idx on public.appointments(is_read);

-- RPC function to mark all notifications as read for a salon (Owner view)
create or replace function public.mark_notifications_read(p_salon_id uuid)
returns void as $$
begin
  update public.appointments
  set is_read = true
  where salon_id = p_salon_id
    and is_read = false;
end;
$$ language plpgsql security definer;

-- RPC function to mark all notifications as read for a staff member (Staff view)
-- Marks only appointments assigned to them
create or replace function public.mark_staff_notifications_read(p_staff_id uuid)
returns void as $$
begin
  update public.appointments
  set is_read = true
  where staff_id = p_staff_id
    and is_read = false;
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function public.mark_notifications_read(uuid) to authenticated;
grant execute on function public.mark_staff_notifications_read(uuid) to authenticated;


-- ==========================================
-- MIGRATION: 20260201000001_create_push_subscriptions.sql
-- ==========================================

create table if not exists public.push_subscriptions (
    id bigint generated by default as identity primary key,
    user_id uuid references auth.users not null,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_used_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.push_subscriptions enable row level security;

create policy "Users can insert their own subscriptions"
on public.push_subscriptions for insert
with check (auth.uid() = user_id);

create policy "Users can view their own subscriptions"
on public.push_subscriptions for select
using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
on public.push_subscriptions for delete
using (auth.uid() = user_id);

-- Create index for faster lookup by user_id
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);


-- ==========================================
-- MIGRATION: 20260201000002_add_push_notification_trigger.sql
-- ==========================================
-- Create a database webhook to trigger push notifications on new appointments
-- Note: This uses Supabase's pg_net extension for HTTP calls

-- Enable pg_net extension if not already enabled
create extension if not exists pg_net with schema extensions;

-- Create function to call push notification edge function
create or replace function public.notify_new_appointment()
returns trigger as $$
declare
  edge_function_url text;
  payload jsonb;
begin
  -- Build the Edge Function URL
  -- Replace with your actual Supabase project URL
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/push-notification';
  
  -- If setting not available, use environment variable pattern
  if edge_function_url is null or edge_function_url = '/functions/v1/push-notification' then
    -- Fallback: You need to set this URL manually or via config
    edge_function_url := 'https://your-project.supabase.co/functions/v1/push-notification';
  end if;

  -- Prepare payload with new appointment data
  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'salon_id', NEW.salon_id,
      'staff_id', NEW.staff_id,
      'customer_name', NEW.customer_name,
      'appointment_date', NEW.appointment_date,
      'appointment_time', NEW.appointment_time
    )
  );

  -- Make async HTTP request to Edge Function
  -- Using pg_net for non-blocking calls
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload::text
  );

  return NEW;
exception
  when others then
    -- Don't fail the insert if notification fails
    raise warning 'Push notification failed: %', SQLERRM;
    return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger on appointments table
drop trigger if exists on_new_appointment_push on public.appointments;

create trigger on_new_appointment_push
  after insert on public.appointments
  for each row
  execute function public.notify_new_appointment();

-- Grant necessary permissions
grant usage on schema net to postgres, anon, authenticated, service_role;


-- ==========================================
-- MIGRATION: 20260201000003_add_realtime_notification_trigger.sql
-- ==========================================
-- Create trigger to send realtime notifications when appointments are created
create or replace function public.trigger_realtime_notification()
returns trigger as $$
begin
  -- Call the edge function to send realtime notifications
  -- This is async via pg_net, so it won't block the INSERT
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/realtime-notification',
    body := jsonb_build_object(
      'record', row_to_json(new)
    ),
    headers := jsonb_object_agg('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'))
  );
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists
drop trigger if exists on_appointment_insert_realtime on public.appointments;

-- Create trigger on appointments INSERT
create trigger on_appointment_insert_realtime
after insert on public.appointments
for each row
execute function public.trigger_realtime_notification();


-- ==========================================
-- MIGRATION: 20260203000001_add_book_numbers.sql
-- ==========================================
-- Create a sequence for auto-incrementing book numbers
CREATE SEQUENCE IF NOT EXISTS book_number_seq START 1000;

-- Add book_number column to appointments table (nullable first)
ALTER TABLE public.appointments 
ADD COLUMN book_number VARCHAR(50) UNIQUE;

-- Generate book numbers for existing appointments
UPDATE public.appointments 
SET book_number = 'RES-' || to_char(created_at, 'YYYY') || '-' || LPAD(nextval('book_number_seq')::text, 6, '0')
WHERE book_number IS NULL;

-- Make the column NOT NULL
ALTER TABLE public.appointments 
ALTER COLUMN book_number SET NOT NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_book_number ON public.appointments(book_number);

-- Create function to generate book numbers
CREATE OR REPLACE FUNCTION generate_book_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.book_number = '' OR NEW.book_number IS NULL THEN
    NEW.book_number := 'RES-' || to_char(NOW(), 'YYYY') || '-' || LPAD(nextval('book_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate book numbers on insert
DROP TRIGGER IF EXISTS trigger_generate_book_number ON public.appointments;
CREATE TRIGGER trigger_generate_book_number
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION generate_book_number();


-- ==========================================
-- MIGRATION: 20260203000002_add_super_admin_fields.sql
-- ==========================================
-- Add is_super_admin column to staff table
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Add role column if it doesn't exist (just in case)
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'staff';

-- Ensure the Super Admin user exists (Idempotent)
-- We use a DO block to handle the insertion conditionally or via ON CONFLICT if the ID is known
-- Since IDs are UUIDs generated by Auth, we strictly can't insert into auth.users here safely in a migration
-- But we can update the public.staff table if we assume the user exists in Auth.

-- Create policies for Super Admin if not exist
-- (Simple permissive policy for now to ensure access)
DROP POLICY IF EXISTS "Super admins can do everything" ON public.staff;
CREATE POLICY "Super admins can do everything" 
ON public.staff 
FOR ALL 
USING (is_super_admin = true);

DROP POLICY IF EXISTS "Super admins can view all salons" ON public.salons;
CREATE POLICY "Super admins can view all salons" 
ON public.salons 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND is_super_admin = true
  )
);


