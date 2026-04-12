import type { SupabaseClient } from "@supabase/supabase-js"

import type { AdminOrderDetail, AdminOrderSummary, CreateOrderInput, CreateOrderResult, CustomerOrderDetail, CustomerOrderSummary, KitchenOrderSummary, OrderStatus, PaymentStatus } from "@/lib/domain/order"

type TenantRow = { id: string }
type BranchRow = { id: string; name: string }
type ProductRow = {
  id: string
  name: string
  base_price: number
  category_id: string | null
}
type CategoryRow = {
  id: string
  name: string
}
type OrderRow = {
  id: string
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
  category_name_snapshot: string | null
  quantity: number
  unit_price_snapshot: number
  line_total: number
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
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle<BranchRow>()

  if (branchResult.error || !branchResult.data) {
    return { ok: false, error: "No encontramos una sucursal activa para este pedido." }
  }

  const productIds = input.items.map((item) => item.id)
  const productsResult = await supabase
    .from("products")
    .select("id, name, base_price, category_id")
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

  const categoryIds = products.map((product) => product.category_id).filter((value): value is string => Boolean(value))
  const categoriesResult = categoryIds.length
    ? await supabase.from("categories").select("id, name").in("id", categoryIds).returns<CategoryRow[]>()
    : { data: [], error: null }

  if (categoriesResult.error) {
    return { ok: false, error: categoriesResult.error.message }
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const categoryMap = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))

  const orderItemsPayload = input.items.map((item) => {
    const product = productMap.get(item.id)

    if (!product) {
      throw new Error(`Product ${item.id} not found during checkout.`)
    }

    const unitPrice = Number(product.base_price)

    return {
      product_id: product.id,
      product_name_snapshot: product.name,
      category_name_snapshot: product.category_id ? categoryMap.get(product.category_id) ?? item.category : item.category,
      unit_price_snapshot: unitPrice,
      quantity: item.quantity,
      line_total: Number((unitPrice * item.quantity).toFixed(2)),
      notes: null,
    }
  })

  const subtotal = orderItemsPayload.reduce((total, item) => total + item.line_total, 0)

  const orderResult = await supabase
    .from("orders")
    .insert({
      tenant_id: tenantResult.data.id,
      branch_id: branchResult.data.id,
      customer_id: input.customerId ?? null,
      channel: "web",
      fulfillment_type: input.fulfillmentType,
      status: "pending_payment",
      payment_status: "pending",
      customer_name: input.customer.fullName.trim(),
      customer_phone: input.customer.phone.trim(),
      customer_email: input.customer.email.trim() || null,
      delivery_address_snapshot: input.fulfillmentType === "delivery" ? {} : null,
      subtotal_amount: subtotal,
      discount_amount: 0,
      delivery_fee: 0,
      tax_amount: 0,
      total_amount: subtotal,
      currency: "MXN",
      notes: input.customer.notes?.trim() || null,
    })
    .select("id, order_number")
    .single<OrderRow>()

  if (orderResult.error || !orderResult.data) {
    return { ok: false, error: orderResult.error?.message ?? "No pudimos crear la orden." }
  }

  const orderItemsInsertResult = await supabase.from("order_items").insert(
    orderItemsPayload.map((item) => ({
      ...item,
      order_id: orderResult.data.id,
    }))
  )

  if (orderItemsInsertResult.error) {
    return { ok: false, error: orderItemsInsertResult.error.message }
  }

  const orderStatusHistoryResult = await supabase.from("order_status_history").insert({
    order_id: orderResult.data.id,
    from_status: null,
    to_status: "pending_payment",
    changed_by_profile_id: null,
    source: "customer",
  })

  if (orderStatusHistoryResult.error) {
    return { ok: false, error: orderStatusHistoryResult.error.message }
  }

  return {
    ok: true,
    orderId: orderResult.data.id,
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
}

type AdminOrderDetailItemRow = {
  id: string
  order_id: string
  product_name_snapshot: string
  category_name_snapshot: string | null
  quantity: number
  unit_price_snapshot: number
  line_total: number
  notes: string | null
}

