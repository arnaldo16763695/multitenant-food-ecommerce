alter table public.orders
add column if not exists assigned_tenant_membership_id uuid references public.tenant_memberships(id) on delete set null,
add column if not exists assigned_at timestamptz;

create index if not exists idx_orders_assigned_tenant_membership_id
  on public.orders(assigned_tenant_membership_id);
