create table if not exists public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('platform_owner', 'platform_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, role)
);

create table if not exists public.business_signups (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  owner_full_name text not null,
  owner_email text not null,
  owner_phone text,
  slug_requested text not null,
  business_type text,
  branch_count_estimate integer,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'provisioned')),
  notes text,
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  provisioned_tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_signups_status_idx on public.business_signups (status);
create index if not exists business_signups_owner_email_idx on public.business_signups (owner_email);
create index if not exists business_signups_slug_requested_idx on public.business_signups (slug_requested);
create index if not exists platform_memberships_profile_id_idx on public.platform_memberships (profile_id);

create trigger set_platform_memberships_updated_at
before update on public.platform_memberships
for each row execute function public.set_updated_at();

create trigger set_business_signups_updated_at
before update on public.business_signups
for each row execute function public.set_updated_at();

alter table public.platform_memberships enable row level security;
alter table public.business_signups enable row level security;

create policy "platform_memberships_self_select"
on public.platform_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = platform_memberships.profile_id
      and p.auth_user_id = auth.uid()
  )
);
