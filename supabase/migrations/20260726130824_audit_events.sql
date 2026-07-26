create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_membership_id uuid references public.tenant_memberships(id) on delete set null,
  actor_name text,
  actor_role text,
  actor_surface text not null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  summary text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_actor_surface_check check (actor_surface in ('admin', 'kitchen', 'storefront', 'mobile_api', 'system')),
  constraint audit_events_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint audit_events_action_not_blank check (btrim(action) <> ''),
  constraint audit_events_summary_not_blank check (btrim(summary) <> ''),
  constraint audit_events_before_data_object_check check (before_data is null or jsonb_typeof(before_data) = 'object'),
  constraint audit_events_after_data_object_check check (after_data is null or jsonb_typeof(after_data) = 'object'),
  constraint audit_events_metadata_object_check check (metadata is null or jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_audit_events_tenant_created_at
  on public.audit_events(tenant_id, created_at desc);

create index if not exists idx_audit_events_tenant_entity
  on public.audit_events(tenant_id, entity_type, entity_id, created_at desc);

create index if not exists idx_audit_events_tenant_actor_membership
  on public.audit_events(tenant_id, actor_membership_id, created_at desc)
  where actor_membership_id is not null;

create index if not exists idx_audit_events_tenant_branch
  on public.audit_events(tenant_id, branch_id, created_at desc)
  where branch_id is not null;

create or replace function public.validate_audit_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  branch_tenant_id uuid;
  membership_tenant_id uuid;
  membership_profile_id uuid;
begin
  if new.branch_id is not null then
    select b.tenant_id
    into branch_tenant_id
    from public.branches b
    where b.id = new.branch_id;

    if branch_tenant_id is null then
      raise exception 'Audit event branch % was not found.', new.branch_id;
    end if;

    if branch_tenant_id <> new.tenant_id then
      raise exception 'Audit event branch % does not belong to tenant %.', new.branch_id, new.tenant_id;
    end if;
  end if;

  if new.actor_membership_id is not null then
    select tm.tenant_id, tm.profile_id
    into membership_tenant_id, membership_profile_id
    from public.tenant_memberships tm
    where tm.id = new.actor_membership_id;

    if membership_tenant_id is null then
      raise exception 'Audit event membership % was not found.', new.actor_membership_id;
    end if;

    if membership_tenant_id <> new.tenant_id then
      raise exception 'Audit event membership % does not belong to tenant %.', new.actor_membership_id, new.tenant_id;
    end if;

    if new.actor_profile_id is not null and membership_profile_id <> new.actor_profile_id then
      raise exception 'Audit event actor profile % does not match membership %.', new.actor_profile_id, new.actor_membership_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_audit_event on public.audit_events;
create trigger validate_audit_event
before insert or update on public.audit_events
for each row
execute function public.validate_audit_event();

alter table public.audit_events enable row level security;

grant insert, select on table public.audit_events to authenticated;
grant insert, select on table public.audit_events to service_role;

drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert
on public.audit_events
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select
on public.audit_events
for select
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'manager']));

create or replace function public.update_order_status_atomic(
  p_tenant_id uuid,
  p_order_id uuid,
  p_from_status text,
  p_to_status text,
  p_changed_by_profile_id uuid,
  p_source text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.orders
  set
    status = p_to_status,
    confirmed_at = case when p_to_status = 'confirmed' then now() else confirmed_at end,
    completed_at = case when p_to_status in ('completed', 'fulfilled') then now() else completed_at end,
    cancelled_at = case when p_to_status = 'cancelled' then now() else cancelled_at end,
    payment_status = case when p_to_status = 'confirmed' then 'paid' else payment_status end
  where tenant_id = p_tenant_id
    and id = p_order_id
    and status = p_from_status;

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    return false;
  end if;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by_profile_id,
    source
  )
  values (
    p_order_id,
    p_from_status,
    p_to_status,
    p_changed_by_profile_id,
    p_source
  );

  return true;
end;
$$;

revoke all on function public.update_order_status_atomic(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text
) from public;

grant execute on function public.update_order_status_atomic(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text
) to service_role;
