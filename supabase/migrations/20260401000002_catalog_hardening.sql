create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row
execute function public.set_updated_at();

drop trigger if exists set_branches_updated_at on public.branches;
create trigger set_branches_updated_at
before update on public.branches
for each row
execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists set_modifier_groups_updated_at on public.modifier_groups;
create trigger set_modifier_groups_updated_at
before update on public.modifier_groups
for each row
execute function public.set_updated_at();

drop trigger if exists set_branch_product_overrides_updated_at on public.branch_product_overrides;
create trigger set_branch_product_overrides_updated_at
before update on public.branch_product_overrides
for each row
execute function public.set_updated_at();

create index if not exists idx_product_modifier_groups_product_id
  on public.product_modifier_groups(product_id);

create index if not exists idx_product_modifier_groups_modifier_group_id
  on public.product_modifier_groups(modifier_group_id);

create index if not exists idx_branch_product_overrides_branch_id
  on public.branch_product_overrides(branch_id);
