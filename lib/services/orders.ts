import type { SupabaseClient } from "@supabase/supabase-js"

import type { AdminOrderDetail, AdminOrderSummary, CreateOrderInput, CreateOrderResult, CustomerOrderDetail, CustomerOrderSummary, KitchenOrderSummary, ManualPaymentMethod, OrderStatus, PaymentStatus, TenantManualPaymentSettings } from "@/lib/domain/order"

type TenantRow = { id: string }
type BranchRow = { id: string; name: string }
type ProductRow = {
  id: string
  name: string
  base_price: number
  category_id: string | null
  status: "active" | "draft"
}

type ProductVariantRow = {
  id: string
  product_id: string
  name: string
  base_price: number
  is_active: boolean
}
type BranchProductOverrideRow = {
  product_id: string
  availability_status: "available" | "paused" | "out_of_stock"
  price_override: number | null
}

type BranchProductVariantOverrideRow = {
  product_variant_id: string
  availability_status: "available" | "paused" | "out_of_stock"
  price_override: number | null
}
type CategoryRow = {
  id: string
  name: string
}
type AtomicOrderInsertRow = {
  order_id: string
  order_number: number
}

type CustomerOrderRow = {
  id: string
  order_number: number
  status: string
  fulfillment_type: "pickup" | "delivery"
  total_amount: number
  placed_at: string
}

type AdminOrderRow = {
  id: string
  order_number: number
  customer_name: string
  status: string
  payment_status: PaymentStatus
  payments: {
    payment_method: ManualPaymentMethod | null
    receipt_image_path: string | null
  }[] | null
  channel: string
  total_amount: number
  placed_at: string
  branches: {
    name: string
  } | null
}

type KitchenOrderRow = {
  id: string
  order_number: number
  customer_name: string
  status: OrderStatus
  branch_id: string
  assigned_tenant_membership_id: string | null
  channel: string
  fulfillment_type: "pickup" | "delivery"
  total_amount: number
  placed_at: string
  notes: string | null
  branches: {
    name: string
  } | null
}

type KitchenOrderRowWithoutAssignment = {
  id: string
  order_number: number
  customer_name: string
  status: OrderStatus
  branch_id: string
  channel: string
  fulfillment_type: "pickup" | "delivery"
  total_amount: number
  placed_at: string
  notes: string | null
  branches: {
    name: string
  } | null
}

type AssignedMembershipRow = {
  id: string
  profiles: {
    full_name: string | null
  } | null
}

type KitchenOrderItemRow = {
  id: string
  order_id: string
  product_name_snapshot: string
  variant_name_snapshot: string | null
  quantity: number
  prep_status: "pending" | "ready"
}

type OrderItemCountRow = {
  order_id: string
  quantity: number
}

type CustomerOrderDetailRow = {
  id: string
  order_number: number
  status: string
  payment_status: PaymentStatus
  fulfillment_type: "pickup" | "delivery"
  total_amount: number
  subtotal_amount: number
  placed_at: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  notes: string | null
}

type CustomerOrderDetailItemRow = {
  id: string
  order_id: string
  product_name_snapshot: string
  variant_name_snapshot: string | null
  category_name_snapshot: string | null
  quantity: number
  unit_price_snapshot: number
  line_total: number
}

type PaymentReceiptRow = {
  payment_method: ManualPaymentMethod | null
  receipt_image_path: string | null
}

type TenantManualPaymentSettingsRow = {
  mobile_payment_instructions: string | null
  bank_transfer_instructions: string | null
}

function formatOrderItemProductName(productName: string, variantName?: string | null) {
  return variantName ? `${productName} · ${variantName}` : productName
}

