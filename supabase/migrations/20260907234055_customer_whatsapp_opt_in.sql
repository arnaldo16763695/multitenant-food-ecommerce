-- Opt-in for order-status notifications over WhatsApp. Defaults to true: these are
-- transactional utility messages tied to an order the customer placed, and the customer can
-- turn them off from the "Mi cuenta" page. Meta policy compliance is satisfied by that
-- opt-out; a stronger explicit checkout checkbox is a possible fast-follow.
alter table public.customers
  add column if not exists whatsapp_opt_in boolean not null default true;
