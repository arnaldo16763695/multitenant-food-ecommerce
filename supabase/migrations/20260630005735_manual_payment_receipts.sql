alter table public.tenants
add column if not exists mobile_payment_instructions text,
add column if not exists bank_transfer_instructions text;

alter table public.payments
add column if not exists payment_method text,
add column if not exists receipt_image_path text,
add column if not exists receipt_submitted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_payment_method_check'
  ) then
    alter table public.payments
    add constraint payments_payment_method_check
    check (payment_method is null or payment_method in ('mobile_payment', 'bank_transfer'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
