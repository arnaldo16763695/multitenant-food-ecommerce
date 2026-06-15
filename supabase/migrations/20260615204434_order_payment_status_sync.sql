create or replace function public.sync_payments_from_order()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.payments p
    where p.order_id = new.id
  ) then
    update public.payments
    set
      status = new.payment_status,
      amount = new.total_amount,
      currency = new.currency,
      paid_at = case
        when new.payment_status = 'paid' then coalesce(paid_at, now())
        when new.payment_status in ('pending', 'failed') then null
        else paid_at
      end
    where order_id = new.id;
  else
    insert into public.payments (
      order_id,
      status,
      amount,
      currency,
      paid_at,
      provider,
      provider_payment_id,
      raw_response
    )
    values (
      new.id,
      new.payment_status,
      new.total_amount,
      new.currency,
      case when new.payment_status = 'paid' then now() else null end,
      'system',
      null,
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_payments_from_order on public.orders;
create trigger sync_payments_from_order
after insert or update of payment_status, total_amount, currency on public.orders
for each row
execute function public.sync_payments_from_order();

insert into public.payments (
  order_id,
  status,
  amount,
  currency,
  paid_at,
  provider,
  provider_payment_id,
  raw_response
)
select
  o.id,
  o.payment_status,
  o.total_amount,
  o.currency,
  case when o.payment_status = 'paid' then coalesce(o.confirmed_at, o.placed_at, now()) else null end,
  'system',
  null,
  null
from public.orders o
where not exists (
  select 1
  from public.payments p
  where p.order_id = o.id
);

update public.payments p
set
  status = o.payment_status,
  amount = o.total_amount,
  currency = o.currency,
  paid_at = case
    when o.payment_status = 'paid' then coalesce(p.paid_at, o.confirmed_at, o.placed_at, now())
    when o.payment_status in ('pending', 'failed') then null
    else p.paid_at
  end
from public.orders o
where o.id = p.order_id;
