drop trigger if exists "enforce_branch_membership_tenant_match" on "public"."branch_memberships";

drop trigger if exists "set_branch_memberships_updated_at" on "public"."branch_memberships";

drop trigger if exists "enforce_branch_product_override_tenant_match" on "public"."branch_product_overrides";

drop trigger if exists "set_branch_product_overrides_updated_at" on "public"."branch_product_overrides";

drop trigger if exists "set_branches_updated_at" on "public"."branches";

drop trigger if exists "set_business_signups_updated_at" on "public"."business_signups";

drop trigger if exists "set_categories_updated_at" on "public"."categories";

drop trigger if exists "set_customer_addresses_updated_at" on "public"."customer_addresses";

drop trigger if exists "set_customers_updated_at" on "public"."customers";

drop trigger if exists "set_modifier_groups_updated_at" on "public"."modifier_groups";

drop trigger if exists "set_order_items_updated_at" on "public"."order_items";

drop trigger if exists "enforce_order_tenant_integrity" on "public"."orders";

drop trigger if exists "set_orders_updated_at" on "public"."orders";

drop trigger if exists "set_payments_updated_at" on "public"."payments";

drop trigger if exists "set_platform_memberships_updated_at" on "public"."platform_memberships";

drop trigger if exists "set_product_images_updated_at" on "public"."product_images";

drop trigger if exists "enforce_product_modifier_group_tenant_match" on "public"."product_modifier_groups";

drop trigger if exists "enforce_product_category_tenant_match" on "public"."products";

drop trigger if exists "set_products_updated_at" on "public"."products";

drop trigger if exists "set_profiles_updated_at" on "public"."profiles";

drop trigger if exists "set_tenant_memberships_updated_at" on "public"."tenant_memberships";

drop trigger if exists "set_tenants_updated_at" on "public"."tenants";

drop policy "branch_memberships_insert" on "public"."branch_memberships";

drop policy "branch_memberships_select" on "public"."branch_memberships";

drop policy "branch_memberships_update" on "public"."branch_memberships";

drop policy "branch_product_overrides_manage" on "public"."branch_product_overrides";

drop policy "branch_product_overrides_select" on "public"."branch_product_overrides";

drop policy "branches_manage" on "public"."branches";

drop policy "branches_select" on "public"."branches";

drop policy "categories_manage" on "public"."categories";

drop policy "categories_select" on "public"."categories";

drop policy "customer_addresses_self_insert" on "public"."customer_addresses";

drop policy "customer_addresses_self_select" on "public"."customer_addresses";

drop policy "customer_addresses_self_update" on "public"."customer_addresses";

drop policy "customers_self_insert" on "public"."customers";

drop policy "customers_self_select" on "public"."customers";

drop policy "customers_self_update" on "public"."customers";

drop policy "modifier_groups_manage" on "public"."modifier_groups";

drop policy "modifier_groups_select" on "public"."modifier_groups";

drop policy "order_item_modifiers_manage" on "public"."order_item_modifiers";

drop policy "order_item_modifiers_select" on "public"."order_item_modifiers";

drop policy "order_items_manage" on "public"."order_items";

drop policy "order_items_select" on "public"."order_items";

drop policy "order_status_history_manage" on "public"."order_status_history";

drop policy "order_status_history_select" on "public"."order_status_history";

drop policy "orders_manage" on "public"."orders";

drop policy "orders_select" on "public"."orders";

drop policy "payments_manage" on "public"."payments";

drop policy "payments_select" on "public"."payments";

drop policy "platform_memberships_self_select" on "public"."platform_memberships";

drop policy "product_images_manage" on "public"."product_images";

drop policy "product_images_select" on "public"."product_images";

drop policy "product_modifier_groups_manage" on "public"."product_modifier_groups";

drop policy "product_modifier_groups_select" on "public"."product_modifier_groups";

drop policy "products_manage" on "public"."products";

drop policy "products_select" on "public"."products";

drop policy "tenant_memberships_insert" on "public"."tenant_memberships";

drop policy "tenant_memberships_select" on "public"."tenant_memberships";

drop policy "tenant_memberships_update" on "public"."tenant_memberships";

drop policy "tenants_select" on "public"."tenants";