export async function getTenantManualPaymentSettingsBySlug(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<TenantManualPaymentSettings | null> {
  const tenantResult = await supabase
    .from("tenants")
    .select("mobile_payment_instructions, bank_transfer_instructions")
    .eq("slug", tenantSlug)
    .limit(1)
    .maybeSingle<TenantManualPaymentSettingsRow>()

  if (tenantResult.error || !tenantResult.data) {
    return null
  }

  return {
    mobilePaymentInstructions: tenantResult.data.mobile_payment_instructions,
    bankTransferInstructions: tenantResult.data.bank_transfer_instructions,
  }
}

export async function attachManualPaymentReceipt(
  supabase: SupabaseClient,
  orderId: string,
  input: {
    readonly paymentMethod: ManualPaymentMethod
    readonly receiptImagePath: string
  }
): Promise<{ ok: boolean; error?: string }> {
  const updateResult = await supabase
    .from("payments")
    .update({
      provider: "manual",
      payment_method: input.paymentMethod,
      receipt_image_path: input.receiptImagePath,
      receipt_submitted_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}

export async function createStorefrontOrder(supabase: SupabaseClient, input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.items.length) {
    return { ok: false, error: "La bolsa está vacía." }
  }

  if (!input.customer.fullName.trim() || !input.customer.phone.trim()) {
    return { ok: false, error: "Completa nombre y teléfono para continuar." }
  }

  const tenantResult = await supabase.from("tenants").select("id").eq("slug", input.tenantSlug).limit(1).maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    return { ok: false, error: "No encontramos la marca asociada al pedido." }
  }

  const branchResult = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantResult.data.id)
    .eq("id", input.branchId)
    .eq("is_active", true)
    .maybeSingle<BranchRow>()

  if (branchResult.error || !branchResult.data) {
    return { ok: false, error: "No encontramos la sucursal activa seleccionada para este pedido." }
  }

  if (input.items.some((item) => item.tenantSlug !== input.tenantSlug || item.branchId !== input.branchId)) {
    return { ok: false, error: "La bolsa no coincide con la sucursal activa del checkout." }
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))]
  const variantIds = [...new Set(input.items.map((item) => item.productVariantId).filter((value): value is string => Boolean(value)))]
  const productsResult = await supabase
    .from("products")
    .select("id, name, base_price, category_id, status")
    .eq("tenant_id", tenantResult.data.id)
    .in("id", productIds)
    .returns<ProductRow[]>()

  if (productsResult.error) {
    return { ok: false, error: productsResult.error.message }
  }

  const products = productsResult.data ?? []

  if (products.length !== productIds.length) {
    return { ok: false, error: "Uno o más productos ya no están disponibles." }
  }

  if (products.some((product) => product.status !== "active")) {
    return { ok: false, error: "Uno o más productos ya no están disponibles para comprar." }
  }

  const categoryIds = products.map((product) => product.category_id).filter((value): value is string => Boolean(value))
  const [productVariantsResult, categoriesResult, branchOverridesResult, branchVariantOverridesResult] = await Promise.all([
    variantIds.length
      ? supabase.from("product_variants").select("id, product_id, name, base_price, is_active").in("id", variantIds).returns<ProductVariantRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: ProductVariantRow[]; error: null }),
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds).returns<CategoryRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: CategoryRow[]; error: null }),
    productIds.length
      ? supabase
          .from("branch_product_overrides")
          .select("product_id, availability_status, price_override")
          .eq("branch_id", input.branchId)
          .in("product_id", productIds)
          .returns<BranchProductOverrideRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: BranchProductOverrideRow[]; error: null }),
    variantIds.length
      ? supabase
          .from("branch_product_variant_overrides")
          .select("product_variant_id, availability_status, price_override")
          .eq("branch_id", input.branchId)
          .in("product_variant_id", variantIds)
          .returns<BranchProductVariantOverrideRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: BranchProductVariantOverrideRow[]; error: null }),
  ])

  if (productVariantsResult.error || categoriesResult.error || branchOverridesResult.error || branchVariantOverridesResult.error) {
    return { ok: false, error: productVariantsResult.error?.message ?? categoriesResult.error?.message ?? branchOverridesResult.error?.message ?? branchVariantOverridesResult.error?.message ?? "No pudimos validar la sucursal activa." }
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const productVariantMap = new Map((productVariantsResult.data ?? []).map((variant) => [variant.id, variant]))
  const categoryMap = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))
  const branchOverrideMap = new Map((branchOverridesResult.data ?? []).map((override) => [override.product_id, override]))
  const branchVariantOverrideMap = new Map((branchVariantOverridesResult.data ?? []).map((override) => [override.product_variant_id, override]))

  if (variantIds.length !== productVariantMap.size) {
    return { ok: false, error: "Una o más variantes ya no están disponibles." }
  }

  if (
    input.items.some((item) => {
      if (item.productVariantId) {
        const variant = productVariantMap.get(item.productVariantId)
        const branchVariantOverride = branchVariantOverrideMap.get(item.productVariantId)

        return !variant || variant.product_id !== item.productId || !variant.is_active || (branchVariantOverride ? branchVariantOverride.availability_status !== "available" : false)
      }

      const branchOverride = branchOverrideMap.get(item.productId)
      return branchOverride ? branchOverride.availability_status !== "available" : false
    })
  ) {
    return { ok: false, error: "Uno o más productos ya no están disponibles en esta sucursal." }
  }

  const orderItemsPayload = input.items.map((item) => {
    const product = productMap.get(item.productId)
    const productVariant = item.productVariantId ? productVariantMap.get(item.productVariantId) : null

    if (!product) {
      throw new Error(`Product ${item.productId} not found during checkout.`)
    }

    const unitPrice = Number(
      productVariant
        ? branchVariantOverrideMap.get(productVariant.id)?.price_override ?? productVariant.base_price
        : branchOverrideMap.get(product.id)?.price_override ?? product.base_price
    )

    return {
      product_id: product.id,
      product_variant_id: productVariant?.id ?? null,
      product_name_snapshot: product.name,
      variant_name_snapshot: productVariant?.name ?? null,
      category_name_snapshot: product.category_id ? categoryMap.get(product.category_id) ?? item.category : item.category,
      unit_price_snapshot: unitPrice,
      quantity: item.quantity,
      line_total: Number((unitPrice * item.quantity).toFixed(2)),
      modifiers: item.modifierSelections.map((selection) => ({
        modifier_group_name_snapshot: selection.modifierGroupName,
        modifier_option_name_snapshot: selection.modifierOptionName,
        price_snapshot: selection.priceDelta,
      })),
      notes: null,
    }
  })

  const subtotal = orderItemsPayload.reduce((total, item) => total + item.line_total, 0)

  const orderResult = await supabase
    .rpc("create_storefront_order_atomic", {
      p_tenant_id: tenantResult.data.id,
      p_branch_id: input.branchId,
      p_customer_id: input.customerId ?? null,
      p_fulfillment_type: input.fulfillmentType,
      p_customer_name: input.customer.fullName.trim(),
      p_customer_phone: input.customer.phone.trim(),
      p_customer_email: input.customer.email.trim() || null,
      p_customer_notes: input.customer.notes?.trim() || null,
      p_subtotal: subtotal,
      p_items: orderItemsPayload,
    })
    .single<AtomicOrderInsertRow>()

  if (orderResult.error || !orderResult.data) {
    return { ok: false, error: orderResult.error?.message ?? "No pudimos crear la orden." }
  }

  return {
    ok: true,
    orderId: orderResult.data.order_id,
    orderNumber: orderResult.data.order_number,
  }
}

