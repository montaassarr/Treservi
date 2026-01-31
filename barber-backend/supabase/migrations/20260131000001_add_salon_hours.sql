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
