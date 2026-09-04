-- Pure snapshot child table, same rationale as order_item_modifiers: no FK back to
-- product_combo_components, so historical orders stay correct even if a combo's composition is
-- later edited. quantity here is the fixed per-combo-unit composition quantity (e.g. 5), never
-- multiplied by the order line's own quantity.
create table if not exists public.order_item_combo_components (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  component_product_name_snapshot text not null,
  component_variant_name_snapshot text,
  quantity integer not null,
  created_at timestamptz not null default now(),
  constraint order_item_combo_components_quantity_positive check (quantity > 0)
);

create index if not exists idx_order_item_combo_components_order_item_id
  on public.order_item_combo_components(order_item_id);

alter table public.order_item_combo_components enable row level security;

-- Same shape as order_item_modifiers_manage/select (20260615201826_remote_schema.sql), just
-- targeting the new table.
drop policy if exists order_item_combo_components_manage on public.order_item_combo_components;
create policy order_item_combo_components_manage
on public.order_item_combo_components
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_combo_components.order_item_id
      and public.has_branch_access(o.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_combo_components.order_item_id
      and public.has_branch_access(o.branch_id)
  )
);

drop policy if exists order_item_combo_components_select on public.order_item_combo_components;
create policy order_item_combo_components_select
on public.order_item_combo_components
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_combo_components.order_item_id
      and (
        public.has_branch_access(o.branch_id)
        or (
          o.customer_id is not null
          and exists (
            select 1
            from public.customers c
            where c.id = o.customer_id
              and c.profile_id = public.current_profile_id()
          )
        )
      )
  )
);

-- Recreate the atomic order-creation RPC so it also stores each combo line's component
-- snapshot. Signature is unchanged; only the p_items jsonb shape and a third nested insert loop
-- (parallel to the existing modifiers loop) change.
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
  current_combo_component jsonb;
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

    for current_combo_component in
      select value
      from jsonb_array_elements(coalesce(current_item -> 'combo_components', '[]'::jsonb))
    loop
      insert into public.order_item_combo_components (
        order_item_id,
        component_product_name_snapshot,
        component_variant_name_snapshot,
        quantity
      )
      values (
        created_order_item_id,
        current_combo_component ->> 'component_product_name_snapshot',
        current_combo_component ->> 'component_variant_name_snapshot',
        (current_combo_component ->> 'quantity')::integer
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
