set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_storefront_order_atomic(p_tenant_id uuid, p_branch_id uuid, p_customer_id uuid, p_fulfillment_type text, p_customer_name text, p_customer_phone text, p_customer_email text, p_customer_notes text, p_subtotal numeric, p_items jsonb)
 RETURNS TABLE(order_id uuid, order_number bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  created_order public.orders%rowtype;
  current_item jsonb;
  created_order_item_id uuid;
  current_modifier jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'create_storefront_order_atomic requires at least one order item';
  end if;

  insert into public.orders (
    tenant_id,
    branch_id,
    customer_id,
    channel,
    fulfillment_type,
    status,
    payment_status,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address_snapshot,
    subtotal_amount,
    discount_amount,
    delivery_fee,
    tax_amount,
    total_amount,
    currency,
    notes
  )
  values (
    p_tenant_id,
    p_branch_id,
    p_customer_id,
    'web',
    p_fulfillment_type,
    'pending_payment',
    'pending',
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    case when p_fulfillment_type = 'delivery' then '{}'::jsonb else null end,
    p_subtotal,
    0,
    0,
    0,
    p_subtotal,
    'MXN',
    p_customer_notes
  )
  returning * into created_order;

  for current_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      product_variant_id,
      product_name_snapshot,
      variant_name_snapshot,
      category_name_snapshot,
      unit_price_snapshot,
      quantity,
      line_total,
      notes
    )
    values (
      created_order.id,
      (current_item ->> 'product_id')::uuid,
      (current_item ->> 'product_variant_id')::uuid,
      current_item ->> 'product_name_snapshot',
      current_item ->> 'variant_name_snapshot',
      current_item ->> 'category_name_snapshot',
      (current_item ->> 'unit_price_snapshot')::numeric(10, 2),
      (current_item ->> 'quantity')::integer,
      (current_item ->> 'line_total')::numeric(10, 2),
      current_item ->> 'notes'
    )
    returning id into created_order_item_id;

    for current_modifier in
      select value
      from jsonb_array_elements(coalesce(current_item -> 'modifiers', '[]'::jsonb))
    loop
      insert into public.order_item_modifiers (
        order_item_id,
        modifier_group_name_snapshot,
        modifier_option_name_snapshot,
        price_snapshot
      )
      values (
        created_order_item_id,
        current_modifier ->> 'modifier_group_name_snapshot',
        current_modifier ->> 'modifier_option_name_snapshot',
        coalesce((current_modifier ->> 'price_snapshot')::numeric(10, 2), 0)
      );
    end loop;
  end loop;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by_profile_id,
    source
  )
  values (
    created_order.id,
    null,
    'pending_payment',
    null,
    'customer'
  );

  return query
  select created_order.id, created_order.order_number;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_branch_membership_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  branch_tenant_id uuid;
  membership_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  select tm.tenant_id into membership_tenant_id
  from public.tenant_memberships tm
  where tm.id = new.tenant_membership_id;

  if branch_tenant_id is null or membership_tenant_id is null or branch_tenant_id <> membership_tenant_id then
    raise exception 'branch_memberships must reference branch and tenant membership from the same tenant';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_branch_product_override_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  branch_tenant_id uuid;
  product_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  select p.tenant_id into product_tenant_id
  from public.products p
  where p.id = new.product_id;

  if branch_tenant_id is null or product_tenant_id is null or branch_tenant_id <> product_tenant_id then
    raise exception 'branch_product_overrides must reference branch and product from the same tenant';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_branch_product_variant_override_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  branch_tenant_id uuid;
  variant_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  select pv.tenant_id into variant_tenant_id
  from public.product_variants pv
  where pv.id = new.product_variant_id;

  if branch_tenant_id is null or variant_tenant_id is null or branch_tenant_id <> variant_tenant_id then
    raise exception 'branch_product_variant_overrides must reference branch and variant from the same tenant';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_order_tenant_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  branch_tenant_id uuid;
  assigned_membership_tenant_id uuid;
begin
  select b.tenant_id into branch_tenant_id
  from public.branches b
  where b.id = new.branch_id;

  if branch_tenant_id is null or branch_tenant_id <> new.tenant_id then
    raise exception 'orders must reference a branch from the same tenant';
  end if;

  if new.assigned_tenant_membership_id is null then
    return new;
  end if;

  select tm.tenant_id into assigned_membership_tenant_id
  from public.tenant_memberships tm
  where tm.id = new.assigned_tenant_membership_id;

  if assigned_membership_tenant_id is null or assigned_membership_tenant_id <> new.tenant_id then
    raise exception 'orders must reference an assigned tenant membership from the same tenant';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_product_category_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  category_tenant_id uuid;
begin
  if new.category_id is null then
    return new;
  end if;

  select c.tenant_id into category_tenant_id
  from public.categories c
  where c.id = new.category_id;

  if category_tenant_id is null or category_tenant_id <> new.tenant_id then
    raise exception 'products must reference a category from the same tenant';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_product_modifier_group_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  product_tenant_id uuid;
  modifier_group_tenant_id uuid;
