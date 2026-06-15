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
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
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
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.branches b
    where b.id = branch_id
      and public.has_tenant_role(b.tenant_id, array['owner', 'manager'])
  )
);
