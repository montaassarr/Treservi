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
