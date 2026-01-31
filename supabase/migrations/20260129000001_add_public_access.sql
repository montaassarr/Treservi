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
