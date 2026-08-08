alter table public.branches
  add column if not exists ordering_mode text not null default 'force_open';

alter table public.branches
  drop constraint if exists branches_ordering_mode_check;

alter table public.branches
  add constraint branches_ordering_mode_check check (ordering_mode in ('auto', 'force_open', 'force_closed'));

create table if not exists public.branch_operating_windows (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  day_of_week smallint not null,
  opens_at_local time not null,
  closes_at_local time not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_operating_windows_day_of_week_check check (day_of_week between 0 and 6),
  constraint branch_operating_windows_distinct_times_check check (opens_at_local <> closes_at_local)
);

create unique index if not exists idx_branch_operating_windows_branch_day_sort_active
  on public.branch_operating_windows(branch_id, day_of_week, sort_order)
  where is_active = true;

create index if not exists idx_branch_operating_windows_branch_day_active
  on public.branch_operating_windows(branch_id, day_of_week)
  where is_active = true;

drop trigger if exists set_branch_operating_windows_updated_at on public.branch_operating_windows;
create trigger set_branch_operating_windows_updated_at
before update on public.branch_operating_windows
for each row
execute function public.set_updated_at();

create table if not exists public.branch_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  exception_date date not null,
  mode text not null,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_schedule_exceptions_mode_check check (mode in ('force_closed', 'custom_hours'))
);

create unique index if not exists idx_branch_schedule_exceptions_branch_date_active
  on public.branch_schedule_exceptions(branch_id, exception_date)
  where is_active = true;

create index if not exists idx_branch_schedule_exceptions_branch_date_lookup
  on public.branch_schedule_exceptions(branch_id, exception_date)
  where is_active = true;

drop trigger if exists set_branch_schedule_exceptions_updated_at on public.branch_schedule_exceptions;
create trigger set_branch_schedule_exceptions_updated_at
before update on public.branch_schedule_exceptions
for each row
execute function public.set_updated_at();

create table if not exists public.branch_schedule_exception_windows (
  id uuid primary key default gen_random_uuid(),
  exception_id uuid not null references public.branch_schedule_exceptions(id) on delete cascade,
  opens_at_local time not null,
  closes_at_local time not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_schedule_exception_windows_distinct_times_check check (opens_at_local <> closes_at_local)
);

create unique index if not exists idx_branch_schedule_exception_windows_exception_sort_active
  on public.branch_schedule_exception_windows(exception_id, sort_order)
  where is_active = true;

drop trigger if exists set_branch_schedule_exception_windows_updated_at on public.branch_schedule_exception_windows;
create trigger set_branch_schedule_exception_windows_updated_at
before update on public.branch_schedule_exception_windows
for each row
execute function public.set_updated_at();

alter table public.branch_operating_windows enable row level security;
alter table public.branch_schedule_exceptions enable row level security;
alter table public.branch_schedule_exception_windows enable row level security;

drop policy if exists branch_operating_windows_select on public.branch_operating_windows;
create policy branch_operating_windows_select
on public.branch_operating_windows
for select
to authenticated
using (public.has_branch_access(branch_id));

drop policy if exists branch_operating_windows_manage on public.branch_operating_windows;
create policy branch_operating_windows_manage
on public.branch_operating_windows
for all
to authenticated
using (
  exists (
    select 1
    from public.branch_memberships bm
    join public.tenant_memberships tm on tm.id = bm.tenant_membership_id
    where bm.branch_id = branch_id
      and bm.is_active = true
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
      and tm.role in ('owner', 'manager', 'branch_manager')
  )
  or exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.branch_memberships bm
    join public.tenant_memberships tm on tm.id = bm.tenant_membership_id
    where bm.branch_id = branch_id
      and bm.is_active = true
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
      and tm.role in ('owner', 'manager', 'branch_manager')
  )
  or exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
);

drop policy if exists branch_schedule_exceptions_select on public.branch_schedule_exceptions;
create policy branch_schedule_exceptions_select
on public.branch_schedule_exceptions
for select
to authenticated
using (public.has_branch_access(branch_id));

drop policy if exists branch_schedule_exceptions_manage on public.branch_schedule_exceptions;
create policy branch_schedule_exceptions_manage
on public.branch_schedule_exceptions
for all
to authenticated
using (
  exists (
    select 1
    from public.branch_memberships bm
    join public.tenant_memberships tm on tm.id = bm.tenant_membership_id
    where bm.branch_id = branch_id
      and bm.is_active = true
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
      and tm.role in ('owner', 'manager', 'branch_manager')
  )
  or exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.branch_memberships bm
    join public.tenant_memberships tm on tm.id = bm.tenant_membership_id
    where bm.branch_id = branch_id
      and bm.is_active = true
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
      and tm.role in ('owner', 'manager', 'branch_manager')
  )
  or exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
);

drop policy if exists branch_schedule_exception_windows_select on public.branch_schedule_exception_windows;
create policy branch_schedule_exception_windows_select
on public.branch_schedule_exception_windows
for select
to authenticated
using (
  exists (
    select 1
    from public.branch_schedule_exceptions bse
    where bse.id = exception_id
      and public.has_branch_access(bse.branch_id)
  )
);

drop policy if exists branch_schedule_exception_windows_manage on public.branch_schedule_exception_windows;
create policy branch_schedule_exception_windows_manage
on public.branch_schedule_exception_windows
for all
to authenticated
using (
  exists (
    select 1
    from public.branch_schedule_exceptions bse
    join public.branch_memberships bm on bm.branch_id = bse.branch_id
    join public.tenant_memberships tm on tm.id = bm.tenant_membership_id
    where bse.id = exception_id
      and bm.is_active = true
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
      and tm.role in ('owner', 'manager', 'branch_manager')
  )
  or exists (
    select 1
    from public.branch_schedule_exceptions bse
    join public.branches b on b.id = bse.branch_id
    where bse.id = exception_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.branch_schedule_exceptions bse
    join public.branch_memberships bm on bm.branch_id = bse.branch_id
    join public.tenant_memberships tm on tm.id = bm.tenant_membership_id
    where bse.id = exception_id
      and bm.is_active = true
      and tm.profile_id = public.current_profile_id()
      and tm.is_active = true
      and tm.role in ('owner', 'manager', 'branch_manager')
  )
  or exists (
    select 1
    from public.branch_schedule_exceptions bse
    join public.branches b on b.id = bse.branch_id
    where bse.id = exception_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
);