export async function getCustomerOrders(supabase: SupabaseClient, tenantSlug: string, customerId: string): Promise<readonly CustomerOrderSummary[]> {
  const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    return []
  }

  const ordersResult = await supabase
    .from("orders")
    .select("id, order_number, status, fulfillment_type, total_amount, placed_at")
    .eq("tenant_id", tenantResult.data.id)
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false })
    .returns<CustomerOrderRow[]>()

  if (ordersResult.error) {
    return []
  }

  const orders = ordersResult.data ?? []
  const orderIds = orders.map((order) => order.id)

  const orderItemsResult = orderIds.length
    ? await supabase.from("order_items").select("order_id, quantity").in("order_id", orderIds).returns<OrderItemCountRow[]>()
    : { data: [], error: null }

  if (orderItemsResult.error) {
    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      fulfillmentType: order.fulfillment_type,
      totalAmount: Number(order.total_amount),
      placedAt: order.placed_at,
      itemCount: 0,
    }))
  }

  const itemCountMap = (orderItemsResult.data ?? []).reduce<Map<string, number>>((map, item) => {
    map.set(item.order_id, (map.get(item.order_id) ?? 0) + item.quantity)
    return map
  }, new Map())

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    fulfillmentType: order.fulfillment_type,
    totalAmount: Number(order.total_amount),
    placedAt: order.placed_at,
    itemCount: itemCountMap.get(order.id) ?? 0,
  }))
}

