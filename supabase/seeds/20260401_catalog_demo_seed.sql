with upsert_tenant as (
  insert into public.tenants (name, slug, status, storefront_enabled, custom_domain)
  values ('Demo Brand', 'demo-brand', 'active', true, null)
  on conflict (slug) do update set
    name = excluded.name,
    status = excluded.status,
    storefront_enabled = excluded.storefront_enabled,
    custom_domain = excluded.custom_domain,
    updated_at = now()
  returning id
), tenant_ref as (
  select id from upsert_tenant
  union all
  select id from public.tenants where slug = 'demo-brand' limit 1
), center_branch as (
  insert into public.branches (tenant_id, name, slug, is_active)
  select id, 'Centro', 'centro', true from tenant_ref
  on conflict (tenant_id, slug) do update set
    name = excluded.name,
    is_active = excluded.is_active,
    updated_at = now()
  returning id
), north_branch as (
  insert into public.branches (tenant_id, name, slug, is_active)
  select id, 'Norte', 'norte', true from tenant_ref
  on conflict (tenant_id, slug) do update set
    name = excluded.name,
    is_active = excluded.is_active,
    updated_at = now()
  returning id
), east_branch as (
  insert into public.branches (tenant_id, name, slug, is_active)
  select id, 'Este', 'este', true from tenant_ref
  on conflict (tenant_id, slug) do update set
    name = excluded.name,
    is_active = excluded.is_active,
    updated_at = now()
  returning id
)
select 1;

with tenant_ref as (
  select id from public.tenants where slug = 'demo-brand' limit 1
)
insert into public.categories (tenant_id, name, slug, is_visible, sort_order)
select tenant_ref.id, seed.name, seed.slug, seed.is_visible, seed.sort_order
from tenant_ref
cross join (
  values
    ('Burgers', 'burgers', true, 1),
    ('Combos', 'combos', true, 2),
    ('Wraps', 'wraps', true, 3),
    ('Bebidas', 'bebidas', false, 4)
) as seed(name, slug, is_visible, sort_order)
on conflict (tenant_id, slug) do update set
  name = excluded.name,
  is_visible = excluded.is_visible,
  sort_order = excluded.sort_order,
  updated_at = now();

with tenant_ref as (
  select id from public.tenants where slug = 'demo-brand' limit 1
)
insert into public.modifier_groups (tenant_id, name, selection_type, min_select, max_select, is_active)
select tenant_ref.id, seed.name, seed.selection_type, seed.min_select, seed.max_select, true
from tenant_ref
cross join (
  values
    ('Extras', 'multiple', 0, 3),
    ('Salsas', 'multiple', 0, 2),
    ('Bebidas', 'single', 1, 1),
    ('Tamano', 'single', 1, 1)
) as seed(name, selection_type, min_select, max_select)
on conflict do nothing;

with tenant_ref as (
  select id from public.tenants where slug = 'demo-brand' limit 1
), category_ref as (
  select id, name from public.categories where tenant_id = (select id from tenant_ref)
)
insert into public.products (tenant_id, category_id, name, slug, description, base_price, status, tags)
select
  tenant_ref.id,
  category_ref.id,
  seed.name,
  seed.slug,
  seed.description,
  seed.base_price,
  seed.status,
  seed.tags
from tenant_ref
join category_ref on category_ref.name = any(array['Burgers', 'Combos', 'Wraps', 'Bebidas'])
join (
  values
    ('Fire Smash Burger', 'fire-smash-burger', 'Burgers', 'Doble carne, queso americano, salsa signature y pickles.', 11.90, 'active', array['Best seller', 'Combo ready']::text[]),
    ('Crispy Box', 'crispy-box', 'Combos', 'Pollo crispy, papas medianas, bebida y dip incluido.', 14.50, 'active', array['Lunch', 'High rotation']::text[]),
    ('Lime Chicken Wrap', 'lime-chicken-wrap', 'Wraps', 'Wrap de pollo grillado con aderezo citrico y mix de hojas.', 9.80, 'draft', array['Healthy', 'Seasonal']::text[]),
    ('Spark Cola', 'spark-cola', 'Bebidas', 'Refresco individual disponible para combos y venta directa.', 2.90, 'active', array['Upsell']::text[])
) as seed(name, slug, category_name, description, base_price, status, tags)
  on category_ref.name = seed.category_name
on conflict (tenant_id, slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  base_price = excluded.base_price,
  status = excluded.status,
  tags = excluded.tags,
  updated_at = now();

insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select product_ref.id, modifier_group_ref.id, relation.sort_order
from (
  values
    ('fire-smash-burger', 'Extras', 1),
    ('fire-smash-burger', 'Salsas', 2),
    ('crispy-box', 'Bebidas', 1),
    ('crispy-box', 'Salsas', 2),
    ('lime-chicken-wrap', 'Extras', 1),
    ('spark-cola', 'Tamano', 1)
) as relation(product_slug, modifier_group_name, sort_order)
join public.products as product_ref on product_ref.slug = relation.product_slug
join public.modifier_groups as modifier_group_ref on modifier_group_ref.name = relation.modifier_group_name
on conflict (product_id, modifier_group_id) do update set
  sort_order = excluded.sort_order;

insert into public.branch_product_overrides (branch_id, product_id, availability_status, price_override, prep_time_minutes)
select branch_ref.id, product_ref.id, seed.availability_status, seed.price_override, seed.prep_time_minutes
from (
  values
    ('centro', 'fire-smash-burger', 'available', 11.90, 12),
    ('norte', 'fire-smash-burger', 'paused', 12.40, 15),
    ('este', 'fire-smash-burger', 'available', 11.90, 13),
    ('centro', 'crispy-box', 'available', 14.50, 14),
    ('norte', 'crispy-box', 'available', 14.90, 16),
    ('este', 'crispy-box', 'out_of_stock', 14.50, null),
    ('centro', 'lime-chicken-wrap', 'paused', 9.80, 11),
    ('norte', 'lime-chicken-wrap', 'available', 10.10, 12),
    ('este', 'lime-chicken-wrap', 'available', 9.80, 11),
    ('centro', 'spark-cola', 'available', 2.90, 2),
    ('norte', 'spark-cola', 'available', 2.90, 2),
    ('este', 'spark-cola', 'available', 3.10, 2)
) as seed(branch_slug, product_slug, availability_status, price_override, prep_time_minutes)
join public.branches as branch_ref on branch_ref.slug = seed.branch_slug
join public.products as product_ref on product_ref.slug = seed.product_slug
on conflict (branch_id, product_id) do update set
  availability_status = excluded.availability_status,
  price_override = excluded.price_override,
  prep_time_minutes = excluded.prep_time_minutes,
  updated_at = now();
