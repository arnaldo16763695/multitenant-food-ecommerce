alter table public.payments
add column if not exists previous_receipt_image_path text,
add column if not exists previous_receipt_submitted_at timestamptz;
