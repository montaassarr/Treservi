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
