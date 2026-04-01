-- Replace these values before running the seed.
-- The auth user must already exist in auth.users.
-- You can either provide auth_user_id directly or leave it null and resolve the user by email.
do $$
declare
  input_auth_user_id uuid := null;
  input_email text := 'arnaldoespinoza1@hotmail.com';
  input_full_name text := 'Demo Brand Owner';
  input_tenant_slug text := 'demo-brand';
  input_tenant_role text := 'owner';
  input_branch_slug text := 'centro';
  input_branch_role text := 'owner';

  resolved_auth_user_id uuid;
  resolved_tenant_id uuid;
  resolved_profile_id uuid;
  resolved_tenant_membership_id uuid;
  resolved_branch_id uuid;
begin
  select coalesce(input_auth_user_id, au.id)
  into resolved_auth_user_id
  from auth.users au
  where lower(au.email) = lower(input_email)
     or au.id = input_auth_user_id
  limit 1;

  if resolved_auth_user_id is null then
    raise exception 'No matching auth.users row was found. Replace input_auth_user_id or use an existing email from Authentication > Users.';
  end if;

  select id
  into resolved_tenant_id
  from public.tenants
  where slug = input_tenant_slug
  limit 1;

  if resolved_tenant_id is null then
    raise exception 'Tenant with slug % was not found. Run the catalog seed first.', input_tenant_slug;
  end if;

  insert into public.profiles (auth_user_id, email, full_name)
  values (resolved_auth_user_id, input_email, input_full_name)
  on conflict (auth_user_id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now()
  returning id into resolved_profile_id;

  insert into public.tenant_memberships (tenant_id, profile_id, role, is_active)
  values (resolved_tenant_id, resolved_profile_id, input_tenant_role, true)
  on conflict (tenant_id, profile_id) do update set
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now()
  returning id into resolved_tenant_membership_id;

  select id
  into resolved_branch_id
  from public.branches
  where tenant_id = resolved_tenant_id
    and slug = input_branch_slug
  limit 1;

  if resolved_branch_id is null then
    raise exception 'Branch with slug % was not found for tenant %.', input_branch_slug, input_tenant_slug;
  end if;

  insert into public.branch_memberships (branch_id, tenant_membership_id, role, is_active)
  values (resolved_branch_id, resolved_tenant_membership_id, input_branch_role, true)
  on conflict (branch_id, tenant_membership_id) do update set
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();
end $$;
