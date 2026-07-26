alter table public.branches
add column if not exists address_line_1 text,
add column if not exists city text,
add column if not exists state text,
add column if not exists postal_code text,
add column if not exists country_code text,
add column if not exists latitude double precision,
add column if not exists longitude double precision;

alter table public.branches
drop constraint if exists branches_coordinates_presence_check;

alter table public.branches
add constraint branches_coordinates_presence_check
check (
  (latitude is null and longitude is null)
  or (latitude is not null and longitude is not null)
);

alter table public.branches
drop constraint if exists branches_latitude_range_check;

alter table public.branches
add constraint branches_latitude_range_check
check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.branches
drop constraint if exists branches_longitude_range_check;

alter table public.branches
add constraint branches_longitude_range_check
check (longitude is null or (longitude >= -180 and longitude <= 180));
