-- getPlatformTenants previously fetched every row of branches (is_active) and every row of
-- tenant_memberships (is_active) across the ENTIRE platform, then grouped them into per-tenant
-- counts in JavaScript. That scales with total branches/staff across every tenant on the
-- platform, not with the number of tenants -- pushing the aggregation into Postgres instead
-- means the payload returned is bounded by tenant count, and Postgres can do the counting with
-- an index scan instead of shipping every row over the wire.
--
-- security definer because no RLS policy grants platform members direct read access to tenants/
-- branches/tenant_memberships (only "platform_memberships_self_select" exists) -- this platform
-- surface has always relied on the service-role admin client bypassing RLS; this function keeps
-- that same behavior instead of introducing a new dependency on it.
create or replace function public.get_platform_tenant_summaries()
returns table (
  id uuid,
  name text,
  slug text,
  storefront_enabled boolean,
  active_branch_count bigint,
  active_membership_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.slug,
    t.storefront_enabled,
    coalesce(b.active_branch_count, 0) as active_branch_count,
    coalesce(m.active_membership_count, 0) as active_membership_count
  from public.tenants t
  left join (
    select tenant_id, count(*) as active_branch_count
    from public.branches
    where is_active = true
    group by tenant_id
  ) b on b.tenant_id = t.id
  left join (
    select tenant_id, count(*) as active_membership_count
    from public.tenant_memberships
    where is_active = true
    group by tenant_id
  ) m on m.tenant_id = t.id
  order by t.name asc;
$$;
