alter table public.order_items
add column if not exists prep_status text not null default 'pending';

alter table public.order_items
drop constraint if exists order_items_prep_status_check;

alter table public.order_items
add constraint order_items_prep_status_check
check (prep_status in ('pending', 'ready'));

create index if not exists idx_order_items_order_id_prep_status
  on public.order_items(order_id, prep_status);