type KitchenDiagnosticOrderRow = {
  id: string
  status: OrderStatus
  branch_id: string
  branches: {
    name: string
  } | null
}

type AdminOrderDetailRow = {
  id: string
  order_number: number
  status: string
  payment_status: PaymentStatus
  channel: string
  fulfillment_type: "pickup" | "delivery"
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  subtotal_amount: number
  total_amount: number
  placed_at: string
  notes: string | null
  branches: {
    name: string
  } | null
  payments: {
    payment_method: ManualPaymentMethod | null
    receipt_image_path: string | null
  }[] | null
}

type AdminOrderDetailItemRow = {
  id: string
  order_id: string
  product_name_snapshot: string
  variant_name_snapshot: string | null
  category_name_snapshot: string | null
  quantity: number
  unit_price_snapshot: number
  line_total: number
  notes: string | null
}

export async function getAdminOrders(supabase: SupabaseClient, tenantId: string): Promise<readonly AdminOrderSummary[]> {
  const ordersResult = await supabase
    .from("orders")
    .select("id, order_number, customer_name, status, payment_status, channel, total_amount, placed_at, branches(name), payments(payment_method, receipt_image_path)")
    .eq("tenant_id", tenantId)
    .order("placed_at", { ascending: false })
    .returns<AdminOrderRow[]>()

  if (ordersResult.error) {
    return []
  }

  return (ordersResult.data ?? []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
      customerName: order.customer_name,
      branchName: order.branches?.name ?? "Sucursal",
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payments?.[0]?.payment_method ?? null,
      hasPaymentReceipt: Boolean(order.payments?.[0]?.receipt_image_path),
      paymentReceiptImagePath: order.payments?.[0]?.receipt_image_path ?? null,
      channel: order.channel,
      placedAt: order.placed_at,
      totalAmount: Number(order.total_amount),
  }))
}

