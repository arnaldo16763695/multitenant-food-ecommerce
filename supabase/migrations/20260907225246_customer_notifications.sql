-- Slim notification-delivery log for customer order events. Written only by the service role
-- (via the dispatch layer in lib/services/notifications.ts). No client ever reads it -- its job
-- is (1) idempotency so a retried / double-clicked status transition does not re-send an email
-- or a paid WhatsApp message, and (2) an audit of what was sent on which channel.
-- Modeled on audit_events (20260726130824_audit_events.sql): validate trigger + RLS + grants.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- Nullable: guest checkout (orders.customer_id is null) still gets an email + an audit row.
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  type text not null,
  -- Distinguishes recurrences of an otherwise-once event (payment_rejected after a
  -- resubmission). Null for one-directional order-status events.
  dedupe_key text,
  email_status text,
  whatsapp_status text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint notifications_type_not_blank check (btrim(type) <> ''),
  constraint notifications_email_status_check
    check (email_status is null or email_status in ('sent', 'skipped', 'failed')),
  constraint notifications_whatsapp_status_check
    check (whatsapp_status is null or whatsapp_status in ('sent', 'skipped', 'failed', 'not_applicable')),
  constraint notifications_metadata_object_check
    check (metadata is null or jsonb_typeof(metadata) = 'object')
);

-- Idempotency: one row per (order, type, dedupe_key). A conflicting insert (SQLSTATE 23505) is
-- how the dispatcher detects "already sent" and skips every channel on retries / double clicks.
create unique index if not exists uq_notifications_order_type_dedupe
  on public.notifications (order_id, type, coalesce(dedupe_key, ''))
  where order_id is not null;

create index if not exists idx_notifications_order_created_at
  on public.notifications (order_id, created_at desc);

create or replace function public.validate_notification()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  order_tenant_id uuid;
  order_customer_id uuid;
begin
  if new.order_id is not null then
    select o.tenant_id, o.customer_id
    into order_tenant_id, order_customer_id
    from public.orders o
    where o.id = new.order_id;

    if order_tenant_id is null then
      raise exception 'Notification order % was not found.', new.order_id;
    end if;

    if order_tenant_id <> new.tenant_id then
      raise exception 'Notification order % does not belong to tenant %.', new.order_id, new.tenant_id;
    end if;

    if order_customer_id is not null and new.customer_id is not null and order_customer_id <> new.customer_id then
      raise exception 'Notification customer % does not own order %.', new.customer_id, new.order_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_notification on public.notifications;
create trigger validate_notification
before insert or update on public.notifications
for each row
execute function public.validate_notification();

alter table public.notifications enable row level security;

-- Only the service role touches this table. No grants / policies for `authenticated`.
grant insert, select, update on table public.notifications to service_role;
