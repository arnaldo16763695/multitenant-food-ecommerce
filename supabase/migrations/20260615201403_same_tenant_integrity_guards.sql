create or replace function public.enforce_branch_membership_tenant_match()
returns trigger
language plpgsql
as $$
declare
  branch_tenant_id uuid;
  membership_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  select tm.tenant_id into membership_tenant_id
  from public.tenant_memberships tm
  where tm.id = new.tenant_membership_id;

  if branch_tenant_id is null or membership_tenant_id is null or branch_tenant_id <> membership_tenant_id then
    raise exception 'branch_memberships must reference branch and tenant membership from the same tenant';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_product_category_tenant_match()
returns trigger
language plpgsql
as $$
declare
  category_tenant_id uuid;
begin
  if new.category_id is null then
    return new;
  end if;

  select c.tenant_id into category_tenant_id
  from public.categories c
  where c.id = new.category_id;

  if category_tenant_id is null or category_tenant_id <> new.tenant_id then
    raise exception 'products must reference a category from the same tenant';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_product_modifier_group_tenant_match()
returns trigger
language plpgsql
as $$
declare
  product_tenant_id uuid;
  modifier_group_tenant_id uuid;
begin
  select p.tenant_id into product_tenant_id
  from public.products p
  where p.id = new.product_id;

  select mg.tenant_id into modifier_group_tenant_id
  from public.modifier_groups mg
  where mg.id = new.modifier_group_id;

  if product_tenant_id is null or modifier_group_tenant_id is null or product_tenant_id <> modifier_group_tenant_id then
    raise exception 'product_modifier_groups must reference product and modifier group from the same tenant';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_branch_product_override_tenant_match()
returns trigger
language plpgsql
as $$
declare
  branch_tenant_id uuid;
  product_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  select p.tenant_id into product_tenant_id
  from public.products p
  where p.id = new.product_id;

  if branch_tenant_id is null or product_tenant_id is null or branch_tenant_id <> product_tenant_id then
    raise exception 'branch_product_overrides must reference branch and product from the same tenant';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_order_tenant_integrity()
returns trigger
language plpgsql
as $$
declare
  branch_tenant_id uuid;
  assigned_membership_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  if branch_tenant_id is null or branch_tenant_id <> new.tenant_id then
    raise exception 'orders must reference a branch from the same tenant';
  end if;

  if new.assigned_tenant_membership_id is null then
    return new;
  end if;

  select tm.tenant_id into assigned_membership_tenant_id
  from public.tenant_memberships tm
  where tm.id = new.assigned_tenant_membership_id;

  if assigned_membership_tenant_id is null or assigned_membership_tenant_id <> new.tenant_id then
    raise exception 'orders must reference an assigned tenant membership from the same tenant';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_branch_membership_tenant_match on public.branch_memberships;
create trigger enforce_branch_membership_tenant_match
before insert or update on public.branch_memberships
for each row
execute function public.enforce_branch_membership_tenant_match();

drop trigger if exists enforce_product_category_tenant_match on public.products;
create trigger enforce_product_category_tenant_match
before insert or update on public.products
for each row
execute function public.enforce_product_category_tenant_match();

drop trigger if exists enforce_product_modifier_group_tenant_match on public.product_modifier_groups;
create trigger enforce_product_modifier_group_tenant_match
before insert or update on public.product_modifier_groups
for each row
execute function public.enforce_product_modifier_group_tenant_match();

drop trigger if exists enforce_branch_product_override_tenant_match on public.branch_product_overrides;
create trigger enforce_branch_product_override_tenant_match
before insert or update on public.branch_product_overrides
for each row
execute function public.enforce_branch_product_override_tenant_match();

drop trigger if exists enforce_order_tenant_integrity on public.orders;
create trigger enforce_order_tenant_integrity
before insert or update on public.orders
for each row
execute function public.enforce_order_tenant_integrity();