export async function getKitchenOrders(
  supabase: SupabaseClient,
  tenantId: string,
  branchIds: readonly string[],
  statuses: readonly OrderStatus[] = ["confirmed", "in_preparation", "ready", "completed"]
): Promise<readonly KitchenOrderSummary[]> {
  if (!branchIds.length) {
    return []
  }

  const ordersWithAssignmentResult = await supabase
    .from("orders")
    .select("id, order_number, customer_name, status, branch_id, assigned_tenant_membership_id, channel, fulfillment_type, total_amount, placed_at, notes, branches(name)")
    .eq("tenant_id", tenantId)
    .in("branch_id", [...branchIds])
    .in("status", [...statuses])
    .order("placed_at", { ascending: true })
    .returns<KitchenOrderRow[]>()

  const ordersResult = ordersWithAssignmentResult.error
    ? await supabase
        .from("orders")
        .select("id, order_number, customer_name, status, branch_id, channel, fulfillment_type, total_amount, placed_at, notes, branches(name)")
        .eq("tenant_id", tenantId)
        .in("branch_id", [...branchIds])
        .in("status", [...statuses])
        .order("placed_at", { ascending: true })
        .returns<KitchenOrderRowWithoutAssignment[]>()
    : ordersWithAssignmentResult

  if (ordersResult.error) {
    return []
  }

  const orders = (ordersResult.data ?? []).map((order) => {
    const assignedMembershipId =
      "assigned_tenant_membership_id" in order && typeof order.assigned_tenant_membership_id === "string"
        ? order.assigned_tenant_membership_id
        : null

    return {
      ...order,
      assigned_tenant_membership_id: assignedMembershipId,
    }
  })
  const orderIds = orders.map((order) => order.id)
  const assignedMembershipIds = [...new Set(orders.map((order) => order.assigned_tenant_membership_id).filter((value): value is string => Boolean(value)))]

  const assignedMembershipsResult = assignedMembershipIds.length
    ? await supabase
        .from("tenant_memberships")
        .select("id, profiles(full_name)")
        .in("id", assignedMembershipIds)
        .returns<AssignedMembershipRow[]>()
    : { data: [], error: null }

  const assignedMembershipNameMap = new Map(
    (assignedMembershipsResult.data ?? []).map((membership) => [membership.id, membership.profiles?.full_name?.trim() || "Staff"])
  )

  const orderItemsResult = orderIds.length
      ? await supabase
          .from("order_items")
          .select("id, order_id, quantity, product_name_snapshot, variant_name_snapshot, prep_status")
          .in("order_id", orderIds)
          .returns<KitchenOrderItemRow[]>()
    : { data: [], error: null }

  const orderItems = orderItemsResult.data ?? []

  const itemCountMap = orderItems.reduce<Map<string, number>>((map, item) => {
    map.set(item.order_id, (map.get(item.order_id) ?? 0) + item.quantity)
    return map
  }, new Map())

  const itemPreviewMap = orderItems.reduce<Map<string, { id: string; productName: string; quantity: number; prepStatus: "pending" | "ready" }[]>>((map, item) => {
    const currentItems = map.get(item.order_id) ?? []
    map.set(item.order_id, [...currentItems, { id: item.id, productName: formatOrderItemProductName(item.product_name_snapshot, item.variant_name_snapshot), quantity: item.quantity, prepStatus: item.prep_status }])
    return map
  }, new Map())

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    branchName: order.branches?.name ?? "Sucursal",
    status: order.status,
    assignedMembershipId: order.assigned_tenant_membership_id,
    assignedStaffName: order.assigned_tenant_membership_id ? assignedMembershipNameMap.get(order.assigned_tenant_membership_id) ?? "Staff" : null,
    channel: order.channel,
    fulfillmentType: order.fulfillment_type,
    placedAt: order.placed_at,
    totalAmount: Number(order.total_amount),
    itemCount: itemCountMap.get(order.id) ?? 0,
    notes: order.notes,
    items: itemPreviewMap.get(order.id) ?? [],
  }))
}

export async function getKitchenDiagnostics(
  supabase: SupabaseClient,
  tenantId: string,
  branchIds: readonly string[]
): Promise<{
  readonly confirmedOrdersInBranches: number
  readonly activeOrdersInBranches: number
  readonly ordersByBranch: readonly { branchId: string; branchName: string; status: OrderStatus }[]
}> {
  if (!branchIds.length) {
    return {
      confirmedOrdersInBranches: 0,
      activeOrdersInBranches: 0,
      ordersByBranch: [],
    }
  }

  const ordersResult = await supabase
    .from("orders")
    .select("id, status, branch_id, branches(name)")
    .eq("tenant_id", tenantId)
    .in("branch_id", [...branchIds])
    .in("status", ["confirmed", "in_preparation", "ready", "completed"])
    .order("placed_at", { ascending: false })
    .returns<KitchenDiagnosticOrderRow[]>()

  const orders = ordersResult.data ?? []

  return {
    confirmedOrdersInBranches: orders.filter((order) => order.status === "confirmed").length,
    activeOrdersInBranches: orders.length,
    ordersByBranch: orders.map((order) => ({
      branchId: order.branch_id,
      branchName: order.branches?.name ?? "Sucursal",
      status: order.status,
    })),
  }
}

