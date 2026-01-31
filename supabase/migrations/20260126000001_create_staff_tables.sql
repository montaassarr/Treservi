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
