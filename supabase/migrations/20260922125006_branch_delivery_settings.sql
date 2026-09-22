-- Delivery is opt-in per branch, default off -- no existing live branch should suddenly start
-- "offering" delivery just because this column exists. delivery_radius_km is required exactly
-- when delivery_enabled is true, same NULL-pairing pattern as
-- branches_coordinates_presence_check (20260726034410_branch_location_coordinates_fix.sql).
alter table public.branches
  add column if not exists delivery_enabled boolean not null default false,
  add column if not exists delivery_fee numeric(10, 2) not null default 0,
  add column if not exists delivery_radius_km numeric(6, 2);

alter table public.branches
  drop constraint if exists branches_delivery_fee_non_negative_check;
alter table public.branches
  add constraint branches_delivery_fee_non_negative_check
  check (delivery_fee >= 0);

alter table public.branches
  drop constraint if exists branches_delivery_radius_check;
alter table public.branches
  add constraint branches_delivery_radius_check
  check (
    (delivery_enabled = false and delivery_radius_km is null)
    or (delivery_enabled = true and delivery_radius_km is not null and delivery_radius_km > 0)
  );
