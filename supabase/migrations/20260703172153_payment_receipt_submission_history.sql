create table if not exists public.payment_receipt_submissions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method text not null,
  receipt_image_path text not null,
  review_status text not null default 'pending',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint payment_receipt_submissions_payment_method_check check (payment_method in ('mobile_payment', 'bank_transfer')),
  constraint payment_receipt_submissions_review_status_check check (review_status in ('pending', 'rejected', 'accepted'))
);

create index if not exists idx_payment_receipt_submissions_payment_id
  on public.payment_receipt_submissions(payment_id, submitted_at desc);

create index if not exists idx_payment_receipt_submissions_order_id
  on public.payment_receipt_submissions(order_id, submitted_at desc);

alter table public.payment_receipt_submissions enable row level security;

grant delete on table public.payment_receipt_submissions to anon;
grant insert on table public.payment_receipt_submissions to anon;
grant select on table public.payment_receipt_submissions to anon;
grant update on table public.payment_receipt_submissions to anon;
grant delete on table public.payment_receipt_submissions to authenticated;
grant insert on table public.payment_receipt_submissions to authenticated;
grant select on table public.payment_receipt_submissions to authenticated;
grant update on table public.payment_receipt_submissions to authenticated;
grant delete on table public.payment_receipt_submissions to service_role;
grant insert on table public.payment_receipt_submissions to service_role;
grant select on table public.payment_receipt_submissions to service_role;
grant update on table public.payment_receipt_submissions to service_role;

drop policy if exists payment_receipt_submissions_manage on public.payment_receipt_submissions;
create policy payment_receipt_submissions_manage
on public.payment_receipt_submissions
for all
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = payment_receipt_submissions.order_id
      and public.has_branch_access(o.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = payment_receipt_submissions.order_id
      and public.has_branch_access(o.branch_id)
  )
);

drop policy if exists payment_receipt_submissions_select on public.payment_receipt_submissions;
create policy payment_receipt_submissions_select
on public.payment_receipt_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = payment_receipt_submissions.order_id
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

insert into public.payment_receipt_submissions (
  payment_id,
  order_id,
  payment_method,
  receipt_image_path,
  review_status,
  rejection_reason,
  submitted_at,
  reviewed_at,
  reviewed_by_profile_id
)
select
  p.id,
  p.order_id,
  p.payment_method,
  p.previous_receipt_image_path,
  'rejected',
  null,
  coalesce(p.previous_receipt_submitted_at, p.created_at, now()),
  coalesce(p.rejected_at, p.updated_at, now()),
  null
from public.payments p
where p.payment_method is not null
  and p.previous_receipt_image_path is not null
  and not exists (
    select 1
    from public.payment_receipt_submissions prs
    where prs.payment_id = p.id
      and prs.receipt_image_path = p.previous_receipt_image_path
  );

insert into public.payment_receipt_submissions (
  payment_id,
  order_id,
  payment_method,
  receipt_image_path,
  review_status,
  rejection_reason,
  submitted_at,
  reviewed_at,
  reviewed_by_profile_id
)
select
  p.id,
  p.order_id,
  p.payment_method,
  p.receipt_image_path,
  case
    when p.status = 'failed' then 'rejected'
    when p.status in ('paid', 'refunded') then 'accepted'
    else 'pending'
  end,
  case when p.status = 'failed' then p.rejection_reason else null end,
  coalesce(p.receipt_submitted_at, p.updated_at, p.created_at, now()),
  case
    when p.status = 'failed' then coalesce(p.rejected_at, p.updated_at, now())
    when p.status in ('paid', 'refunded') then coalesce(p.paid_at, p.updated_at, now())
    else null
  end,
  null
from public.payments p
where p.payment_method is not null
  and p.receipt_image_path is not null
  and not exists (
    select 1
    from public.payment_receipt_submissions prs
    where prs.payment_id = p.id
      and prs.receipt_image_path = p.receipt_image_path
  );