alter table "public"."branch_memberships" drop constraint "branch_memberships_branch_id_fkey";

alter table "public"."branch_memberships" drop constraint "branch_memberships_tenant_membership_id_fkey";

alter table "public"."branch_product_overrides" drop constraint "branch_product_overrides_branch_id_fkey";

alter table "public"."branch_product_overrides" drop constraint "branch_product_overrides_product_id_fkey";

alter table "public"."branches" drop constraint "branches_tenant_id_fkey";

alter table "public"."business_signups" drop constraint "business_signups_provisioned_tenant_id_fkey";

alter table "public"."business_signups" drop constraint "business_signups_reviewed_by_profile_id_fkey";

alter table "public"."categories" drop constraint "categories_tenant_id_fkey";

alter table "public"."customer_addresses" drop constraint "customer_addresses_customer_id_fkey";

alter table "public"."customers" drop constraint "customers_profile_id_fkey";

alter table "public"."modifier_groups" drop constraint "modifier_groups_tenant_id_fkey";

alter table "public"."order_item_modifiers" drop constraint "order_item_modifiers_order_item_id_fkey";

alter table "public"."order_items" drop constraint "order_items_order_id_fkey";

alter table "public"."order_items" drop constraint "order_items_product_id_fkey";

alter table "public"."order_status_history" drop constraint "order_status_history_changed_by_profile_id_fkey";

alter table "public"."order_status_history" drop constraint "order_status_history_order_id_fkey";

alter table "public"."orders" drop constraint "orders_assigned_tenant_membership_id_fkey";

alter table "public"."orders" drop constraint "orders_branch_id_fkey";

alter table "public"."orders" drop constraint "orders_customer_id_fkey";

alter table "public"."orders" drop constraint "orders_tenant_id_fkey";

alter table "public"."payments" drop constraint "payments_order_id_fkey";

alter table "public"."platform_memberships" drop constraint "platform_memberships_profile_id_fkey";

alter table "public"."product_images" drop constraint "product_images_product_id_fkey";

alter table "public"."product_modifier_groups" drop constraint "product_modifier_groups_modifier_group_id_fkey";

alter table "public"."product_modifier_groups" drop constraint "product_modifier_groups_product_id_fkey";

alter table "public"."products" drop constraint "products_category_id_fkey";

alter table "public"."products" drop constraint "products_tenant_id_fkey";

alter table "public"."tenant_memberships" drop constraint "tenant_memberships_profile_id_fkey";

alter table "public"."tenant_memberships" drop constraint "tenant_memberships_tenant_id_fkey";

alter table "public"."tenants" drop constraint "tenants_onboarding_completed_by_profile_id_fkey";

alter table "public"."branch_memberships" add constraint "branch_memberships_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE not valid;

alter table "public"."branch_memberships" validate constraint "branch_memberships_branch_id_fkey";

alter table "public"."branch_memberships" add constraint "branch_memberships_tenant_membership_id_fkey" FOREIGN KEY (tenant_membership_id) REFERENCES public.tenant_memberships(id) ON DELETE CASCADE not valid;

alter table "public"."branch_memberships" validate constraint "branch_memberships_tenant_membership_id_fkey";

alter table "public"."branch_product_overrides" add constraint "branch_product_overrides_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE not valid;

alter table "public"."branch_product_overrides" validate constraint "branch_product_overrides_branch_id_fkey";

alter table "public"."branch_product_overrides" add constraint "branch_product_overrides_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."branch_product_overrides" validate constraint "branch_product_overrides_product_id_fkey";

alter table "public"."branches" add constraint "branches_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."branches" validate constraint "branches_tenant_id_fkey";

