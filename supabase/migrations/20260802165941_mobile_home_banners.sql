create table if not exists public.mobile_home_banners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  subtitle text not null default '',
  image_url text,
  cta_label text not null default 'Abrir tienda',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mobile_home_banners_tenant_id_idx on public.mobile_home_banners (tenant_id);
create index if not exists mobile_home_banners_branch_id_idx on public.mobile_home_banners (branch_id);
create index if not exists mobile_home_banners_is_active_idx on public.mobile_home_banners (is_active);

alter table public.mobile_home_banners
  drop constraint if exists mobile_home_banners_schedule_check;

alter table public.mobile_home_banners
  add constraint mobile_home_banners_schedule_check
  check (starts_at is null or ends_at is null or starts_at <= ends_at);

alter table public.mobile_home_banners enable row level security;

drop policy if exists "Service role manages mobile home banners" on public.mobile_home_banners;
create policy "Service role manages mobile home banners"
on public.mobile_home_banners
for all
to service_role
using (true)
with check (true);
