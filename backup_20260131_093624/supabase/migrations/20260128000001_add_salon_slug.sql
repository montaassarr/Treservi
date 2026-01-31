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
