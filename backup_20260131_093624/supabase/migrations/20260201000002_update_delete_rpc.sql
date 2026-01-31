-- Update delete_salon_by_super_admin to remove stations reference
create or replace function public.delete_salon_by_super_admin(
  p_salon_id uuid
)
returns jsonb as $$
declare
  v_staff_count int;
  v_deleted_staff_ids uuid[];
begin
  -- Verify caller is super_admin
  if not is_user_super_admin(auth.uid()) then
    raise exception 'Unauthorized: only super admins can delete salons';
  end if;

  -- Get all staff IDs for this salon (to delete auth users later)
  select array_agg(id) into v_deleted_staff_ids
  from public.staff
  where salon_id = p_salon_id;

  v_staff_count := coalesce(array_length(v_deleted_staff_ids, 1), 0);

  -- Delete appointments (will cascade)
  delete from public.appointments where salon_id = p_salon_id;

  -- Delete services (will cascade)
  delete from public.services where salon_id = p_salon_id;

  -- Stations table is dropped, skipping deletion

  -- Delete staff
  delete from public.staff where salon_id = p_salon_id;

  -- Delete salon
  delete from public.salons where id = p_salon_id;

  -- Return success response
  return jsonb_build_object(
    'success', true,
    'message', 'Salon deleted successfully',
    'deleted_staff_count', v_staff_count,
    'staff_ids', v_deleted_staff_ids
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', sqlerrm,
    'sqlstate', sqlstate
  );
end;
$$ language plpgsql security definer;