async function getKitchenOrderAssignment(
  supabase: SupabaseClient,
  tenantId: string,
  orderId: string
): Promise<{ assignedMembershipId: string | null; status: OrderStatus; branchId: string } | null> {
  const orderResult = await supabase
    .from("orders")
    .select("assigned_tenant_membership_id, status, branch_id")
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .limit(1)
    .maybeSingle<{ assigned_tenant_membership_id: string | null; status: OrderStatus; branch_id: string }>()

  if (orderResult.error || !orderResult.data) {
    return null
  }

  return {
    assignedMembershipId: orderResult.data.assigned_tenant_membership_id,
    status: orderResult.data.status,
    branchId: orderResult.data.branch_id,
  }
}

export async function assignKitchenOrder(
  supabase: SupabaseClient,
  tenantId: string,
  orderId: string,
  membershipId: string,
  branchIds: readonly string[]
): Promise<{ ok: boolean; error?: string }> {
  const currentAssignment = await getKitchenOrderAssignment(supabase, tenantId, orderId)

  if (!currentAssignment) {
    return { ok: false, error: "No encontramos la orden." }
  }

  if (!branchIds.includes(currentAssignment.branchId)) {
    return { ok: false, error: "No tienes acceso a la sucursal de esta orden." }
  }

  if (currentAssignment.assignedMembershipId === membershipId) {
    return { ok: true }
  }

  if (currentAssignment.assignedMembershipId) {
    return { ok: false, error: "Esta orden ya fue tomada por otro miembro del staff." }
  }

  const updateResult = await supabase
    .from("orders")
    .update({
      assigned_tenant_membership_id: membershipId,
      assigned_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .is("assigned_tenant_membership_id", null)
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  if (!updateResult.data) {
    return { ok: false, error: "Esta orden ya fue tomada por otro miembro del staff." }
  }

  return { ok: true }
}

export async function ensureKitchenAssignmentAccess(
  supabase: SupabaseClient,
  tenantId: string,
  orderId: string,
  membershipId: string,
  role: string,
  branchIds: readonly string[]
): Promise<{ ok: boolean; error?: string }> {
  if (role !== "preparer") {
    return { ok: false, error: "Solo los preparadores pueden operar ordenes desde kitchen." }
  }

  const currentAssignment = await getKitchenOrderAssignment(supabase, tenantId, orderId)

  if (!currentAssignment) {
    return { ok: false, error: "No encontramos la orden." }
  }

  if (!branchIds.includes(currentAssignment.branchId)) {
    return { ok: false, error: "No tienes acceso a la sucursal de esta orden." }
  }

  if (!currentAssignment.assignedMembershipId) {
    return { ok: false, error: "Debes tomar la orden antes de trabajarla en kitchen." }
  }

  if (currentAssignment.assignedMembershipId !== membershipId) {
    return { ok: false, error: "Esta orden ya esta asignada a otro preparador." }
  }

  return { ok: true }
}

export async function updateAdminOrderStatus(
  supabase: SupabaseClient,
  tenantId: string,
  orderId: string,
  nextStatus: OrderStatus,
  changedByProfileId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const orderResult = await supabase
    .from("orders")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .limit(1)
    .maybeSingle<{ status: OrderStatus }>()

  if (orderResult.error || !orderResult.data) {
    return { ok: false, error: "No encontramos la orden." }
  }

  const currentStatus = orderResult.data.status

  if (currentStatus === nextStatus) {
    return { ok: true }
  }

  const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
    pending_payment: ["confirmed", "cancelled"],
    confirmed: ["in_preparation", "cancelled"],
    in_preparation: ["ready", "cancelled"],
    ready: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  }

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    return { ok: false, error: `No se puede cambiar de ${currentStatus} a ${nextStatus}.` }
  }

  if (currentStatus === "pending_payment" && nextStatus === "confirmed") {
    const paymentResult = await supabase
      .from("payments")
      .select("payment_method, receipt_image_path")
      .eq("order_id", orderId)
      .limit(1)
      .maybeSingle<PaymentReceiptRow>()

    if (paymentResult.error || !paymentResult.data) {
      return { ok: false, error: "La orden no tiene un registro de pago válido para ser confirmada." }
    }

    if (!paymentResult.data.payment_method || !paymentResult.data.receipt_image_path) {
      return { ok: false, error: "Adjunta y valida el comprobante de pago antes de confirmar esta orden." }
    }
  }

  const updateResult = await supabase.rpc("update_order_status_atomic", {
    p_tenant_id: tenantId,
    p_order_id: orderId,
    p_from_status: currentStatus,
    p_to_status: nextStatus,
    p_changed_by_profile_id: changedByProfileId ?? null,
  })

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  if (!updateResult.data) {
    return { ok: false, error: "La orden cambió mientras intentábamos actualizarla. Vuelve a intentarlo." }
  }

  return { ok: true }
}

