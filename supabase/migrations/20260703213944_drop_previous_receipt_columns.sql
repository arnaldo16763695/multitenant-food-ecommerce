alter table public.payments
drop column if exists previous_receipt_image_path,
drop column if exists previous_receipt_submitted_at;
