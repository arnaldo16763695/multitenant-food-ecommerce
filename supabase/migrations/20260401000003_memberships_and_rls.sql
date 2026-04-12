create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, profile_id),
  constraint tenant_memberships_role_check check (role in ('owner', 'manager', 'branch_manager', 'cashier', 'preparer'))
);

create table if not exists public.branch_memberships (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  tenant_membership_id uuid not null references public.tenant_memberships(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, tenant_membership_id),
  constraint branch_memberships_role_check check (role in ('owner', 'manager', 'branch_manager', 'cashier', 'preparer'))
);

create index if not exists idx_profiles_auth_user_id
  on public.profiles(auth_user_id);

create index if not exists idx_tenant_memberships_tenant_id
  on public.tenant_memberships(tenant_id);

create index if not exists idx_tenant_memberships_profile_id
  on public.tenant_memberships(profile_id);

create index if not exists idx_branch_memberships_branch_id
  on public.branch_memberships(branch_id);

create index if not exists idx_branch_memberships_tenant_membership_id
  on public.branch_memberships(tenant_membership_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_tenant_memberships_updated_at on public.tenant_memberships;
create trigger set_tenant_memberships_updated_at
before update on public.tenant_memberships
for each row
execute function public.set_updated_at();

drop trigger if exists set_branch_memberships_updated_at on public.branch_memberships;
create trigger set_branch_memberships_updated_at
before update on public.branch_memberships
for each row
execute function public.set_updated_at();

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select p.id
  from public.profiles as p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.has_tenant_access(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
  );
$$;

create or replace function public.has_tenant_role(target_tenant_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
      and tm.role = any(allowed_roles)
  );
$$;

create or replace function public.has_branch_access(target_branch_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.branch_memberships bm
    join public.tenant_memberships tm on tm.id = bm.tenant_membership_id
    where bm.branch_id = target_branch_id
      and bm.is_active = true
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
  )
  or exists (
    select 1
    from public.branches b
    where b.id = target_branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  );
$$;

alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.branch_memberships enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select
on public.profiles
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
on public.profiles
for insert
to authenticated
with check (auth.uid() = auth_user_id);

drop policy if exists tenant_memberships_select on public.tenant_memberships;
create policy tenant_memberships_select
on public.tenant_memberships
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.has_tenant_role(tenant_id, array['owner', 'manager'])
);

drop policy if exists tenant_memberships_insert on public.tenant_memberships;
create policy tenant_memberships_insert
on public.tenant_memberships
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['owner', 'manager']));

drop policy if exists tenant_memberships_update on public.tenant_memberships;
create policy tenant_memberships_update
on public.tenant_memberships
for update
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'manager']))
with check (public.has_tenant_role(tenant_id, array['owner', 'manager']));

drop policy if exists branch_memberships_select on public.branch_memberships;
create policy branch_memberships_select
on public.branch_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.id = tenant_membership_id
      and (
        tm.profile_id = public.current_profile_id()
        or public.has_tenant_role(tm.tenant_id, array['owner', 'manager'])
      )
  )
);

drop policy if exists branch_memberships_insert on public.branch_memberships;
create policy branch_memberships_insert
on public.branch_memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager', 'branch_manager'])
  )
);

drop policy if exists branch_memberships_update on public.branch_memberships;
create policy branch_memberships_update
on public.branch_memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager', 'branch_manager'])
  )
)
with check (
  exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager', 'branch_manager'])
  )
);

drop policy if exists tenants_select on public.tenants;
create policy tenants_select
on public.tenants
for select
to authenticated
using (public.has_tenant_access(id));

drop policy if exists branches_select on public.branches;
create policy branches_select
on public.branches
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists branches_manage on public.branches;
create policy branches_manage
on public.branches
for all
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'manager']))
with check (public.has_tenant_role(tenant_id, array['owner', 'manager']));

drop policy if exists categories_select on public.categories;
create policy categories_select
on public.categories
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists categories_manage on public.categories;
create policy categories_manage
on public.categories
for all
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'manager']))
with check (public.has_tenant_role(tenant_id, array['owner', 'manager']));

drop policy if exists products_select on public.products;
create policy products_select
on public.products
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists products_manage on public.products;
create policy products_manage
on public.products
for all
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'manager']))
with check (public.has_tenant_role(tenant_id, array['owner', 'manager']));

drop policy if exists modifier_groups_select on public.modifier_groups;
create policy modifier_groups_select
on public.modifier_groups
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists modifier_groups_manage on public.modifier_groups;
create policy modifier_groups_manage
on public.modifier_groups
for all
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'manager']))
with check (public.has_tenant_role(tenant_id, array['owner', 'manager']));

drop policy if exists product_modifier_groups_select on public.product_modifier_groups;
create policy product_modifier_groups_select
on public.product_modifier_groups
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

drop policy if exists product_modifier_groups_manage on public.product_modifier_groups;
create policy product_modifier_groups_manage
on public.product_modifier_groups
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

drop policy if exists branch_product_overrides_select on public.branch_product_overrides;
create policy branch_product_overrides_select
on public.branch_product_overrides
for select
to authenticated
using (public.has_branch_access(branch_id));

drop policy if exists branch_product_overrides_manage on public.branch_product_overrides;
create policy branch_product_overrides_manage
on public.branch_product_overrides
for all
to authenticated
using (public.has_branch_access(branch_id))
with check (public.has_branch_access(branch_id));
