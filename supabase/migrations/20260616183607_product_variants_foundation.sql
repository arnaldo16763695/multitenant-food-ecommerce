create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  base_price numeric(10, 2) not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name),
  unique (id, product_id),
  constraint product_variants_base_price_positive check (base_price > 0)
);

create unique index if not exists idx_product_variants_default_per_product
  on public.product_variants(product_id)
  where is_default = true;

create index if not exists idx_product_variants_product_id
  on public.product_variants(product_id);

create index if not exists idx_product_variants_tenant_id
  on public.product_variants(tenant_id);

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at
before update on public.product_variants
for each row
execute function public.set_updated_at();

create table if not exists public.branch_product_variant_overrides (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  availability_status text not null default 'available',
  price_override numeric(10, 2),
  prep_time_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, product_variant_id),
  constraint branch_product_variant_overrides_availability_status_check check (availability_status in ('available', 'paused', 'out_of_stock'))
);

create index if not exists idx_branch_product_variant_overrides_variant_id
  on public.branch_product_variant_overrides(product_variant_id);

create index if not exists idx_branch_product_variant_overrides_branch_id
  on public.branch_product_variant_overrides(branch_id);

drop trigger if exists set_branch_product_variant_overrides_updated_at on public.branch_product_variant_overrides;
create trigger set_branch_product_variant_overrides_updated_at
before update on public.branch_product_variant_overrides
for each row
execute function public.set_updated_at();

alter table public.product_variants enable row level security;
alter table public.branch_product_variant_overrides enable row level security;

drop policy if exists product_variants_select on public.product_variants;
create policy product_variants_select
on public.product_variants
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and public.has_tenant_access(p.tenant_id)
  )
);

drop policy if exists product_variants_manage on public.product_variants;
create policy product_variants_manage
on public.product_variants
for all
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and public.has_tenant_role(p.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and public.has_tenant_role(p.tenant_id, array['owner', 'manager'])
  )
);

drop policy if exists branch_product_variant_overrides_select on public.branch_product_variant_overrides;
create policy branch_product_variant_overrides_select
on public.branch_product_variant_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = product_variant_id
      and public.has_tenant_access(p.tenant_id)
  )
);

drop policy if exists branch_product_variant_overrides_manage on public.branch_product_variant_overrides;
create policy branch_product_variant_overrides_manage
on public.branch_product_variant_overrides
for all
to authenticated
using (
  exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
);

create or replace function public.enforce_product_variant_tenant_match()
returns trigger
language plpgsql
as $$
declare
  product_tenant_id uuid;
begin
  select p.tenant_id into product_tenant_id
  from public.products p
  where p.id = new.product_id;

  if product_tenant_id is null or product_tenant_id <> new.tenant_id then
    raise exception 'product_variants must reference product and tenant from the same tenant';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_product_variant_tenant_match on public.product_variants;
create trigger enforce_product_variant_tenant_match
before insert or update on public.product_variants
for each row
execute function public.enforce_product_variant_tenant_match();

create or replace function public.enforce_branch_product_variant_override_tenant_match()
returns trigger
language plpgsql
as $$
declare
  branch_tenant_id uuid;
  variant_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  select pv.tenant_id into variant_tenant_id
  from public.product_variants pv
  where pv.id = new.product_variant_id;

  if branch_tenant_id is null or variant_tenant_id is null or branch_tenant_id <> variant_tenant_id then
    raise exception 'branch_product_variant_overrides must reference branch and variant from the same tenant';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_branch_product_variant_override_tenant_match on public.branch_product_variant_overrides;
create trigger enforce_branch_product_variant_override_tenant_match
before insert or update on public.branch_product_variant_overrides
for each row
execute function public.enforce_branch_product_variant_override_tenant_match();

alter table public.customer_bag_items add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_name_snapshot text;

alter table public.customer_bag_items
  drop constraint if exists customer_bag_items_variant_product_match_fkey;

alter table public.customer_bag_items
  add constraint customer_bag_items_variant_product_match_fkey
  foreign key (product_variant_id, product_id)
  references public.product_variants(id, product_id);

alter table public.order_items
  drop constraint if exists order_items_variant_product_match_fkey;

alter table public.order_items
  add constraint order_items_variant_product_match_fkey
  foreign key (product_variant_id, product_id)
  references public.product_variants(id, product_id);

alter table public.customer_bag_items
  drop constraint if exists customer_bag_items_customer_branch_product_key;

drop index if exists idx_customer_bag_items_product_only;
create unique index if not exists idx_customer_bag_items_product_only
  on public.customer_bag_items(customer_id, branch_id, product_id)
  where product_variant_id is null;

drop index if exists idx_customer_bag_items_variant_only;
create unique index if not exists idx_customer_bag_items_variant_only
  on public.customer_bag_items(customer_id, branch_id, product_variant_id)
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
    product_variant_id,
    product_name_snapshot,
    variant_name_snapshot,
    category_name_snapshot,
    unit_price_snapshot,
    quantity,
    line_total,
    notes
  )
  select
    created_order.id,
    item.product_id,
    item.product_variant_id,
    item.product_name_snapshot,
    item.variant_name_snapshot,
    item.category_name_snapshot,
    item.unit_price_snapshot,
    item.quantity,
    item.line_total,
    item.notes
  from jsonb_to_recordset(p_items) as item(
    product_id uuid,
    product_variant_id uuid,
    product_name_snapshot text,
    variant_name_snapshot text,
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
