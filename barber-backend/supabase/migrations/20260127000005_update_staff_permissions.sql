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
