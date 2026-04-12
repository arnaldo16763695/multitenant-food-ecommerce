alter table public.categories
add column if not exists image_path text,
add column if not exists image_alt text;

alter table public.products
add column if not exists primary_image_path text,
add column if not exists primary_image_alt text;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id
  on public.product_images(product_id);

create index if not exists idx_product_images_product_id_sort_order
  on public.product_images(product_id, sort_order);

drop trigger if exists set_product_images_updated_at on public.product_images;
create trigger set_product_images_updated_at
before update on public.product_images
for each row
execute function public.set_updated_at();

alter table public.product_images enable row level security;

drop policy if exists product_images_select on public.product_images;
create policy product_images_select
on public.product_images
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and public.has_tenant_access(p.tenant_id)
  )
);

drop policy if exists product_images_manage on public.product_images;
create policy product_images_manage
on public.product_images
for all
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and public.has_tenant_role(p.tenant_id, array['owner', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and public.has_tenant_role(p.tenant_id, array['owner', 'manager'])
  )
);