alter table "public"."business_signups" add constraint "business_signups_provisioned_tenant_id_fkey" FOREIGN KEY (provisioned_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."business_signups" validate constraint "business_signups_provisioned_tenant_id_fkey";

alter table "public"."business_signups" add constraint "business_signups_reviewed_by_profile_id_fkey" FOREIGN KEY (reviewed_by_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."business_signups" validate constraint "business_signups_reviewed_by_profile_id_fkey";

alter table "public"."categories" add constraint "categories_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_tenant_id_fkey";

alter table "public"."customer_addresses" add constraint "customer_addresses_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."customer_addresses" validate constraint "customer_addresses_customer_id_fkey";

alter table "public"."customers" add constraint "customers_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."customers" validate constraint "customers_profile_id_fkey";

alter table "public"."modifier_groups" add constraint "modifier_groups_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."modifier_groups" validate constraint "modifier_groups_tenant_id_fkey";

alter table "public"."order_item_modifiers" add constraint "order_item_modifiers_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE not valid;

alter table "public"."order_item_modifiers" validate constraint "order_item_modifiers_order_item_id_fkey";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."order_status_history" add constraint "order_status_history_changed_by_profile_id_fkey" FOREIGN KEY (changed_by_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."order_status_history" validate constraint "order_status_history_changed_by_profile_id_fkey";

alter table "public"."order_status_history" add constraint "order_status_history_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_status_history" validate constraint "order_status_history_order_id_fkey";

alter table "public"."orders" add constraint "orders_assigned_tenant_membership_id_fkey" FOREIGN KEY (assigned_tenant_membership_id) REFERENCES public.tenant_memberships(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_assigned_tenant_membership_id_fkey";

alter table "public"."orders" add constraint "orders_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT not valid;

alter table "public"."orders" validate constraint "orders_branch_id_fkey";

alter table "public"."orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_customer_id_fkey";

alter table "public"."orders" add constraint "orders_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_tenant_id_fkey";

alter table "public"."payments" add constraint "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_order_id_fkey";

alter table "public"."platform_memberships" add constraint "platform_memberships_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."platform_memberships" validate constraint "platform_memberships_profile_id_fkey";

alter table "public"."product_images" add constraint "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_images" validate constraint "product_images_product_id_fkey";

alter table "public"."product_modifier_groups" add constraint "product_modifier_groups_modifier_group_id_fkey" FOREIGN KEY (modifier_group_id) REFERENCES public.modifier_groups(id) ON DELETE CASCADE not valid;

alter table "public"."product_modifier_groups" validate constraint "product_modifier_groups_modifier_group_id_fkey";

alter table "public"."product_modifier_groups" add constraint "product_modifier_groups_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_modifier_groups" validate constraint "product_modifier_groups_product_id_fkey";

alter table "public"."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL not valid;

alter table "public"."products" validate constraint "products_category_id_fkey";

alter table "public"."products" add constraint "products_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."products" validate constraint "products_tenant_id_fkey";

alter table "public"."tenant_memberships" add constraint "tenant_memberships_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_memberships" validate constraint "tenant_memberships_profile_id_fkey";

alter table "public"."tenant_memberships" add constraint "tenant_memberships_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_memberships" validate constraint "tenant_memberships_tenant_id_fkey";

alter table "public"."tenants" add constraint "tenants_onboarding_completed_by_profile_id_fkey" FOREIGN KEY (onboarding_completed_by_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."tenants" validate constraint "tenants_onboarding_completed_by_profile_id_fkey";

grant delete on table "public"."branch_memberships" to "anon";

grant insert on table "public"."branch_memberships" to "anon";

grant select on table "public"."branch_memberships" to "anon";

grant update on table "public"."branch_memberships" to "anon";

grant delete on table "public"."branch_memberships" to "authenticated";

grant insert on table "public"."branch_memberships" to "authenticated";

grant select on table "public"."branch_memberships" to "authenticated";

grant update on table "public"."branch_memberships" to "authenticated";

grant delete on table "public"."branch_memberships" to "service_role";

grant insert on table "public"."branch_memberships" to "service_role";

grant select on table "public"."branch_memberships" to "service_role";

grant update on table "public"."branch_memberships" to "service_role";

grant delete on table "public"."branch_product_overrides" to "anon";

grant insert on table "public"."branch_product_overrides" to "anon";

grant select on table "public"."branch_product_overrides" to "anon";

grant update on table "public"."branch_product_overrides" to "anon";

grant delete on table "public"."branch_product_overrides" to "authenticated";

grant insert on table "public"."branch_product_overrides" to "authenticated";

grant select on table "public"."branch_product_overrides" to "authenticated";

grant update on table "public"."branch_product_overrides" to "authenticated";

grant delete on table "public"."branch_product_overrides" to "service_role";

grant insert on table "public"."branch_product_overrides" to "service_role";

grant select on table "public"."branch_product_overrides" to "service_role";

grant update on table "public"."branch_product_overrides" to "service_role";

grant delete on table "public"."branches" to "anon";

grant insert on table "public"."branches" to "anon";

grant select on table "public"."branches" to "anon";

grant update on table "public"."branches" to "anon";

grant delete on table "public"."branches" to "authenticated";

grant insert on table "public"."branches" to "authenticated";

grant select on table "public"."branches" to "authenticated";

grant update on table "public"."branches" to "authenticated";

grant delete on table "public"."branches" to "service_role";

grant insert on table "public"."branches" to "service_role";

grant select on table "public"."branches" to "service_role";

grant update on table "public"."branches" to "service_role";

grant delete on table "public"."business_signups" to "anon";

grant insert on table "public"."business_signups" to "anon";

grant select on table "public"."business_signups" to "anon";

grant update on table "public"."business_signups" to "anon";

grant delete on table "public"."business_signups" to "authenticated";

grant insert on table "public"."business_signups" to "authenticated";

grant select on table "public"."business_signups" to "authenticated";

grant update on table "public"."business_signups" to "authenticated";

grant delete on table "public"."business_signups" to "service_role";

grant insert on table "public"."business_signups" to "service_role";

grant select on table "public"."business_signups" to "service_role";

grant update on table "public"."business_signups" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."customer_addresses" to "anon";

grant insert on table "public"."customer_addresses" to "anon";

grant select on table "public"."customer_addresses" to "anon";

grant update on table "public"."customer_addresses" to "anon";

grant delete on table "public"."customer_addresses" to "authenticated";

grant insert on table "public"."customer_addresses" to "authenticated";

grant select on table "public"."customer_addresses" to "authenticated";

grant update on table "public"."customer_addresses" to "authenticated";

grant delete on table "public"."customer_addresses" to "service_role";

grant insert on table "public"."customer_addresses" to "service_role";

grant select on table "public"."customer_addresses" to "service_role";

grant update on table "public"."customer_addresses" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."modifier_groups" to "anon";

grant insert on table "public"."modifier_groups" to "anon";

grant select on table "public"."modifier_groups" to "anon";

grant update on table "public"."modifier_groups" to "anon";

grant delete on table "public"."modifier_groups" to "authenticated";

grant insert on table "public"."modifier_groups" to "authenticated";

grant select on table "public"."modifier_groups" to "authenticated";

grant update on table "public"."modifier_groups" to "authenticated";

grant delete on table "public"."modifier_groups" to "service_role";

grant insert on table "public"."modifier_groups" to "service_role";

grant select on table "public"."modifier_groups" to "service_role";

grant update on table "public"."modifier_groups" to "service_role";

grant delete on table "public"."order_item_modifiers" to "anon";

grant insert on table "public"."order_item_modifiers" to "anon";

grant select on table "public"."order_item_modifiers" to "anon";

grant update on table "public"."order_item_modifiers" to "anon";

grant delete on table "public"."order_item_modifiers" to "authenticated";

grant insert on table "public"."order_item_modifiers" to "authenticated";

grant select on table "public"."order_item_modifiers" to "authenticated";

grant update on table "public"."order_item_modifiers" to "authenticated";

grant delete on table "public"."order_item_modifiers" to "service_role";

grant insert on table "public"."order_item_modifiers" to "service_role";

grant select on table "public"."order_item_modifiers" to "service_role";

grant update on table "public"."order_item_modifiers" to "service_role";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."order_status_history" to "anon";

grant insert on table "public"."order_status_history" to "anon";

grant select on table "public"."order_status_history" to "anon";

grant update on table "public"."order_status_history" to "anon";

grant delete on table "public"."order_status_history" to "authenticated";

grant insert on table "public"."order_status_history" to "authenticated";

grant select on table "public"."order_status_history" to "authenticated";

grant update on table "public"."order_status_history" to "authenticated";

grant delete on table "public"."order_status_history" to "service_role";

grant insert on table "public"."order_status_history" to "service_role";

grant select on table "public"."order_status_history" to "service_role";

grant update on table "public"."order_status_history" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."platform_memberships" to "anon";

grant insert on table "public"."platform_memberships" to "anon";

grant select on table "public"."platform_memberships" to "anon";

grant update on table "public"."platform_memberships" to "anon";

grant delete on table "public"."platform_memberships" to "authenticated";

grant insert on table "public"."platform_memberships" to "authenticated";

grant select on table "public"."platform_memberships" to "authenticated";

grant update on table "public"."platform_memberships" to "authenticated";

grant delete on table "public"."platform_memberships" to "service_role";

grant insert on table "public"."platform_memberships" to "service_role";

grant select on table "public"."platform_memberships" to "service_role";

grant update on table "public"."platform_memberships" to "service_role";

grant delete on table "public"."product_images" to "anon";

grant insert on table "public"."product_images" to "anon";

grant select on table "public"."product_images" to "anon";

grant update on table "public"."product_images" to "anon";

grant delete on table "public"."product_images" to "authenticated";

grant insert on table "public"."product_images" to "authenticated";

grant select on table "public"."product_images" to "authenticated";

grant update on table "public"."product_images" to "authenticated";

grant delete on table "public"."product_images" to "service_role";

grant insert on table "public"."product_images" to "service_role";

grant select on table "public"."product_images" to "service_role";

grant update on table "public"."product_images" to "service_role";

grant delete on table "public"."product_modifier_groups" to "anon";

grant insert on table "public"."product_modifier_groups" to "anon";

grant select on table "public"."product_modifier_groups" to "anon";

grant update on table "public"."product_modifier_groups" to "anon";

grant delete on table "public"."product_modifier_groups" to "authenticated";

grant insert on table "public"."product_modifier_groups" to "authenticated";

grant select on table "public"."product_modifier_groups" to "authenticated";

grant update on table "public"."product_modifier_groups" to "authenticated";

grant delete on table "public"."product_modifier_groups" to "service_role";

grant insert on table "public"."product_modifier_groups" to "service_role";

grant select on table "public"."product_modifier_groups" to "service_role";

grant update on table "public"."product_modifier_groups" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."tenant_memberships" to "anon";

grant insert on table "public"."tenant_memberships" to "anon";

grant select on table "public"."tenant_memberships" to "anon";

grant update on table "public"."tenant_memberships" to "anon";

grant delete on table "public"."tenant_memberships" to "authenticated";

grant insert on table "public"."tenant_memberships" to "authenticated";

grant select on table "public"."tenant_memberships" to "authenticated";

grant update on table "public"."tenant_memberships" to "authenticated";

grant delete on table "public"."tenant_memberships" to "service_role";

grant insert on table "public"."tenant_memberships" to "service_role";

grant select on table "public"."tenant_memberships" to "service_role";

grant update on table "public"."tenant_memberships" to "service_role";

grant delete on table "public"."tenants" to "anon";

grant insert on table "public"."tenants" to "anon";

grant select on table "public"."tenants" to "anon";

grant update on table "public"."tenants" to "anon";

grant delete on table "public"."tenants" to "authenticated";

grant insert on table "public"."tenants" to "authenticated";

grant select on table "public"."tenants" to "authenticated";

grant update on table "public"."tenants" to "authenticated";

grant delete on table "public"."tenants" to "service_role";

grant insert on table "public"."tenants" to "service_role";

grant select on table "public"."tenants" to "service_role";

grant update on table "public"."tenants" to "service_role";


  create policy "branch_memberships_insert"
  on "public"."branch_memberships"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.branches b
  WHERE ((b.id = branch_memberships.branch_id) AND public.has_tenant_role(b.tenant_id, ARRAY['owner'::text, 'manager'::text])))));



  create policy "branch_memberships_select"
  on "public"."branch_memberships"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tenant_memberships tm
  WHERE ((tm.id = branch_memberships.tenant_membership_id) AND ((tm.profile_id = public.current_profile_id()) OR public.has_tenant_role(tm.tenant_id, ARRAY['owner'::text, 'manager'::text]))))));



  create policy "branch_memberships_update"
  on "public"."branch_memberships"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.branches b
  WHERE ((b.id = branch_memberships.branch_id) AND public.has_tenant_role(b.tenant_id, ARRAY['owner'::text, 'manager'::text])))))
