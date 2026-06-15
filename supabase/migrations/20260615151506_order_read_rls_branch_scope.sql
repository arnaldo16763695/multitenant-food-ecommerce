drop policy if exists orders_select on public.orders;
create policy orders_select
on public.orders
for select
to authenticated
using (
  public.has_branch_access(branch_id)
  or (
    customer_id is not null
    and exists (
      select 1
      from public.customers c
      where c.id = customer_id
        and c.profile_id = public.current_profile_id()
    )
  )
);

drop policy if exists order_items_select on public.order_items;
create policy order_items_select
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        public.has_branch_access(o.branch_id)
        or (
          o.customer_id is not null
          and exists (
            select 1
            from public.customers c
            where c.id = o.customer_id
              and c.profile_id = public.current_profile_id()
          )
        )
      )
  )
);

drop policy if exists order_item_modifiers_select on public.order_item_modifiers;
create policy order_item_modifiers_select
on public.order_item_modifiers
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and (
        public.has_branch_access(o.branch_id)
        or (
          o.customer_id is not null
          and exists (
            select 1
            from public.customers c
            where c.id = o.customer_id
              and c.profile_id = public.current_profile_id()
          )
        )
      )
  )
);

drop policy if exists order_status_history_select on public.order_status_history;
create policy order_status_history_select
on public.order_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        public.has_branch_access(o.branch_id)
        or (
          o.customer_id is not null
          and exists (
            select 1
            from public.customers c
            where c.id = o.customer_id
              and c.profile_id = public.current_profile_id()
          )
        )
      )
  )
);

drop policy if exists payments_select on public.payments;
create policy payments_select
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        public.has_branch_access(o.branch_id)
        or (
          o.customer_id is not null
          and exists (
            select 1
            from public.customers c
            where c.id = o.customer_id
              and c.profile_id = public.current_profile_id()
          )
        )
      )
  )
);
