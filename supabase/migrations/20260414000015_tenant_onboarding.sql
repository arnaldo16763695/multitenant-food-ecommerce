alter table public.tenants
add column if not exists onboarding_completed_at timestamptz,
add column if not exists onboarding_completed_by_profile_id uuid references public.profiles(id) on delete set null;
