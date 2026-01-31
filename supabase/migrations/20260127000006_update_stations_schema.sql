
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
