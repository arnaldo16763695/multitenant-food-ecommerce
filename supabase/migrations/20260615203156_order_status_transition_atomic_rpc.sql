create or replace function public.update_order_status_atomic(
  p_tenant_id uuid,
  p_order_id uuid,
  p_from_status text,
  p_to_status text,
  p_changed_by_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.orders
  set
    status = p_to_status,
    confirmed_at = case when p_to_status = 'confirmed' then now() else confirmed_at end,
    completed_at = case when p_to_status = 'completed' then now() else completed_at end,
    cancelled_at = case when p_to_status = 'cancelled' then now() else cancelled_at end,
    payment_status = case when p_to_status = 'confirmed' then 'paid' else payment_status end
  where tenant_id = p_tenant_id
    and id = p_order_id
    and status = p_from_status;

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    return false;
  end if;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by_profile_id,
    source
  )
  values (
    p_order_id,
    p_from_status,
    p_to_status,
    p_changed_by_profile_id,
    'admin'
  );

  return true;
end;
$$;

revoke all on function public.update_order_status_atomic(
  uuid,
  uuid,
  text,
  text,
  uuid
) from public;

grant execute on function public.update_order_status_atomic(
  uuid,
  uuid,
  text,
  text,
  uuid
) to service_role;