export async function updateAdminOrderPaymentStatus(
  supabase: SupabaseClient,
  tenantId: string,
  orderId: string,
  nextPaymentStatus: PaymentStatus
): Promise<{ ok: boolean; error?: string }> {
  const orderResult = await supabase
    .from("orders")
    .select("payment_status")
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .limit(1)
    .maybeSingle<{ payment_status: PaymentStatus }>()

  if (orderResult.error || !orderResult.data) {
    return { ok: false, error: "No encontramos la orden." }
  }

  const currentPaymentStatus = orderResult.data.payment_status

  if (currentPaymentStatus === nextPaymentStatus) {
    return { ok: true }
  }

  const allowedTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
    pending: ["paid", "failed"],
    paid: ["refunded"],
    failed: ["pending", "paid"],
    refunded: [],
  }

  if (!allowedTransitions[currentPaymentStatus].includes(nextPaymentStatus)) {
    return { ok: false, error: `No se puede cambiar el pago de ${currentPaymentStatus} a ${nextPaymentStatus}.` }
  }

  const updateResult = await supabase
    .from("orders")
    .update({ payment_status: nextPaymentStatus })
    .eq("tenant_id", tenantId)
    .eq("id", orderId)

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}

export async function updateKitchenOrderItemPrepStatus(
  supabase: SupabaseClient,
  tenantId: string,
  orderItemId: string,
  nextPrepStatus: "pending" | "ready"
): Promise<{ ok: boolean; error?: string }> {
  const orderItemResult = await supabase
    .from("order_items")
    .select("id, order_id")
    .eq("id", orderItemId)
    .limit(1)
    .maybeSingle<{ id: string; order_id: string }>()

  if (orderItemResult.error || !orderItemResult.data) {
    return { ok: false, error: "No encontramos el item de la orden." }
  }

  const belongsToTenant = await supabase
    .from("orders")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", orderItemResult.data.order_id)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (belongsToTenant.error || !belongsToTenant.data) {
    return { ok: false, error: "El item no pertenece a una orden de este tenant." }
  }

  const updateResult = await supabase
    .from("order_items")
    .update({ prep_status: nextPrepStatus })
    .eq("id", orderItemId)
    .eq("order_id", orderItemResult.data.order_id)

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}

export async function canKitchenMarkOrderReady(supabase: SupabaseClient, tenantId: string, orderId: string) {
  const itemsResult = await supabase
    .from("order_items")
    .select("prep_status, order_id, orders!inner(id)")
    .eq("order_id", orderId)
    .eq("orders.tenant_id", tenantId)
    .returns<{ prep_status: "pending" | "ready"; order_id: string; orders: { id: string } | null }[]>()

  if (itemsResult.error) {
    return { ok: false, error: itemsResult.error.message }
  }

  const items = itemsResult.data ?? []

  if (!items.length) {
    return { ok: false, error: "La orden no pertenece a este tenant o no tiene items para preparar." }
  }

  return {
    ok: items.every((item) => item.prep_status === "ready"),
    error: items.every((item) => item.prep_status === "ready") ? undefined : "Debes marcar todos los items como listos antes de finalizar la orden.",
  }
}