export async function getAdminOrders(supabase: SupabaseClient, tenantId: string): Promise<readonly AdminOrderSummary[]> {
  const ordersResult = await supabase
    .from("orders")
    .select("id, order_number, customer_name, status, payment_status, channel, total_amount, placed_at, branches(name)")
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
        .select("id, order_id, quantity, product_name_snapshot, prep_status")
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
    map.set(item.order_id, [...currentItems, { id: item.id, productName: item.product_name_snapshot, quantity: item.quantity, prepStatus: item.prep_status }])
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

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
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

  const updatePayload: {
    status: OrderStatus
    confirmed_at?: string | null
    completed_at?: string | null
    cancelled_at?: string | null
    payment_status?: "pending" | "paid" | "failed" | "refunded"
  } = {
    status: nextStatus,
  }

  if (nextStatus === "confirmed") {
    updatePayload.confirmed_at = new Date().toISOString()
    updatePayload.payment_status = "paid"
  }

  if (nextStatus === "completed") {
    updatePayload.completed_at = new Date().toISOString()
  }

  if (nextStatus === "cancelled") {
    updatePayload.cancelled_at = new Date().toISOString()
  }

  const updateResult = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("tenant_id", tenantId)
    .eq("id", orderId)

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  const historyResult = await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: currentStatus,
    to_status: nextStatus,
    changed_by_profile_id: changedByProfileId ?? null,
    source: "admin",
  })

  if (historyResult.error) {
    return { ok: false, error: historyResult.error.message }
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
  const updateResult = await supabase
    .from("order_items")
    .update({ prep_status: nextPrepStatus })
    .eq("id", orderItemId)
    .in(
      "order_id",
      (
        await supabase
          .from("orders")
          .select("id")
          .eq("tenant_id", tenantId)
          .returns<{ id: string }[]>()
      ).data?.map((order) => order.id) ?? []
    )

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}

export async function canKitchenMarkOrderReady(supabase: SupabaseClient, tenantId: string, orderId: string) {
  const itemsResult = await supabase
    .from("order_items")
    .select("prep_status, order_id")
    .eq("order_id", orderId)
    .returns<{ prep_status: "pending" | "ready"; order_id: string }[]>()

  if (itemsResult.error) {
    return { ok: false, error: itemsResult.error.message }
  }

  const items = itemsResult.data ?? []

  if (!items.length) {
    return { ok: false, error: "La orden no tiene items para preparar." }
  }

  const belongsToTenant = await supabase.from("orders").select("id").eq("tenant_id", tenantId).eq("id", orderId).limit(1).maybeSingle<{ id: string }>()

  if (belongsToTenant.error || !belongsToTenant.data) {
    return { ok: false, error: "La orden no pertenece a este tenant." }
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
    .select("id, order_number, status, payment_status, channel, fulfillment_type, customer_name, customer_phone, customer_email, subtotal_amount, total_amount, placed_at, notes, branches(name)")
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .limit(1)
    .maybeSingle<AdminOrderDetailRow>()

  if (orderResult.error || !orderResult.data) {
    return null
  }

  const itemsResult = await supabase
    .from("order_items")
    .select("id, order_id, product_name_snapshot, category_name_snapshot, quantity, unit_price_snapshot, line_total, notes")
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
      productName: item.product_name_snapshot,
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
    .select("id, order_number, status, fulfillment_type, total_amount, subtotal_amount, placed_at, customer_name, customer_phone, customer_email, notes")
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
    .select("id, order_id, product_name_snapshot, category_name_snapshot, quantity, unit_price_snapshot, line_total")
    .eq("order_id", orderResult.data.id)
    .returns<CustomerOrderDetailItemRow[]>()

  if (orderItemsResult.error) {
    return null
  }

  return {
    id: orderResult.data.id,
    orderNumber: orderResult.data.order_number,
    status: orderResult.data.status,
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
      productName: item.product_name_snapshot,
      categoryName: item.category_name_snapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price_snapshot),
      lineTotal: Number(item.line_total),
    })),
  }
}
