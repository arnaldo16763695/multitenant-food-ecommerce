create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_status_check check (status in ('active', 'inactive', 'trial', 'suspended'))
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text not null default '',
  base_price numeric(10, 2) not null,
  status text not null default 'draft',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug),
  constraint products_status_check check (status in ('active', 'draft'))
);

create table if not exists public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  selection_type text not null,
  min_select integer not null default 0,
  max_select integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modifier_groups_selection_type_check check (selection_type in ('single', 'multiple'))
);

create table if not exists public.product_modifier_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, modifier_group_id)
);

create table if not exists public.branch_product_overrides (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  availability_status text not null default 'available',
  price_override numeric(10, 2),
  prep_time_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, product_id),
  constraint branch_product_overrides_availability_status_check check (availability_status in ('available', 'paused', 'out_of_stock'))
);

create index if not exists idx_branches_tenant_id on public.branches(tenant_id);
create index if not exists idx_categories_tenant_id on public.categories(tenant_id);
create index if not exists idx_products_tenant_id on public.products(tenant_id);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_modifier_groups_tenant_id on public.modifier_groups(tenant_id);
create index if not exists idx_branch_product_overrides_product_id on public.branch_product_overrides(product_id);

alter table public.tenants enable row level security;
alter table public.branches enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.product_modifier_groups enable row level security;
alter table public.branch_product_overrides enable row level security;
