create table if not exists public.modifier_group_options (
  id uuid primary key default gen_random_uuid(),
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (modifier_group_id, name),
  constraint modifier_group_options_price_delta_non_negative check (price_delta >= 0)
);

create index if not exists idx_modifier_group_options_group_id
  on public.modifier_group_options(modifier_group_id);

drop trigger if exists set_modifier_group_options_updated_at on public.modifier_group_options;
create trigger set_modifier_group_options_updated_at
before update on public.modifier_group_options
for each row
execute function public.set_updated_at();

alter table public.modifier_group_options enable row level security;

drop policy if exists modifier_group_options_select on public.modifier_group_options;
create policy modifier_group_options_select
on public.modifier_group_options
for select
to authenticated
using (
  exists (
    select 1
    from public.modifier_groups mg
    where mg.id = modifier_group_id
      and public.has_tenant_access(mg.tenant_id)
  )
);

drop policy if exists modifier_group_options_manage on public.modifier_group_options;
create policy modifier_group_options_manage
on public.modifier_group_options
for all
to authenticated
using (
  exists (
    select 1
    from public.modifier_groups mg
    where mg.id = modifier_group_id
      and public.has_tenant_role(mg.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.modifier_groups mg
    where mg.id = modifier_group_id
      and public.has_tenant_role(mg.tenant_id, array['owner', 'manager'])
  )
);

alter table public.customer_bag_items add column if not exists configuration_hash text not null default '';

create table if not exists public.customer_bag_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  customer_bag_item_id uuid not null references public.customer_bag_items(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete restrict,
  modifier_option_id uuid not null references public.modifier_group_options(id) on delete restrict,
  price_delta_snapshot numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (customer_bag_item_id, modifier_option_id),
  constraint customer_bag_item_modifiers_price_delta_non_negative check (price_delta_snapshot >= 0)
);

create index if not exists idx_customer_bag_item_modifiers_bag_item_id
  on public.customer_bag_item_modifiers(customer_bag_item_id);

alter table public.customer_bag_item_modifiers enable row level security;

drop policy if exists customer_bag_item_modifiers_self_select on public.customer_bag_item_modifiers;
create policy customer_bag_item_modifiers_self_select
on public.customer_bag_item_modifiers
for select
to authenticated
using (
  exists (
    select 1
    from public.customer_bag_items cbi
    join public.customers c on c.id = cbi.customer_id
    where cbi.id = customer_bag_item_id
      and c.profile_id = public.current_profile_id()
  )
);

drop policy if exists customer_bag_item_modifiers_self_insert on public.customer_bag_item_modifiers;
create policy customer_bag_item_modifiers_self_insert
on public.customer_bag_item_modifiers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customer_bag_items cbi
    join public.customers c on c.id = cbi.customer_id
    where cbi.id = customer_bag_item_id
      and c.profile_id = public.current_profile_id()
  )
);

drop policy if exists customer_bag_item_modifiers_self_delete on public.customer_bag_item_modifiers;
create policy customer_bag_item_modifiers_self_delete
on public.customer_bag_item_modifiers
for delete
to authenticated
using (
  exists (
    select 1
    from public.customer_bag_items cbi
    join public.customers c on c.id = cbi.customer_id
    where cbi.id = customer_bag_item_id
      and c.profile_id = public.current_profile_id()
  )
);

drop index if exists idx_customer_bag_items_product_only;
drop index if exists idx_customer_bag_items_variant_only;

create unique index if not exists idx_customer_bag_items_product_only
  on public.customer_bag_items(customer_id, branch_id, product_id, configuration_hash)
  where product_variant_id is null;

create unique index if not exists idx_customer_bag_items_variant_only
  on public.customer_bag_items(customer_id, branch_id, product_variant_id, configuration_hash)
  where product_variant_id is not null;

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
        price_snapshot
      )
      values (
        created_order_item_id,
        current_modifier ->> 'modifier_group_name_snapshot',
        current_modifier ->> 'modifier_option_name_snapshot',
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
$$;
