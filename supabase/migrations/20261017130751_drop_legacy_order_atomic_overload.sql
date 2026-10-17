-- 20260922125016_order_delivery_address_snapshot.sql added two new trailing parameters to
-- create_storefront_order_atomic via CREATE OR REPLACE FUNCTION. In Postgres, a function is
-- identified by name + parameter list, so adding parameters doesn't replace the existing
-- function -- it creates a SECOND overload alongside the original 10-parameter one. Any RPC call
-- that doesn't uniquely disambiguate between the two overloads (which is effectively every call,
-- since the two new parameters are optional/defaulted) now fails with "Could not choose the best
-- candidate function", breaking checkout entirely (pickup included, not just delivery).
--
-- Fix: drop the stale 10-parameter overload so only the 12-parameter version (with defaults for
-- the two new params) remains. This is the exact signature of the original function as created in
-- 20260615202703_storefront_order_atomic_rpc.sql.
drop function if exists public.create_storefront_order_atomic(
  uuid, uuid, uuid, text, text, text, text, text, numeric, jsonb
);
