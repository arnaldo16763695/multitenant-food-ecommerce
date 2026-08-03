alter table public.modifier_groups
  add column if not exists modifier_kind text not null default 'choice';

alter table public.modifier_groups
  drop constraint if exists modifier_groups_modifier_kind_check;

alter table public.modifier_groups
  add constraint modifier_groups_modifier_kind_check check (modifier_kind in ('ingredient', 'addon', 'choice'));

alter table public.modifier_group_options
  add column if not exists default_selected boolean not null default false;

-- Legacy groups relied on naming heuristics in the storefront UI. Backfill the new semantic fields once
-- so mobile can stop inferring behavior from names while catalog editors catch up with explicit values.
update public.modifier_groups
set modifier_kind = case
  when lower(trim(name)) like '%ingredient%' or lower(trim(name)) like '%ingrediente%' or lower(trim(name)) like '%ingredientes%' or lower(trim(name)) like '%exclusion%' or lower(trim(name)) like '%exclusión%' then 'ingredient'
  when lower(trim(name)) like '%extra%' then 'addon'
  when selection_type = 'single' then 'choice'
  else 'choice'
end;

update public.modifier_group_options as options
set default_selected = true
from public.modifier_groups as groups
where groups.id = options.modifier_group_id
  and groups.modifier_kind = 'ingredient';
