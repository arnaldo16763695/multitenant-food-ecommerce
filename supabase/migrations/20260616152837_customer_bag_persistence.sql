create table if not exists public.customer_bag_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_bag_items_quantity_positive check (quantity > 0),
  constraint customer_bag_items_customer_branch_product_key unique(customer_id, branch_id, product_id)
);

create index if not exists idx_customer_bag_items_customer_id
  on public.customer_bag_items(customer_id);

create index if not exists idx_customer_bag_items_customer_branch
  on public.customer_bag_items(customer_id, tenant_id, branch_id);

drop trigger if exists set_customer_bag_items_updated_at on public.customer_bag_items;
create trigger set_customer_bag_items_updated_at
before update on public.customer_bag_items
for each row
execute function public.set_updated_at();

alter table public.customer_bag_items enable row level security;

drop policy if exists customer_bag_items_self_select on public.customer_bag_items;
create policy customer_bag_items_self_select
on public.customer_bag_items
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
);

drop policy if exists customer_bag_items_self_insert on public.customer_bag_items;
create policy customer_bag_items_self_insert
on public.customer_bag_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
  and exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and b.tenant_id = tenant_id
      and b.is_active = true
  )
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.tenant_id = tenant_id
      and p.status = 'active'
  )
);

drop policy if exists customer_bag_items_self_update on public.customer_bag_items;
create policy customer_bag_items_self_update
on public.customer_bag_items
for update
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
  and exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and b.tenant_id = tenant_id
      and b.is_active = true
  )
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.tenant_id = tenant_id
      and p.status = 'active'
  )
);

drop policy if exists customer_bag_items_self_delete on public.customer_bag_items;
create policy customer_bag_items_self_delete
on public.customer_bag_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
);