begin
  select p.tenant_id into product_tenant_id
  from public.products p
  where p.id = new.product_id;

  select mg.tenant_id into modifier_group_tenant_id
  from public.modifier_groups mg
  where mg.id = new.modifier_group_id;

  if product_tenant_id is null or modifier_group_tenant_id is null or product_tenant_id <> modifier_group_tenant_id then
    raise exception 'product_modifier_groups must reference product and modifier group from the same tenant';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_product_variant_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  product_tenant_id uuid;
begin
  select p.tenant_id into product_tenant_id
  from public.products p
  where p.id = new.product_id;

  if product_tenant_id is null or product_tenant_id <> new.tenant_id then
    raise exception 'product_variants must reference product and tenant from the same tenant';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_payments_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (
    select 1
    from public.payments p
    where p.order_id = new.id
  ) then
    update public.payments
    set
      status = new.payment_status,
      amount = new.total_amount,
      currency = new.currency,
      paid_at = case
        when new.payment_status = 'paid' then coalesce(paid_at, now())
        when new.payment_status in ('pending', 'failed') then null
        else paid_at
      end
    where order_id = new.id;
  else
    insert into public.payments (
      order_id,
      status,
      amount,
      currency,
      paid_at,
      provider,
      provider_payment_id,
      raw_response
    )
    values (
      new.id,
      new.payment_status,
      new.total_amount,
      new.currency,
      case when new.payment_status = 'paid' then now() else null end,
      'system',
      null,
      null
    );
  end if;

  return new;
end;
$function$
;

grant delete on table "public"."branch_product_variant_overrides" to "anon";

grant insert on table "public"."branch_product_variant_overrides" to "anon";

grant select on table "public"."branch_product_variant_overrides" to "anon";

grant update on table "public"."branch_product_variant_overrides" to "anon";

grant delete on table "public"."branch_product_variant_overrides" to "authenticated";

grant insert on table "public"."branch_product_variant_overrides" to "authenticated";

grant select on table "public"."branch_product_variant_overrides" to "authenticated";

grant update on table "public"."branch_product_variant_overrides" to "authenticated";

grant delete on table "public"."branch_product_variant_overrides" to "service_role";

grant insert on table "public"."branch_product_variant_overrides" to "service_role";

grant select on table "public"."branch_product_variant_overrides" to "service_role";

grant update on table "public"."branch_product_variant_overrides" to "service_role";

grant delete on table "public"."customer_bag_item_modifiers" to "anon";

grant insert on table "public"."customer_bag_item_modifiers" to "anon";

grant select on table "public"."customer_bag_item_modifiers" to "anon";

grant update on table "public"."customer_bag_item_modifiers" to "anon";

grant delete on table "public"."customer_bag_item_modifiers" to "authenticated";

grant insert on table "public"."customer_bag_item_modifiers" to "authenticated";

grant select on table "public"."customer_bag_item_modifiers" to "authenticated";

grant update on table "public"."customer_bag_item_modifiers" to "authenticated";

grant delete on table "public"."customer_bag_item_modifiers" to "service_role";

grant insert on table "public"."customer_bag_item_modifiers" to "service_role";

grant select on table "public"."customer_bag_item_modifiers" to "service_role";

grant update on table "public"."customer_bag_item_modifiers" to "service_role";

grant delete on table "public"."customer_bag_items" to "anon";

grant insert on table "public"."customer_bag_items" to "anon";

grant select on table "public"."customer_bag_items" to "anon";

grant update on table "public"."customer_bag_items" to "anon";

grant delete on table "public"."customer_bag_items" to "authenticated";

grant insert on table "public"."customer_bag_items" to "authenticated";

grant select on table "public"."customer_bag_items" to "authenticated";

grant update on table "public"."customer_bag_items" to "authenticated";

grant delete on table "public"."customer_bag_items" to "service_role";

grant insert on table "public"."customer_bag_items" to "service_role";

grant select on table "public"."customer_bag_items" to "service_role";

grant update on table "public"."customer_bag_items" to "service_role";

grant delete on table "public"."modifier_group_options" to "anon";

grant insert on table "public"."modifier_group_options" to "anon";

grant select on table "public"."modifier_group_options" to "anon";

grant update on table "public"."modifier_group_options" to "anon";

grant delete on table "public"."modifier_group_options" to "authenticated";

grant insert on table "public"."modifier_group_options" to "authenticated";

grant select on table "public"."modifier_group_options" to "authenticated";

grant update on table "public"."modifier_group_options" to "authenticated";

grant delete on table "public"."modifier_group_options" to "service_role";

grant insert on table "public"."modifier_group_options" to "service_role";

grant select on table "public"."modifier_group_options" to "service_role";

grant update on table "public"."modifier_group_options" to "service_role";

grant delete on table "public"."product_variants" to "anon";

grant insert on table "public"."product_variants" to "anon";

grant select on table "public"."product_variants" to "anon";

grant update on table "public"."product_variants" to "anon";

grant delete on table "public"."product_variants" to "authenticated";

grant insert on table "public"."product_variants" to "authenticated";

grant select on table "public"."product_variants" to "authenticated";

grant update on table "public"."product_variants" to "authenticated";

grant delete on table "public"."product_variants" to "service_role";

grant insert on table "public"."product_variants" to "service_role";

grant select on table "public"."product_variants" to "service_role";

grant update on table "public"."product_variants" to "service_role";


