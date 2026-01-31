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
