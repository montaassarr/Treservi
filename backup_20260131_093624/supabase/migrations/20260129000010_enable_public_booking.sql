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
