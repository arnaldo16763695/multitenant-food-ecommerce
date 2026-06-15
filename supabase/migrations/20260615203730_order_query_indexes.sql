create index if not exists idx_orders_tenant_id_placed_at_desc
  on public.orders(tenant_id, placed_at desc);

create index if not exists idx_orders_tenant_id_customer_id_placed_at_desc
  on public.orders(tenant_id, customer_id, placed_at desc);

create index if not exists idx_orders_tenant_id_branch_id_status_placed_at_desc
  on public.orders(tenant_id, branch_id, status, placed_at desc);
