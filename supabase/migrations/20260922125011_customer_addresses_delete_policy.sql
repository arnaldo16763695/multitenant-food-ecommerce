-- customer_addresses shipped in 20260401000004_customers_foundation.sql with select/insert/update
-- policies but no delete policy -- needed now that the address book UI lets a customer remove a
-- saved address. Same ownership check shape as customer_addresses_self_update.
drop policy if exists customer_addresses_self_delete on public.customer_addresses;
create policy customer_addresses_self_delete
on public.customer_addresses
for delete
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
);