with check ((EXISTS ( SELECT 1
   FROM public.branches b
  WHERE ((b.id = branch_memberships.branch_id) AND public.has_tenant_role(b.tenant_id, ARRAY['owner'::text, 'manager'::text])))));



  create policy "branch_product_overrides_manage"
  on "public"."branch_product_overrides"
  as permissive
  for all
  to authenticated
using (public.has_branch_access(branch_id))
with check (public.has_branch_access(branch_id));



  create policy "branch_product_overrides_select"
  on "public"."branch_product_overrides"
  as permissive
  for select
  to authenticated
using (public.has_branch_access(branch_id));



  create policy "branches_manage"
  on "public"."branches"
  as permissive
  for all
  to authenticated
using (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]))
with check (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]));



  create policy "branches_select"
  on "public"."branches"
  as permissive
  for select
  to authenticated
using (public.has_tenant_access(tenant_id));



  create policy "categories_manage"
  on "public"."categories"
  as permissive
  for all
  to authenticated
using (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]))
with check (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]));



  create policy "categories_select"
  on "public"."categories"
  as permissive
  for select
  to authenticated
using (public.has_tenant_access(tenant_id));



  create policy "customer_addresses_self_insert"
  on "public"."customer_addresses"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.profile_id = public.current_profile_id())))));



  create policy "customer_addresses_self_select"
  on "public"."customer_addresses"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.profile_id = public.current_profile_id())))));



  create policy "customer_addresses_self_update"
  on "public"."customer_addresses"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.profile_id = public.current_profile_id())))))
