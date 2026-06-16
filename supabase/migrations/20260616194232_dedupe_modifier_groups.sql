with ranked_groups as (
  select
    id,
    tenant_id,
    name,
    row_number() over (partition by tenant_id, name order by created_at asc, id asc) as row_number,
    first_value(id) over (partition by tenant_id, name order by created_at asc, id asc) as canonical_id
  from public.modifier_groups
), duplicate_groups as (
  select id, canonical_id
  from ranked_groups
  where row_number > 1
)
update public.product_modifier_groups pmg
set modifier_group_id = duplicate_groups.canonical_id
from duplicate_groups
where pmg.modifier_group_id = duplicate_groups.id
  and not exists (
    select 1
    from public.product_modifier_groups existing
    where existing.product_id = pmg.product_id
      and existing.modifier_group_id = duplicate_groups.canonical_id
  );

with ranked_groups as (
  select
    id,
    tenant_id,
    name,
    row_number() over (partition by tenant_id, name order by created_at asc, id asc) as row_number,
    first_value(id) over (partition by tenant_id, name order by created_at asc, id asc) as canonical_id
  from public.modifier_groups
), duplicate_groups as (
  select id, canonical_id
  from ranked_groups
  where row_number > 1
)
delete from public.product_modifier_groups pmg
using duplicate_groups
where pmg.modifier_group_id = duplicate_groups.id;

with ranked_groups as (
  select
    id,
    tenant_id,
    name,
    row_number() over (partition by tenant_id, name order by created_at asc, id asc) as row_number,
    first_value(id) over (partition by tenant_id, name order by created_at asc, id asc) as canonical_id
  from public.modifier_groups
), duplicate_groups as (
  select id, canonical_id
  from ranked_groups
  where row_number > 1
), option_mapping as (
  select
    duplicate_option.id as duplicate_option_id,
    canonical_option.id as canonical_option_id,
    duplicate_groups.id as duplicate_group_id,
    duplicate_groups.canonical_id as canonical_group_id
  from duplicate_groups
  join public.modifier_group_options duplicate_option on duplicate_option.modifier_group_id = duplicate_groups.id
  left join public.modifier_group_options canonical_option
    on canonical_option.modifier_group_id = duplicate_groups.canonical_id
   and canonical_option.name = duplicate_option.name
)
update public.customer_bag_item_modifiers cbim
set modifier_group_id = option_mapping.canonical_group_id,
    modifier_option_id = coalesce(option_mapping.canonical_option_id, cbim.modifier_option_id)
from option_mapping
where cbim.modifier_option_id = option_mapping.duplicate_option_id;

with ranked_groups as (
  select
    id,
    tenant_id,
    name,
    row_number() over (partition by tenant_id, name order by created_at asc, id asc) as row_number,
    first_value(id) over (partition by tenant_id, name order by created_at asc, id asc) as canonical_id
  from public.modifier_groups
), duplicate_groups as (
  select id, canonical_id
  from ranked_groups
  where row_number > 1
), canonical_option_candidates as (
  select
    duplicate_groups.canonical_id as modifier_group_id,
    duplicate_option.name,
    max(duplicate_option.price_delta) as price_delta,
    bool_or(duplicate_option.is_active) as is_active,
    min(duplicate_option.sort_order) as sort_order
  from duplicate_groups
  join public.modifier_group_options duplicate_option on duplicate_option.modifier_group_id = duplicate_groups.id
  group by duplicate_groups.canonical_id, duplicate_option.name
)
insert into public.modifier_group_options (modifier_group_id, name, price_delta, is_active, sort_order)
select modifier_group_id, name, price_delta, is_active, sort_order
from canonical_option_candidates
on conflict (modifier_group_id, name) do update set
  price_delta = excluded.price_delta,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

with ranked_groups as (
  select
    id,
    tenant_id,
    name,
    row_number() over (partition by tenant_id, name order by created_at asc, id asc) as row_number
  from public.modifier_groups
)
delete from public.modifier_group_options mgo
using ranked_groups
where mgo.modifier_group_id = ranked_groups.id
  and ranked_groups.row_number > 1;

with ranked_groups as (
  select
    id,
    tenant_id,
    name,
    row_number() over (partition by tenant_id, name order by created_at asc, id asc) as row_number
  from public.modifier_groups
)
delete from public.modifier_groups mg
using ranked_groups
where mg.id = ranked_groups.id
  and ranked_groups.row_number > 1;

alter table public.modifier_groups
  add constraint modifier_groups_tenant_name_key unique (tenant_id, name);
