create or replace function public.create_storefront_order_atomic(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_customer_id uuid,
  p_fulfillment_type text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_customer_notes text,
  p_subtotal numeric(10, 2),
  p_items jsonb
)
returns table(order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_order public.orders%rowtype;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'create_storefront_order_atomic requires at least one order item';
  end if;

  insert into public.orders (
    tenant_id,
    branch_id,
    customer_id,
    channel,
    fulfillment_type,
    status,
    payment_status,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address_snapshot,
    subtotal_amount,
    discount_amount,
    delivery_fee,
    tax_amount,
    total_amount,
    currency,
    notes
  )
  values (
    p_tenant_id,
    p_branch_id,
    p_customer_id,
    'web',
    p_fulfillment_type,
    'pending_payment',
    'pending',
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    case when p_fulfillment_type = 'delivery' then '{}'::jsonb else null end,
    p_subtotal,
    0,
    0,
    0,
    p_subtotal,
    'MXN',
    p_customer_notes
  )
  returning * into created_order;

  insert into public.order_items (
    order_id,
    product_id,
    product_name_snapshot,
    category_name_snapshot,
    unit_price_snapshot,
    quantity,
    line_total,
    notes
  )
  select
    created_order.id,
    item.product_id,
    item.product_name_snapshot,
    item.category_name_snapshot,
    item.unit_price_snapshot,
    item.quantity,
    item.line_total,
    item.notes
  from jsonb_to_recordset(p_items) as item(
    product_id uuid,
    product_name_snapshot text,
    category_name_snapshot text,
    unit_price_snapshot numeric(10, 2),
    quantity integer,
    line_total numeric(10, 2),
    notes text
  );

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by_profile_id,
    source
  )
  values (
    created_order.id,
    null,
    'pending_payment',
    null,
    'customer'
  );

  return query
  select created_order.id, created_order.order_number;
end;
$$;

revoke all on function public.create_storefront_order_atomic(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  jsonb
) from public;

grant execute on function public.create_storefront_order_atomic(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  jsonb
) to service_role;