with check ((EXISTS ( SELECT 1
   FROM public.customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.profile_id = public.current_profile_id())))));



  create policy "customers_self_insert"
  on "public"."customers"
  as permissive
  for insert
  to authenticated
with check (((profile_id IS NOT NULL) AND (profile_id = public.current_profile_id())));



  create policy "customers_self_select"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using (((profile_id IS NOT NULL) AND (profile_id = public.current_profile_id())));



  create policy "customers_self_update"
  on "public"."customers"
  as permissive
  for update
  to authenticated
using (((profile_id IS NOT NULL) AND (profile_id = public.current_profile_id())))
with check (((profile_id IS NOT NULL) AND (profile_id = public.current_profile_id())));



  create policy "modifier_groups_manage"
  on "public"."modifier_groups"
  as permissive
  for all
  to authenticated
using (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]))
with check (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]));



  create policy "modifier_groups_select"
  on "public"."modifier_groups"
  as permissive
  for select
  to authenticated
using (public.has_tenant_access(tenant_id));



  create policy "order_item_modifiers_manage"
  on "public"."order_item_modifiers"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_modifiers.order_item_id) AND public.has_branch_access(o.branch_id)))))
with check ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_modifiers.order_item_id) AND public.has_branch_access(o.branch_id)))));



  create policy "order_item_modifiers_select"
  on "public"."order_item_modifiers"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_modifiers.order_item_id) AND (public.has_branch_access(o.branch_id) OR ((o.customer_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.customers c
          WHERE ((c.id = o.customer_id) AND (c.profile_id = public.current_profile_id()))))))))));



  create policy "order_items_manage"
  on "public"."order_items"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND public.has_branch_access(o.branch_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND public.has_branch_access(o.branch_id)))));



  create policy "order_items_select"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (public.has_branch_access(o.branch_id) OR ((o.customer_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.customers c
          WHERE ((c.id = o.customer_id) AND (c.profile_id = public.current_profile_id()))))))))));



  create policy "order_status_history_manage"
  on "public"."order_status_history"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_status_history.order_id) AND public.has_branch_access(o.branch_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_status_history.order_id) AND public.has_branch_access(o.branch_id)))));



  create policy "order_status_history_select"
  on "public"."order_status_history"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_status_history.order_id) AND (public.has_branch_access(o.branch_id) OR ((o.customer_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.customers c
          WHERE ((c.id = o.customer_id) AND (c.profile_id = public.current_profile_id()))))))))));



  create policy "orders_manage"
  on "public"."orders"
  as permissive
  for all
  to authenticated