export async function getAdminOrderDetail(
  supabase: SupabaseClient,
  tenantId: string,
  orderId: string
): Promise<AdminOrderDetail | null> {
  const orderResult = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, channel, fulfillment_type, customer_name, customer_phone, customer_email, subtotal_amount, total_amount, placed_at, notes, branches(name), payments(payment_method, receipt_image_path)")
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .limit(1)
    .maybeSingle<AdminOrderDetailRow>()

  if (orderResult.error || !orderResult.data) {
    return null
  }

  const itemsResult = await supabase
    .from("order_items")
    .select("id, order_id, product_name_snapshot, variant_name_snapshot, category_name_snapshot, quantity, unit_price_snapshot, line_total, notes")
    .eq("order_id", orderId)
    .returns<AdminOrderDetailItemRow[]>()

  if (itemsResult.error) {
    return null
  }

  return {
    id: orderResult.data.id,
    orderNumber: orderResult.data.order_number,
    status: orderResult.data.status,
    paymentStatus: orderResult.data.payment_status,
    paymentMethod: orderResult.data.payments?.[0]?.payment_method ?? null,
    paymentReceiptImageUrl: orderResult.data.payments?.[0]?.receipt_image_path ?? null,
    channel: orderResult.data.channel,
    fulfillmentType: orderResult.data.fulfillment_type,
    customerName: orderResult.data.customer_name,
    customerPhone: orderResult.data.customer_phone,
    customerEmail: orderResult.data.customer_email,
    branchName: orderResult.data.branches?.name ?? "Sucursal",
    subtotalAmount: Number(orderResult.data.subtotal_amount),
    totalAmount: Number(orderResult.data.total_amount),
    placedAt: orderResult.data.placed_at,
    notes: orderResult.data.notes,
    items: (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      productName: formatOrderItemProductName(item.product_name_snapshot, item.variant_name_snapshot),
      categoryName: item.category_name_snapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price_snapshot),
      lineTotal: Number(item.line_total),
      notes: item.notes,
    })),
  }
}

export async function getCustomerOrderDetail(
  supabase: SupabaseClient,
  tenantSlug: string,
  customerId: string,
  orderId: string
): Promise<CustomerOrderDetail | null> {
  const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    return null
  }

  const orderResult = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, fulfillment_type, total_amount, subtotal_amount, placed_at, customer_name, customer_phone, customer_email, notes")
    .eq("tenant_id", tenantResult.data.id)
    .eq("customer_id", customerId)
    .eq("id", orderId)
    .limit(1)
    .maybeSingle<CustomerOrderDetailRow>()

  if (orderResult.error || !orderResult.data) {
    return null
  }

  const orderItemsResult = await supabase
    .from("order_items")
    .select("id, order_id, product_name_snapshot, variant_name_snapshot, category_name_snapshot, quantity, unit_price_snapshot, line_total")
    .eq("order_id", orderResult.data.id)
    .returns<CustomerOrderDetailItemRow[]>()

  if (orderItemsResult.error) {
    return null
  }

  const paymentResult = await supabase
    .from("payments")
    .select("payment_method, receipt_image_path")
    .eq("order_id", orderResult.data.id)
    .limit(1)
    .maybeSingle<PaymentReceiptRow>()

  if (paymentResult.error) {
    return null
  }

  return {
    id: orderResult.data.id,
    orderNumber: orderResult.data.order_number,
    status: orderResult.data.status,
    paymentStatus: orderResult.data.payment_status,
    paymentMethod: paymentResult.data?.payment_method ?? null,
    paymentReceiptImageUrl: paymentResult.data?.receipt_image_path ?? null,
    fulfillmentType: orderResult.data.fulfillment_type,
    totalAmount: Number(orderResult.data.total_amount),
    subtotalAmount: Number(orderResult.data.subtotal_amount),
    placedAt: orderResult.data.placed_at,
    customerName: orderResult.data.customer_name,
    customerPhone: orderResult.data.customer_phone,
    customerEmail: orderResult.data.customer_email,
    notes: orderResult.data.notes,
    items: (orderItemsResult.data ?? []).map((item) => ({
      id: item.id,
      productName: formatOrderItemProductName(item.product_name_snapshot, item.variant_name_snapshot),
      categoryName: item.category_name_snapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price_snapshot),
      lineTotal: Number(item.line_total),
    })),
  }
}
