alter table public.audit_events
  alter column tenant_id drop not null;

alter table public.audit_events
  drop constraint if exists audit_events_actor_surface_check;

alter table public.audit_events
  add constraint audit_events_actor_surface_check check (actor_surface in ('admin', 'kitchen', 'storefront', 'mobile_api', 'platform', 'system'));

drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert
on public.audit_events
for insert
to authenticated
with check (
  (tenant_id is not null and public.has_tenant_access(tenant_id))
  or (
    tenant_id is null
    and exists (
      select 1
      from public.platform_memberships pm
      where pm.profile_id = public.current_profile_id()
        and pm.is_active = true
    )
  )
);

drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select
on public.audit_events
for select
to authenticated
using (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner', 'manager']));

drop policy if exists audit_events_select_platform on public.audit_events;
create policy audit_events_select_platform
on public.audit_events
for select
to authenticated
using (
  tenant_id is null
  and exists (
    select 1
    from public.platform_memberships pm
    where pm.profile_id = public.current_profile_id()
      and pm.is_active = true
  )
);
