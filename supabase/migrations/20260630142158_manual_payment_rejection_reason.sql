alter table public.payments
add column if not exists rejection_reason text,
add column if not exists rejected_at timestamptz;
