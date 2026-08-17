-- order_item_modifiers is a pure snapshot table (no FK to modifier_groups) so historical orders
-- stay correct even if a modifier group is later edited or deleted. It predates modifier_kind
-- (added in 20260803132636_storefront_modifier_contract_semantics.sql), so kitchen and order
-- detail views have been falling back to a name-based heuristic instead of the explicit
-- ingredient/addon/choice semantics. Snapshot modifier_kind at order time too, closing that gap.
alter table public.order_item_modifiers
  add column if not exists modifier_kind_snapshot text not null default 'choice';

alter table public.order_item_modifiers
  drop constraint if exists order_item_modifiers_modifier_kind_snapshot_check;

alter table public.order_item_modifiers
  add constraint order_item_modifiers_modifier_kind_snapshot_check
  check (modifier_kind_snapshot in ('ingredient', 'addon', 'choice'));

-- One-time backfill for existing orders, reusing the same name heuristic the storefront UI
-- relied on before modifier_kind existed. New orders will snapshot the real value instead.
update public.order_item_modifiers
set modifier_kind_snapshot = case
  when lower(trim(modifier_group_name_snapshot)) like '%ingredient%'
    or lower(trim(modifier_group_name_snapshot)) like '%ingrediente%'
    or lower(trim(modifier_group_name_snapshot)) like '%exclusion%'
    or lower(trim(modifier_group_name_snapshot)) like '%exclusión%' then 'ingredient'
  when lower(trim(modifier_group_name_snapshot)) like '%extra%' then 'addon'
  else 'choice'
end;

-- Recreate the atomic order-creation RPC so it accepts and stores modifier_kind_snapshot.
-- Signature is unchanged; only the p_items jsonb shape and the order_item_modifiers insert change.
CREATE OR REPLACE FUNCTION public.create_storefront_order_atomic(p_tenant_id uuid, p_branch_id uuid, p_customer_id uuid, p_fulfillment_type text, p_customer_name text, p_customer_phone text, p_customer_email text, p_customer_notes text, p_subtotal numeric, p_items jsonb)
 RETURNS TABLE(order_id uuid, order_number bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  created_order public.orders%rowtype;
  current_item jsonb;
  created_order_item_id uuid;
  current_modifier jsonb;
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

  for current_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      product_variant_id,
      product_name_snapshot,
      variant_name_snapshot,
      category_name_snapshot,
      unit_price_snapshot,
      quantity,
      line_total,
      notes
    )
    values (
      created_order.id,
      (current_item ->> 'product_id')::uuid,
      (current_item ->> 'product_variant_id')::uuid,
      current_item ->> 'product_name_snapshot',
      current_item ->> 'variant_name_snapshot',
      current_item ->> 'category_name_snapshot',
      (current_item ->> 'unit_price_snapshot')::numeric(10, 2),
      (current_item ->> 'quantity')::integer,
      (current_item ->> 'line_total')::numeric(10, 2),
      current_item ->> 'notes'
    )
    returning id into created_order_item_id;

    for current_modifier in
      select value
      from jsonb_array_elements(coalesce(current_item -> 'modifiers', '[]'::jsonb))
    loop
      insert into public.order_item_modifiers (
        order_item_id,
        modifier_group_name_snapshot,
        modifier_option_name_snapshot,
        modifier_kind_snapshot,
        price_snapshot
      )
      values (
        created_order_item_id,
        current_modifier ->> 'modifier_group_name_snapshot',
        current_modifier ->> 'modifier_option_name_snapshot',
        coalesce(current_modifier ->> 'modifier_kind_snapshot', 'choice'),
        coalesce((current_modifier ->> 'price_snapshot')::numeric(10, 2), 0)
      );
    end loop;
  end loop;

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
$function$
;