using (public.has_branch_access(branch_id))
with check (public.has_branch_access(branch_id));



  create policy "orders_select"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using ((public.has_branch_access(branch_id) OR ((customer_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.customers c
  WHERE ((c.id = orders.customer_id) AND (c.profile_id = public.current_profile_id())))))));



  create policy "payments_manage"
  on "public"."payments"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND public.has_branch_access(o.branch_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND public.has_branch_access(o.branch_id)))));



  create policy "payments_select"
  on "public"."payments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (public.has_branch_access(o.branch_id) OR ((o.customer_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.customers c
          WHERE ((c.id = o.customer_id) AND (c.profile_id = public.current_profile_id()))))))))));



  create policy "platform_memberships_self_select"
  on "public"."platform_memberships"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = platform_memberships.profile_id) AND (p.auth_user_id = auth.uid())))));



  create policy "product_images_manage"
  on "public"."product_images"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.has_tenant_role(p.tenant_id, ARRAY['owner'::text, 'manager'::text])))))
with check ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.has_tenant_role(p.tenant_id, ARRAY['owner'::text, 'manager'::text])))));



  create policy "product_images_select"
  on "public"."product_images"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.has_tenant_access(p.tenant_id)))));



  create policy "product_modifier_groups_manage"
  on "public"."product_modifier_groups"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_modifier_groups.product_id) AND public.has_tenant_role(p.tenant_id, ARRAY['owner'::text, 'manager'::text])))))
