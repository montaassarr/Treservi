-- Add is_read column to appointments table
alter table public.appointments 
add column if not exists is_read boolean default false;

-- Create index for performance
create index if not exists appointments_is_read_idx on public.appointments(is_read);

-- RPC function to mark all notifications as read for a salon (Owner view)
create or replace function public.mark_notifications_read(p_salon_id uuid)
returns void as $$
begin
  update public.appointments
  set is_read = true
  where salon_id = p_salon_id
    and is_read = false;
end;
$$ language plpgsql security definer;

-- RPC function to mark all notifications as read for a staff member (Staff view)
-- Marks only appointments assigned to them
create or replace function public.mark_staff_notifications_read(p_staff_id uuid)
returns void as $$
begin
  update public.appointments
  set is_read = true
  where staff_id = p_staff_id
    and is_read = false;
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function public.mark_notifications_read(uuid) to authenticated;
grant execute on function public.mark_staff_notifications_read(uuid) to authenticated;
