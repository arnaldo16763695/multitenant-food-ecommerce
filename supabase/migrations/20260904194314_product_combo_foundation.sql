-- Combos: a product composed of fixed quantities of OTHER real catalog products (e.g.
-- "Combo Familiar" = 5x "Hamburguesa Clasica" + 1x "Refresco 1L"). is_combo flags the parent
-- product; product_combo_components holds its fixed composition. Price stays manual (never
-- auto-summed) -- what this buys is automatic availability sync: a combo is only orderable when
-- every one of its components is, so the tenant never sells something it can't prepare.
alter table public.products add column if not exists is_combo boolean not null default false;

create table if not exists public.product_combo_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  combo_product_id uuid not null references public.products(id) on delete cascade,
  component_product_id uuid not null references public.products(id) on delete cascade,
  component_variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_combo_components_quantity_positive check (quantity > 0),
  constraint product_combo_components_not_self check (combo_product_id <> component_product_id),
  -- Composite FK trick identical to product_variants_foundation.sql: guarantees the claimed
  -- variant actually belongs to the claimed component product.
  foreign key (component_variant_id, component_product_id)
    references public.product_variants(id, product_id)
);

-- Postgres treats every NULL as distinct in a plain unique() constraint, so a single
-- unique(combo_product_id, component_product_id, component_variant_id) would NOT stop the same
-- variant-less component being added twice. Same partial-index pattern already used for
-- customer_bag_items in product_variants_foundation.sql.
create unique index if not exists idx_product_combo_components_product_only
  on public.product_combo_components(combo_product_id, component_product_id)
  where component_variant_id is null;

create unique index if not exists idx_product_combo_components_variant_only
  on public.product_combo_components(combo_product_id, component_product_id, component_variant_id)
  where component_variant_id is not null;

create index if not exists idx_product_combo_components_combo_product_id
  on public.product_combo_components(combo_product_id);

create index if not exists idx_product_combo_components_tenant_id
  on public.product_combo_components(tenant_id);

drop trigger if exists set_product_combo_components_updated_at on public.product_combo_components;
create trigger set_product_combo_components_updated_at
before update on public.product_combo_components
for each row
execute function public.set_updated_at();

alter table public.product_combo_components enable row level security;

-- Tenant-wide master catalog data (not branch-scoped), same shape as product_variants_select/
-- manage -- owner/manager only, NOT branch_product_overrides' has_branch_access.
drop policy if exists product_combo_components_select on public.product_combo_components;
create policy product_combo_components_select
on public.product_combo_components
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = combo_product_id
      and public.has_tenant_access(p.tenant_id)
  )
);

drop policy if exists product_combo_components_manage on public.product_combo_components;
create policy product_combo_components_manage
on public.product_combo_components
for all
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = combo_product_id
      and public.has_tenant_role(p.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = combo_product_id
      and public.has_tenant_role(p.tenant_id, array['owner', 'manager'])
  )
);

-- Enforces: combo and component belong to the same tenant as the row itself, the combo side is
-- actually flagged is_combo, and the component side is NOT a combo. Because a plain
-- (is_combo = false) product can never itself own product_combo_components rows as
-- combo_product_id, cycles are structurally impossible -- no depth-limit guard is needed.
create or replace function public.enforce_product_combo_component_tenant_match()
returns trigger
language plpgsql
as $$
declare
  combo_tenant_id uuid;
  combo_is_combo boolean;
  component_tenant_id uuid;
  component_is_combo boolean;
begin
  select tenant_id, is_combo into combo_tenant_id, combo_is_combo
  from public.products
  where id = new.combo_product_id;

  select tenant_id, is_combo into component_tenant_id, component_is_combo
  from public.products
  where id = new.component_product_id;

  if combo_tenant_id is null or component_tenant_id is null
     or combo_tenant_id <> component_tenant_id or combo_tenant_id <> new.tenant_id then
    raise exception 'product_combo_components must reference combo and component products from the same tenant';
  end if;

  if not combo_is_combo then
    raise exception 'combo_product_id must reference a product flagged is_combo = true';
  end if;

  if component_is_combo then
    raise exception 'a combo component must be a plain (non-combo) product -- nested combos are not allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_product_combo_component_tenant_match on public.product_combo_components;
create trigger enforce_product_combo_component_tenant_match
before insert or update on public.product_combo_components
for each row
execute function public.enforce_product_combo_component_tenant_match();

-- A combo has one fixed composition and one price -- it cannot also have size/presentation
-- variants. Defense in depth behind the admin UI, which already hides the variants section once
-- is_combo is checked.
create or replace function public.enforce_combo_product_has_no_variants()
returns trigger
language plpgsql
as $$
begin
  if new.is_combo and exists (select 1 from public.product_variants where product_id = new.id) then
    raise exception 'a combo product cannot have variants; remove its variants before marking it as a combo';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_combo_product_has_no_variants on public.products;
create trigger enforce_combo_product_has_no_variants
before insert or update of is_combo on public.products
for each row
execute function public.enforce_combo_product_has_no_variants();

create or replace function public.enforce_variant_target_product_is_not_combo()
returns trigger
language plpgsql
as $$
declare
  target_is_combo boolean;
begin
  select is_combo into target_is_combo from public.products where id = new.product_id;

  if target_is_combo then
    raise exception 'cannot add variants to a combo product';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_variant_target_product_is_not_combo on public.product_variants;
create trigger enforce_variant_target_product_is_not_combo
before insert on public.product_variants
for each row
execute function public.enforce_variant_target_product_is_not_combo();
