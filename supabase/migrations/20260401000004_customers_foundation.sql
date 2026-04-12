create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  email text,
  phone text,
  full_name text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null default 'Principal',
  address_line_1 text not null,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'MX',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_profile_id
  on public.customers(profile_id);

create index if not exists idx_customers_email
  on public.customers(email);

create index if not exists idx_customers_phone
  on public.customers(phone);

create index if not exists idx_customer_addresses_customer_id
  on public.customer_addresses(customer_id);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;

drop policy if exists customers_self_select on public.customers;
create policy customers_self_select
on public.customers
for select
to authenticated
using (
  profile_id is not null
  and profile_id = public.current_profile_id()
);

drop policy if exists customers_self_insert on public.customers;
create policy customers_self_insert
on public.customers
for insert
to authenticated
with check (
  profile_id is not null
  and profile_id = public.current_profile_id()
);

drop policy if exists customers_self_update on public.customers;
create policy customers_self_update
on public.customers
for update
to authenticated
using (
  profile_id is not null
  and profile_id = public.current_profile_id()
)
with check (
  profile_id is not null
  and profile_id = public.current_profile_id()
);

drop policy if exists customer_addresses_self_select on public.customer_addresses;
create policy customer_addresses_self_select
on public.customer_addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
);

drop policy if exists customer_addresses_self_insert on public.customer_addresses;
create policy customer_addresses_self_insert
on public.customer_addresses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
);

drop policy if exists customer_addresses_self_update on public.customer_addresses;
create policy customer_addresses_self_update
on public.customer_addresses
for update
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.profile_id = public.current_profile_id()
  )
);