with check ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_modifier_groups.product_id) AND public.has_tenant_role(p.tenant_id, ARRAY['owner'::text, 'manager'::text])))));



  create policy "product_modifier_groups_select"
  on "public"."product_modifier_groups"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_modifier_groups.product_id) AND public.has_tenant_access(p.tenant_id)))));



  create policy "products_manage"
  on "public"."products"
  as permissive
  for all
  to authenticated
using (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]))
with check (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]));



  create policy "products_select"
  on "public"."products"
  as permissive
  for select
  to authenticated
using (public.has_tenant_access(tenant_id));



  create policy "tenant_memberships_insert"
  on "public"."tenant_memberships"
  as permissive
  for insert
  to authenticated
with check (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]));



  create policy "tenant_memberships_select"
  on "public"."tenant_memberships"
  as permissive
  for select
  to authenticated
using (((profile_id = public.current_profile_id()) OR public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text])));



  create policy "tenant_memberships_update"
  on "public"."tenant_memberships"
  as permissive
  for update
  to authenticated
using (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]))
with check (public.has_tenant_role(tenant_id, ARRAY['owner'::text, 'manager'::text]));



  create policy "tenants_select"
  on "public"."tenants"
  as permissive
  for select
  to authenticated
using (public.has_tenant_access(id));


CREATE TRIGGER enforce_branch_membership_tenant_match BEFORE INSERT OR UPDATE ON public.branch_memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_branch_membership_tenant_match();

CREATE TRIGGER set_branch_memberships_updated_at BEFORE UPDATE ON public.branch_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enforce_branch_product_override_tenant_match BEFORE INSERT OR UPDATE ON public.branch_product_overrides FOR EACH ROW EXECUTE FUNCTION public.enforce_branch_product_override_tenant_match();

CREATE TRIGGER set_branch_product_overrides_updated_at BEFORE UPDATE ON public.branch_product_overrides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_business_signups_updated_at BEFORE UPDATE ON public.business_signups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_modifier_groups_updated_at BEFORE UPDATE ON public.modifier_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enforce_order_tenant_integrity BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_order_tenant_integrity();

CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_platform_memberships_updated_at BEFORE UPDATE ON public.platform_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enforce_product_modifier_group_tenant_match BEFORE INSERT OR UPDATE ON public.product_modifier_groups FOR EACH ROW EXECUTE FUNCTION public.enforce_product_modifier_group_tenant_match();

CREATE TRIGGER enforce_product_category_tenant_match BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_product_category_tenant_match();

CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_tenant_memberships_updated_at BEFORE UPDATE ON public.tenant_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


