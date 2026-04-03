alter table public.tenants
add column if not exists storefront_enabled boolean not null default true;

alter table public.tenants
add column if not exists custom_domain text;

create unique index if not exists idx_tenants_custom_domain_unique
  on public.tenants (lower(custom_domain))
  where custom_domain is not null;
