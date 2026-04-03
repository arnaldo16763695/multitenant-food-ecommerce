-- Replace these values before running the seed.
-- The auth user should already exist in auth.users if you want a registered customer.
do $$
declare
  input_auth_user_id uuid := null;
  input_email text := 'customer@demo-brand.com';
  input_full_name text := 'Demo Customer';
  input_phone text := '+5215512345678';
  input_marketing_opt_in boolean := false;

  input_address_label text := 'Casa';
  input_address_line_1 text := 'Av. Reforma 123';
  input_address_line_2 text := 'Col. Centro';
  input_city text := 'Ciudad de Mexico';
  input_state text := 'CDMX';
  input_postal_code text := '06000';
  input_country text := 'MX';
  input_latitude numeric := null;
  input_longitude numeric := null;
  input_delivery_notes text := 'Tocar el timbre al llegar';

  resolved_auth_user_id uuid;
  resolved_profile_id uuid;
  resolved_customer_id uuid;
begin
  select coalesce(input_auth_user_id, au.id)
  into resolved_auth_user_id
  from auth.users au
  where lower(au.email) = lower(input_email)
     or au.id = input_auth_user_id
  limit 1;

  if resolved_auth_user_id is not null then
    insert into public.profiles (auth_user_id, email, full_name)
    values (resolved_auth_user_id, input_email, input_full_name)
    on conflict (auth_user_id) do update set
      email = excluded.email,
      full_name = excluded.full_name,
      updated_at = now()
    returning id into resolved_profile_id;
  else
    resolved_profile_id := null;
  end if;

  if resolved_profile_id is not null then
    insert into public.customers (profile_id, email, phone, full_name, marketing_opt_in)
    values (resolved_profile_id, input_email, input_phone, input_full_name, input_marketing_opt_in)
    on conflict (profile_id) do update set
      email = excluded.email,
      phone = excluded.phone,
      full_name = excluded.full_name,
      marketing_opt_in = excluded.marketing_opt_in,
      updated_at = now()
    returning id into resolved_customer_id;
  else
    select c.id
    into resolved_customer_id
    from public.customers c
    where lower(c.email) = lower(input_email)
      and c.profile_id is null
    limit 1;

    if resolved_customer_id is null then
      insert into public.customers (profile_id, email, phone, full_name, marketing_opt_in)
      values (null, input_email, input_phone, input_full_name, input_marketing_opt_in)
      returning id into resolved_customer_id;
    else
      update public.customers
      set phone = input_phone,
          full_name = input_full_name,
          marketing_opt_in = input_marketing_opt_in,
          updated_at = now()
      where id = resolved_customer_id;
    end if;
  end if;

  if resolved_customer_id is null then
    raise exception 'No se pudo resolver el customer para %.', input_email;
  end if;

  insert into public.customer_addresses (
    customer_id,
    label,
    address_line_1,
    address_line_2,
    city,
    state,
    postal_code,
    country,
    latitude,
    longitude,
    delivery_notes,
    is_default
  )
  values (
    resolved_customer_id,
    input_address_label,
    input_address_line_1,
    input_address_line_2,
    input_city,
    input_state,
    input_postal_code,
    input_country,
    input_latitude,
    input_longitude,
    input_delivery_notes,
    true
  )
  on conflict do nothing;

  update public.customer_addresses
  set is_default = (id = (
    select ca.id
    from public.customer_addresses ca
    where ca.customer_id = resolved_customer_id
    order by ca.created_at asc
    limit 1
  ))
  where customer_id = resolved_customer_id;
end $$;
